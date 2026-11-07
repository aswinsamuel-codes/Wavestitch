// AUDIO OS desktop: main process entry.
import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell, type IpcMainInvokeEvent } from 'electron'
import { mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { Worker } from 'node:worker_threads'
import createPeaksWorker from './peaks.worker?nodeWorker'
import type { PeaksResult, SearchQuery } from '@shared/types'
import { LibraryDb } from './db'
import { Indexer } from './indexer'
import { AiEngine } from './ai'
import { StemEngine } from './stems'
import { search } from './search'
import { handleMediaProtocol, registerMediaScheme } from './media'
import { RIFF_EXTS } from './audio/metadata'
import { captureConsole, initLog } from './log'
import { APP_NAME } from '@shared/brand'

// During development keep all app data next to the project (on the D: drive), not in the user profile.
if (process.env.AOS_DATA_DIR) app.setPath('userData', process.env.AOS_DATA_DIR)
else if (!app.isPackaged) app.setPath('userData', join(app.getAppPath(), '.dev-data'))
registerMediaScheme()

// Only one copy of AUDIO OS may use the same library database at a time.
const isPrimary = app.requestSingleInstanceLock()
if (!isPrimary) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

let win: BrowserWindow | null = null
let db: LibraryDb
let indexer: Indexer
let ai: AiEngine
let stems: StemEngine
let peaksWorker: Worker | null = null
const peaksWaiting = new Map<number, (r: PeaksResult) => void>()
const peaksCache = new Map<number, PeaksResult>()
let peaksReq = 0

function send(channel: string, payload?: unknown): void {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
}

function dragIcon(): Electron.NativeImage {
  const size = 32
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const bar = x % 6 < 3 && Math.abs(y - 16) < 4 + ((x * 7) % 11)
      buf[i] = bar ? 0x3c : 0x2a // B
      buf[i + 1] = bar ? 0xc8 : 0x2a // G
      buf[i + 2] = bar ? 0xf5 : 0x2a // R
      buf[i + 3] = bar ? 0xff : 0xc0 // A
    }
  return nativeImage.createFromBitmap(buf, { width: size, height: size })
}

function getPeaks(id: number): Promise<PeaksResult> {
  const cached = peaksCache.get(id)
  if (cached) return Promise.resolve(cached)
  const d = db.getDetail(id)
  if (!d) return Promise.resolve({ peaks: null, durationSec: null, decodeInBrowser: false })
  if (!RIFF_EXTS.includes(d.ext)) return Promise.resolve({ peaks: null, durationSec: null, decodeInBrowser: true })
  if (!peaksWorker) {
    peaksWorker = createPeaksWorker({})
    peaksWorker.on('message', (m: { reqId: number; peaks: number[] | null; durationSec: number | null; error?: string }) => {
      const cb = peaksWaiting.get(m.reqId)
      peaksWaiting.delete(m.reqId)
      cb?.(
        m.peaks
          ? { peaks: [m.peaks], durationSec: m.durationSec, decodeInBrowser: false }
          : { peaks: null, durationSec: null, decodeInBrowser: true }
      )
    })
  }
  const reqId = ++peaksReq
  return new Promise((resolve) => {
    peaksWaiting.set(reqId, (r) => {
      peaksCache.set(id, r)
      if (peaksCache.size > 300) peaksCache.delete(peaksCache.keys().next().value!)
      resolve(r)
    })
    peaksWorker!.postMessage({ reqId, path: d.path, buckets: 2000 })
  })
}

// ---- hidden decoder page for compressed formats (MP3/FLAC/OGG/M4A → 48 kHz mono windows)
let decoderWin: BrowserWindow | null = null
let decoderReady: Promise<void> | null = null
let decodeReq = 0
type DecodeResult = { windows?: Float32Array[]; left?: Float32Array; right?: Float32Array; error?: string }
const decodeWaiting = new Map<number, (r: DecodeResult | null) => void>()

