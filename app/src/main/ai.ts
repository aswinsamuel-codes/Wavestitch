// AI manager: owns the CLAP worker, the in-memory vector index and the background embedding queue.
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Worker } from 'node:worker_threads'
import createAiWorker from './ai.worker?nodeWorker'
import type { AiStatus } from '@shared/types'
import type { LibraryDb } from './db'
import { AUDIO_EXTS, RIFF_EXTS } from './audio/metadata'

/** Every supported format can be analysed: WAV/AIFF are read directly, others are decoded by the hidden decoder page. */
const AI_EXTS = [...AUDIO_EXTS]
export type CompressedDecoder = (soundId: number) => Promise<Float32Array[] | null>

const MODEL_KEY = 'Xenova/clap-htsat-unfused@q8'
const DIMS = 512
const EXPECTED_DOWNLOAD_MB = 155

export class AiEngine extends EventEmitter {
  private worker: Worker | null = null
  private reqId = 0
  private waiting = new Map<number, { resolve: (v: Float32Array | null) => void; reject: (e: Error) => void }>()
  private ids = new Int32Array(0)
  private matrix = new Float32Array(0)
  private count = 0
  private textCache = new Map<string, Float32Array>()
  private embedding = false
  /** Set while heavy work (stem splitting) runs; background analysis waits until it is cleared. */
  paused = false
  private downloadBytes = new Map<string, { loaded: number; total: number }>()
  status: AiStatus = { state: 'not-installed', embedded: 0, pending: 0, downloadMb: EXPECTED_DOWNLOAD_MB }

  constructor(
    private db: LibraryDb,
    private modelsDir: string,
    private decodeCompressed: CompressedDecoder
  ) {
    super()
  }

  get modelInstalled(): boolean {
    return existsSync(join(this.modelsDir, 'Xenova', 'clap-htsat-unfused', 'onnx', 'audio_model_quantized.onnx'))
  }

  private setStatus(p: Partial<AiStatus>): void {
    this.status = { ...this.status, ...p }
    this.emit('status', { ...this.status })
  }

  refreshCounts(): void {
    this.setStatus({ embedded: this.count, pending: this.db.countPendingEmbeddings(AI_EXTS) })
  }

  /** Start the model if it is already on disk (never downloads). */
  async startIfInstalled(): Promise<void> {
    this.loadIndex()
    this.refreshCounts()
    if (this.modelInstalled) await this.start(false)
  }

  /** Called when the user explicitly agrees to download the model. */
  async install(): Promise<AiStatus> {
    if (this.status.state === 'ready' || this.status.state === 'downloading' || this.status.state === 'loading') return this.status
    await this.start(true)
    return this.status
  }

  private start(allowDownload: boolean): Promise<void> {
    this.setStatus({ state: allowDownload && !this.modelInstalled ? 'downloading' : 'loading', message: undefined })
    this.worker?.terminate()
    const w = createAiWorker({})
    this.worker = w
    return new Promise((resolve) => {
      w.on('message', (m: { type: string; reqId?: number; vec?: Float32Array | null; error?: string; file?: string; loaded?: number; total?: number }) => {
        if (m.type === 'progress' && m.file) {
          this.downloadBytes.set(m.file, { loaded: m.loaded ?? 0, total: m.total ?? 0 })
          let loaded = 0
          for (const v of this.downloadBytes.values()) loaded += v.loaded
          if (this.status.state === 'downloading')
            this.setStatus({ message: `Downloading AI model… ${Math.round(loaded / 1048576)} / ~${EXPECTED_DOWNLOAD_MB} MB` })
        } else if (m.type === 'ready') {
          console.log('ai: CLAP model ready')
          this.setStatus({ state: 'ready', message: undefined })
          resolve()
          void this.processQueue()
        } else if (m.type === 'initError') {
          console.error('ai: model failed to start:', m.error)
          this.setStatus({ state: 'error', message: m.error })
          resolve()
        } else if (m.type === 'result' && m.reqId !== undefined) {
          const p = this.waiting.get(m.reqId)
          this.waiting.delete(m.reqId)
          if (m.error) p?.reject(new Error(m.error))
          else p?.resolve(m.vec ?? null)
        }
      })
      w.on('error', (e) => {
        this.setStatus({ state: 'error', message: String(e) })
        resolve()
      })
      w.postMessage({ type: 'init', modelsDir: this.modelsDir, allowDownload })
    })
  }

  private call(msg: object): Promise<Float32Array | null> {
    if (!this.worker || this.status.state !== 'ready') return Promise.resolve(null)
    const reqId = ++this.reqId
    return new Promise((resolve, reject) => {
      this.waiting.set(reqId, { resolve, reject })
      this.worker!.postMessage({ ...msg, reqId })
    })
  }

