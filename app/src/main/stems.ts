// Stem splitter: downloads the HT-Demucs ONNX model (only when the user clicks Install),
// queues split jobs, decodes input via the hidden decoder page, and runs separation in a worker.
import { EventEmitter } from 'node:events'
import { createHash } from 'node:crypto'
import {
  closeSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  renameSync,
  rmSync,
  statSync,
  writeSync
} from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { constants as osConstants, setPriority } from 'node:os'
import { net, utilityProcess, type UtilityProcess } from 'electron'
import stemsWorkerPath from './stems.worker?modulePath'
import type { StemFile, StemStatus } from '@shared/types'
import type { LibraryDb } from './db'
import { APP_NAME } from '@shared/brand'

const MODEL_URL = 'https://huggingface.co/StemSplitio/htdemucs-onnx/resolve/main/htdemucs_fp16weights.onnx'
// SHA-256 published for the byte-identical mirror (Best-Practice/htdemucs-onnx, of StemSplitio commit d54ed9eb).
const MODEL_SHA256 = 'd05c269d0178d2a72ad484b10b11dd370193fc923201c3b27a99f848745db70a'
const MODEL_MB = 166
const STEM_NAMES = ['Drums', 'Bass', 'Other', 'Vocals'] as const // model output order
const DISPLAY_ORDER = [3, 0, 1, 2] // Vocals, Drums, Bass, Other

export type StereoDecoder = (soundId: number) => Promise<{ left: Float32Array; right: Float32Array } | null>

function safeName(s: string): string {
  return s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'track'
}

export class StemEngine extends EventEmitter {
  private worker: UtilityProcess | null = null

  /** Separate OS process at below-normal priority, so splitting never starves playback or the UI. */
  private ensureWorker(): UtilityProcess {
    if (this.worker) return this.worker
    const w = utilityProcess.fork(stemsWorkerPath, [], { serviceName: `${APP_NAME} stem splitter` })
    w.once('spawn', () => {
      try {
        if (w.pid) setPriority(w.pid, osConstants.priority.PRIORITY_BELOW_NORMAL)
        console.log(`stems: worker process ${w.pid} started at below-normal priority`)
      } catch (e) {
        console.warn('stems: could not lower worker priority', e)
      }
    })
    w.once('exit', (code) => {
      console.warn(`stems: worker process exited (${code})`)
      if (this.worker === w) this.worker = null
    })
    this.worker = w
    return w
  }
  private queue: number[] = []
  private busy = false
  status: StemStatus = { state: 'not-installed', downloadMb: MODEL_MB, queue: [] }

  constructor(
    private db: LibraryDb,
    private modelDir: string,
    readonly stemsDir: string,
    private decodeStereo: StereoDecoder
  ) {
    super()
    if (this.installed) this.status.state = 'ready'
  }

  get modelPath(): string {
    return join(this.modelDir, 'htdemucs_fp16weights.onnx')
  }
  get installed(): boolean {
    return existsSync(this.modelPath)
  }

  private set(p: Partial<StemStatus>): void {
    this.status = { ...this.status, ...p, queue: [...this.queue] }
    this.emit('status', { ...this.status })
  }