function ensureDecoder(): Promise<void> {
  if (decoderWin && !decoderWin.isDestroyed() && decoderReady) return decoderReady
  decoderWin = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false
    }
  })
  captureConsole('decoder', decoderWin.webContents)
  decoderWin.on('closed', () => {
    decoderWin = null
    decoderReady = null
    for (const cb of decodeWaiting.values()) cb(null)
    decodeWaiting.clear()
  })
  decoderReady = process.env['ELECTRON_RENDERER_URL']
    ? decoderWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/decoder.html`)
    : decoderWin.loadFile(join(__dirname, '../renderer/decoder.html'))
  return decoderReady
}

async function decoderRequest(soundId: number, kind: 'windows' | 'stereo44k'): Promise<DecodeResult | null> {
  await ensureDecoder()
  const reqId = ++decodeReq
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      decodeWaiting.delete(reqId)
      resolve(null)
    }, 300_000)
    decodeWaiting.set(reqId, (r) => {
      clearTimeout(timer)
      resolve(r)
    })
    decoderWin!.webContents.send('decode:request', { reqId, id: soundId, kind })
  })
}

async function decodeCompressed(soundId: number): Promise<Float32Array[] | null> {
  return (await decoderRequest(soundId, 'windows'))?.windows ?? null
}

async function decodeStereo(soundId: number): Promise<{ left: Float32Array; right: Float32Array } | null> {
  const r = await decoderRequest(soundId, 'stereo44k')
  // Free the decoder page's copy of the whole song right away (it is recreated on demand).
  decoderWin?.destroy()
  if (r?.error) throw new Error(r.error)
  return r?.left && r.right ? { left: r.left, right: r.right } : null
}

function createWindow(): void {
  const isMac = process.platform === 'darwin'
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#1b1b1d',
    title: APP_NAME,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac ? { trafficLightPosition: { x: 14, y: 16 } } : { titleBarOverlay: { color: '#262628', symbolColor: '#c8c8cc', height: 48 } }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  win.once('ready-to-show', () => win?.show())
  captureConsole('ui', win.webContents)
  // The hidden decoder window must not keep the app alive once the main window is closed.
  win.on('closed', () => {
    win = null
    decoderWin?.destroy()
  })
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  if (process.env['ELECTRON_RENDERER_URL']) void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

function registerIpc(): void {
  const h = (ch: string, fn: (e: IpcMainInvokeEvent, ...a: never[]) => unknown): void => {
    ipcMain.handle(ch, fn as never)
  }
  h('app:info', () => ({ version: app.getVersion(), platform: process.platform, dataDir: app.getPath('userData'), stemsDir: stems.stemsDir }))
  h('roots:list', () => db.listRoots())
  h('roots:add', async () => {
    const r = await dialog.showOpenDialog(win!, {
      title: 'Add sound folders',
      properties: ['openDirectory', 'multiSelections']
    })
    for (const p of r.filePaths) {
      const id = db.addRoot(p, basename(p) || p)
      indexer.watchRoot(id, p)
      indexer.enqueue(id)
    }
    send('library:changed')
    return db.listRoots()
  })
  h('roots:remove', (_e, id: number) => {
    indexer.unwatch(id)
    db.removeRoot(id)
    ai.syncWithDb()
    ai.refreshCounts()
    send('library:changed')
  })
  h('roots:rescan', (_e, id?: number) => {
    if (id) indexer.enqueue(id)
    else indexer.startAll()
  })
  h('search', (_e, q: SearchQuery) => search(db, ai, q))
  h('sound:get', (_e, id: number) => db.getDetail(id))
  h('sound:peaks', (_e, id: number) => getPeaks(id))
  h('sound:favorite', (_e, id: number, fav: boolean) => db.setFavorite(id, fav))
  h('index:status', () => indexer.status)
  h('ai:status', () => ai.status)
  h('ai:install', () => ai.install())
  ipcMain.on('sound:reveal', (_e, id: number) => {
    const d = db.getDetail(id)
    if (d) shell.showItemInFolder(d.path)
  })
  ipcMain.on('decode:result', (e, res: { reqId: number } & DecodeResult) => {
    if (e.sender !== decoderWin?.webContents) return
    const cb = decodeWaiting.get(res.reqId)
    decodeWaiting.delete(res.reqId)
    cb?.(res)
  })
  h('stems:status', () => stems.status)
  h('stems:install', () => stems.install())
  h('stems:split', (_e, id: number) => stems.split(id))
  h('stems:get', (_e, id: number) => stems.getStems(id)?.map((f) => ({ ...f, soundId: db.findSoundIdByPath(f.path) })) ?? null)
  ipcMain.on('stems:drag', (e, id: number, stem: string | null) => {
    const files = (stems.getStems(id) ?? []).filter((f) => !stem || f.stem === stem).map((f) => f.path)
    const safe = files.filter((p) => stems.isStemPath(p))
    if (safe.length) e.sender.startDrag({ file: safe[0], files: safe, icon: dragIcon() })
  })
  ipcMain.on('stems:reveal', (_e, p: string) => {
    if (stems.isStemPath(p)) shell.showItemInFolder(p)
  })
  ipcMain.on('drag:start', (e, id: number) => {
    const d = db.getDetail(id)
    if (d) e.sender.startDrag({ file: d.path, icon: dragIcon() })
  })
}

void app.whenReady().then(async () => {
  if (!isPrimary) return
  const dataDir = app.getPath('userData')
  initLog(dataDir)
  mkdirSync(join(dataDir, 'models'), { recursive: true })
  db = new LibraryDb(join(dataDir, 'library.db'))
  indexer = new Indexer(db)
  ai = new AiEngine(db, join(dataDir, 'models'), decodeCompressed)
  const stemsDir = app.isPackaged ? join(app.getPath('music'), `${APP_NAME} Stems`) : join(dataDir, 'Stems')
  stems = new StemEngine(db, join(dataDir, 'models', 'htdemucs'), stemsDir, decodeStereo)
  stems.on('status', (s) => {
    send('stems:status', s)
    // Keep CPU and memory for playback: AI analysis waits while a split is running.
    ai.paused = s.state === 'splitting'
  })
  stems.on('done', () => {
    // Make the stems searchable: register the stems folder as a library folder and rescan it.
    mkdirSync(stemsDir, { recursive: true })
    const rootId = db.addRoot(stemsDir, 'Stems')
    indexer.watchRoot(rootId, stemsDir)
    indexer.enqueue(rootId)
    send('library:changed')
  })
  handleMediaProtocol(db)
  registerIpc()

  indexer.on('status', (s) => send('index:status', s))
  indexer.on('library', () => send('library:changed'))
  indexer.on('done', () => {
    ai.syncWithDb()
    ai.refreshCounts()
    peaksCache.clear()
    void ai.processQueue()
  })
  ai.on('status', (s) => send('ai:status', s))

  createWindow()
  indexer.startAll()
  void ai.startIfInstalled()
  if (process.env.AOS_SMOKE_DIR && win) void import('./smoke').then((m) => m.runSmoke(win!, db, indexer, ai, decodeCompressed, stems))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})


app.on('will-quit', () => {
  indexer?.dispose()
  ai?.dispose()
  stems?.dispose()
  void peaksWorker?.terminate()
  db?.close()
})