  // ---- vector index (brute force cosine: fast enough for ~100k sounds on CPU)
  private loadIndex(): void {
    const rows = this.db.allEmbeddings(MODEL_KEY)
    this.ensureCapacity(rows.length + 1024)
    this.count = 0
    for (const r of rows) {
      const v = new Float32Array(r.vec.buffer, r.vec.byteOffset, r.vec.byteLength / 4)
      if (v.length === DIMS) this.append(r.sound_id, v)
    }
  }
  private ensureCapacity(n: number): void {
    if (this.ids.length >= n) return
    const cap = Math.max(n, this.ids.length * 2, 1024)
    const ids = new Int32Array(cap)
    ids.set(this.ids.subarray(0, this.count))
    const m = new Float32Array(cap * DIMS)
    m.set(this.matrix.subarray(0, this.count * DIMS))
    this.ids = ids
    this.matrix = m
  }
  private append(id: number, v: Float32Array): void {
    this.ensureCapacity(this.count + 1)
    this.ids[this.count] = id
    this.matrix.set(v, this.count * DIMS)
    this.count++
  }
  removeIds(removed: Set<number>): void {
    let w = 0
    for (let r = 0; r < this.count; r++) {
      if (removed.has(this.ids[r])) continue
      if (w !== r) {
        this.ids[w] = this.ids[r]
        this.matrix.copyWithin(w * DIMS, r * DIMS, (r + 1) * DIMS)
      }
      w++
    }
    this.count = w
  }
  /** Drop vectors whose sounds no longer exist in the database. */
  syncWithDb(): void {
    if (!this.count) return
    const present = this.db.getSoundsByIds(Array.from(this.ids.subarray(0, this.count)))
    const gone = new Set<number>()
    for (let i = 0; i < this.count; i++) if (!present.has(this.ids[i]) || !present.get(this.ids[i])!.hasEmbedding) gone.add(this.ids[i])
    if (gone.size) this.removeIds(gone)
  }

  vectorFor(id: number): Float32Array | null {
    for (let i = 0; i < this.count; i++)
      if (this.ids[i] === id) return this.matrix.slice(i * DIMS, (i + 1) * DIMS)
    return null
  }

  nearest(q: Float32Array, k: number, allowed: Set<number> | null, exclude?: number): Array<{ id: number; score: number }> {
    const top: Array<{ id: number; score: number }> = []
    let minScore = -Infinity
    for (let i = 0; i < this.count; i++) {
      const id = this.ids[i]
      if (id === exclude || (allowed && !allowed.has(id))) continue
      let s = 0
      const off = i * DIMS
      for (let d = 0; d < DIMS; d++) s += this.matrix[off + d] * q[d]
      if (top.length < k) {
        top.push({ id, score: s })
        if (top.length === k) {
          top.sort((a, b) => b.score - a.score)
          minScore = top[k - 1].score
        }
      } else if (s > minScore) {
        top[k - 1] = { id, score: s }
        top.sort((a, b) => b.score - a.score)
        minScore = top[k - 1].score
      }
    }
    return top.sort((a, b) => b.score - a.score)
  }

  async embedText(text: string): Promise<Float32Array | null> {
    const key = text.trim().toLowerCase()
    const hit = this.textCache.get(key)
    if (hit) return hit
    const v = await this.call({ type: 'embedText', text: key })
    if (v) {
      this.textCache.set(key, v)
      if (this.textCache.size > 500) this.textCache.delete(this.textCache.keys().next().value!)
    }
    return v
  }

  get ready(): boolean {
    return this.status.state === 'ready'
  }

  // ---- background embedding of the library
  async processQueue(): Promise<void> {
    if (this.embedding || !this.ready) return
    this.embedding = true
    try {
      for (;;) {
        const batch = this.db.pendingEmbeddingIds(AI_EXTS, 50)
        if (!batch.length) break
        for (const { id } of batch) {
          while (this.paused) await new Promise((r) => setTimeout(r, 1000))
          const d = this.db.getDetail(id)
          if (!d) continue
          try {
            let vec: Float32Array | null
            if (RIFF_EXTS.includes(d.ext)) vec = await this.call({ type: 'embedAudio', path: d.path })
            else {
              const windows = await this.decodeCompressed(id)
              vec = windows?.length ? await this.call({ type: 'embedWindows', windows }) : null
            }
            if (vec && vec.length === DIMS) {
              this.db.saveEmbedding(id, MODEL_KEY, vec)
              this.append(id, vec)
            } else this.db.markAiFailed(id)
          } catch {
            this.db.markAiFailed(id)
          }
          if (this.count % 10 === 0) this.refreshCounts()
        }
        this.refreshCounts()
      }
    } finally {
      this.embedding = false
      this.refreshCounts()
    }
  }

  dispose(): void {
    void this.worker?.terminate()
  }
}
