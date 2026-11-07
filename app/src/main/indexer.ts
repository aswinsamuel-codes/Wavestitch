// Walks library folders, keeps the database in sync with files on disk, and watches for changes.
import { existsSync, watch, type FSWatcher } from 'node:fs'
import { opendir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { EventEmitter } from 'node:events'
import type { IndexStatus } from '@shared/types'
import type { LibraryDb, SoundUpsert } from './db'
import { AUDIO_EXTS, extractMetadata } from './audio/metadata'

const SKIP_DIRS = new Set(['$recycle.bin', 'system volume information', '.trash', '.trashes', '.spotlight-v100', 'node_modules', '.git'])

export class Indexer extends EventEmitter {
  private queue: number[] = []
  private running = false
  private watchers = new Map<number, FSWatcher>()
  private rescanTimers = new Map<number, NodeJS.Timeout>()
  status: IndexStatus = { running: false, phase: 'idle', scanned: 0, added: 0, failed: 0, totalSounds: 0 }

  constructor(private db: LibraryDb) {
    super()
    this.status.totalSounds = db.countSounds()
  }

  private emitStatus(): void {
    this.emit('status', { ...this.status })
  }

  /** Check which roots are reachable (external drives may be unplugged), then scan + watch them. */
  startAll(): void {
    for (const r of this.db.listRoots()) {
      const online = existsSync(r.path)
      this.db.setRootOnline(r.id, online)
      if (online) {
        this.enqueue(r.id)
        this.watchRoot(r.id, r.path)
      }
    }
    this.emit('library')
  }

  enqueue(rootId: number): void {
    if (!this.queue.includes(rootId)) this.queue.push(rootId)
    void this.run()
  }

  watchRoot(rootId: number, path: string): void {
    if (this.watchers.has(rootId)) return
    try {
      const w = watch(path, { recursive: true }, (_evt, file) => {
        if (file && !AUDIO_EXTS.has(extname(String(file)).slice(1).toLowerCase())) return
        clearTimeout(this.rescanTimers.get(rootId))
        this.rescanTimers.set(rootId, setTimeout(() => this.enqueue(rootId), 2000))
      })
      w.on('error', () => this.unwatch(rootId))
      this.watchers.set(rootId, w)
    } catch {
      /* watching is best-effort */
    }
  }

  unwatch(rootId: number): void {
    this.watchers.get(rootId)?.close()
    this.watchers.delete(rootId)
  }

  private async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      while (this.queue.length) {
        const rootId = this.queue.shift()!
        await this.scanRoot(rootId)
      }
    } finally {
      this.running = false
      this.status = { ...this.status, running: false, phase: 'idle', current: undefined, totalSounds: this.db.countSounds() }
      this.emitStatus()
      this.emit('done')
    }
  }

  private async scanRoot(rootId: number): Promise<void> {
    const root = this.db.getRoot(rootId)
    if (!root) return
    if (!existsSync(root.path)) {
      this.db.setRootOnline(rootId, false)
      this.emit('library')
      return
    }
    this.db.setRootOnline(rootId, true)
    this.status = { running: true, phase: 'scanning', scanned: 0, added: 0, failed: 0, current: root.label, totalSounds: this.db.countSounds() }
    this.emitStatus()

    const known = this.db.existingStamps(rootId)
    const seen = new Set<string>()
    let batch: SoundUpsert[] = []
    let lastEmit = Date.now()
    const flush = (): void => {
      if (!batch.length) return
      const b = batch
      batch = []
      this.db.transaction(() => b.forEach((s) => this.db.upsertSound(s)))
    }

    const pending: Promise<void>[] = []
    const work = async (abs: string, rel: string): Promise<void> => {
      try {
        const st = await stat(abs)
        const prev = known.get(rel)
        if (prev && prev.size === st.size && prev.mtime === Math.round(st.mtimeMs)) return
        batch.push(await extractMetadata(abs, rootId, rel, st.size, Math.round(st.mtimeMs)))
        this.status.added++
        if (batch.length >= 200) flush()
      } catch {
        this.status.failed++
      }
    }

    const walk = async (dir: string, rel: string): Promise<void> => {
      let handle
      try {
        handle = await opendir(dir)
      } catch {
        return
      }
      for await (const ent of handle) {
        if (ent.name.startsWith('._')) continue // macOS resource-fork files on external drives
        const abs = join(dir, ent.name)
        const r = rel ? `${rel}/${ent.name}` : ent.name
        if (ent.isDirectory()) {
          if (!SKIP_DIRS.has(ent.name.toLowerCase()) && !ent.name.startsWith('.')) await walk(abs, r)
        } else if (ent.isFile() && AUDIO_EXTS.has(extname(ent.name).slice(1).toLowerCase())) {
          seen.add(r)
          this.status.scanned++
          pending.push(work(abs, r))
          if (pending.length >= 8) await Promise.all(pending.splice(0))
          if (Date.now() - lastEmit > 250) {
            lastEmit = Date.now()
            this.status.current = r
            this.emitStatus()
          }
        }
      }
    }

    await walk(root.path, '')
    await Promise.all(pending)
    flush()
    const removed = [...known.entries()].filter(([rel]) => !seen.has(rel)).map(([, v]) => v.id)
    if (removed.length) this.db.transaction(() => this.db.deleteSounds(removed))
    this.status.totalSounds = this.db.countSounds()
    this.emitStatus()
    this.emit('library')
  }

  dispose(): void {
    for (const id of [...this.watchers.keys()]) this.unwatch(id)
  }
}