  /** Download the model (user-initiated). Verifies the SHA-256 before use. */
  async install(): Promise<StemStatus> {
    if (this.installed || this.status.state === 'downloading') return this.status
    mkdirSync(this.modelDir, { recursive: true })
    const part = this.modelPath + '.part'
    this.set({ state: 'downloading', message: 'Starting download…' })
    try {
      const res = await net.fetch(MODEL_URL)
      if (!res.ok || !res.body) throw new Error(`download failed (HTTP ${res.status})`)
      const total = Number(res.headers.get('content-length') ?? MODEL_MB * 1048576)
      const out = createWriteStream(part)
      const hash = createHash('sha256')
      const reader = res.body.getReader()
      let got = 0
      let last = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        hash.update(value)
        if (!out.write(value)) await new Promise<void>((r) => out.once('drain', () => r()))
        got += value.length
        if (Date.now() - last > 300) {
          last = Date.now()
          this.set({ message: `Downloading stem model… ${Math.round(got / 1048576)} / ${Math.round(total / 1048576)} MB` })
        }
      }
      await new Promise<void>((r, j) => out.end((e?: Error | null) => (e ? j(e) : r())))
      const digest = hash.digest('hex')
      if (digest !== MODEL_SHA256) {
        rmSync(part, { force: true })
        throw new Error('downloaded file failed the integrity check')
      }
      renameSync(part, this.modelPath)
      this.set({ state: 'ready', message: undefined })
    } catch (e) {
      rmSync(part, { force: true })
      this.set({ state: 'error', message: String((e as Error)?.message ?? e) })
    }
    return this.status
  }

  /** Verify an already-present model file (used by the self-test). */
  async verify(): Promise<boolean> {
    if (!this.installed) return false
    const hash = createHash('sha256')
    await new Promise<void>((r, j) => createReadStream(this.modelPath).on('data', (d) => hash.update(d)).on('end', () => r()).on('error', j))
    return hash.digest('hex') === MODEL_SHA256
  }

  /** Stem files already created for a sound (if they still exist on disk). */
  getStems(soundId: number): StemFile[] | null {
    const raw = this.db.getSetting(`stems:${soundId}`)
    if (!raw) return null
    try {
      const files = JSON.parse(raw) as StemFile[]
      return files.every((f) => existsSync(f.path)) ? files : null
    } catch {
      return null
    }
  }

  /** Only stem files inside our stems folder may be dragged out. */
  isStemPath(p: string): boolean {
    const rel = relative(resolve(this.stemsDir), resolve(p))
    return !!rel && !rel.startsWith('..') && !rel.includes(':')
  }

  split(soundId: number): StemStatus {
    if (this.status.state !== 'ready' && this.status.state !== 'splitting') return this.status
    if (!this.queue.includes(soundId) && this.status.job?.soundId !== soundId) this.queue.push(soundId)
    this.set({})
    void this.run()
    return this.status
  }

  private async run(): Promise<void> {
    if (this.busy) return
    this.busy = true
    try {
      while (this.queue.length) {
        const id = this.queue.shift()!
        await this.splitOne(id)
      }
    } finally {
      this.busy = false
      this.set({ state: this.installed ? 'ready' : 'not-installed', job: undefined })
    }
  }

  private async splitOne(soundId: number): Promise<void> {
    const d = this.db.getDetail(soundId)
    if (!d) return
    const base = safeName(d.filename.replace(/\.[^.]+$/, ''))
    this.set({ state: 'splitting', job: { soundId, name: d.filename, progress: 0, phase: 'decoding' }, message: undefined })
    const workDir = join(this.stemsDir, '.work') // hidden folder: never indexed
    const pcmPath = join(workDir, `${soundId}.f32`)
    try {
      let pcm = await this.decodeStereo(soundId)
      if (!pcm) throw new Error('could not decode this file')
      // Hand the audio to the splitter through a temp file (it reads one chunk at a time), so the
      // whole song is not held in memory by several processes at once.
      mkdirSync(workDir, { recursive: true })
      const frames = pcm.left.length
      const seconds = Math.round(frames / 44100)
      const fd = openSync(pcmPath, 'w')
      try {
        writeSync(fd, new Uint8Array(pcm.left.buffer, pcm.left.byteOffset, pcm.left.byteLength))
        writeSync(fd, new Uint8Array(pcm.right.buffer, pcm.right.byteOffset, pcm.right.byteLength))
      } finally {
        closeSync(fd)
      }
      pcm = null
      const dir = join(this.stemsDir, base)
      mkdirSync(dir, { recursive: true })
      const outPaths = STEM_NAMES.map((n) => join(dir, `${base} - ${n}.wav`))
      const descriptions = STEM_NAMES.map((n) => `${n} stem of "${d.filename}" (separated by ${APP_NAME}, HT-Demucs)`)
      this.set({ job: { soundId, name: d.filename, progress: 0, phase: 'separating' } })
      const t0 = Date.now()
      console.log(`stems: splitting "${d.filename}" (${seconds} s of audio)`)
      await new Promise<void>((resolveJob, reject) => {
        const w = this.ensureWorker()
        const onExit = (code: number): void => {
          w.off('message', onMsg)
          reject(new Error(`stem process stopped unexpectedly (code ${code})`))
        }
        w.once('exit', onExit)
        const onMsg = (m: { type: string; reqId: number; done?: number; total?: number; etaSec?: number; error?: string }): void => {
          if (m.reqId !== soundId) return
          if (m.type === 'done' || m.type === 'error') w.off('exit', onExit)
          if (m.type === 'progress') {
            this.set({ job: { soundId, name: d.filename, progress: (m.done ?? 0) / (m.total ?? 1), phase: 'separating', etaSec: m.etaSec } })
          } else if (m.type === 'done') {
            w.off('message', onMsg)
            resolveJob()
          } else if (m.type === 'error') {
            w.off('message', onMsg)
            reject(new Error(m.error))
          }
        }
        w.on('message', onMsg)
        w.postMessage({ type: 'split', reqId: soundId, modelPath: this.modelPath, pcmPath, frames, outPaths, descriptions })
      })
      console.log(`stems: finished "${d.filename}" in ${Math.round((Date.now() - t0) / 1000)} s`)
      const files: StemFile[] = DISPLAY_ORDER.map((i) => ({
        stem: STEM_NAMES[i],
        path: outPaths[i],
        sizeBytes: statSync(outPaths[i]).size
      }))
      this.db.setSetting(`stems:${soundId}`, JSON.stringify(files))
      this.set({ lastDone: { soundId, seconds: Math.round((Date.now() - t0) / 1000) } })
      this.emit('done', soundId, files)
    } catch (e) {
      console.error(`stems: failed for "${d.filename}":`, e)
      this.set({ message: `Stem split failed for ${d.filename}: ${String((e as Error)?.message ?? e)}` })
    } finally {
      rmSync(pcmPath, { force: true })
    }
  }

  dispose(): void {
    this.worker?.kill()
  }
}
