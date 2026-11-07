// Developer self-test: only active when AOS_SMOKE_DIR is set. Adds a folder, waits for indexing,
// exercises search/peaks, drives the UI with key presses, saves screenshots + a JSON report, then quits.
import { app, type BrowserWindow } from 'electron'
import { writeFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { LibraryDb } from './db'
import type { Indexer } from './indexer'
import type { AiEngine } from './ai'
import { search } from './search'
import type { StemEngine } from './stems'
import { readRiffMetadata } from './audio/riff'
import { readFileSync } from 'node:fs'

function stemStats(path: string): Record<string, number> {
  const m = readRiffMetadata(path)
  if (!m?.layout) return { error: 1 }
  const b = Uint8Array.prototype.slice.call(readFileSync(path), m.layout.dataOffset, m.layout.dataOffset + m.layout.dataBytes)
  const f = new Float32Array(b.buffer, 0, Math.floor(b.length / 4))
  let s = 0
  let peak = 0
  for (let i = 0; i < f.length; i++) {
    s += f[i] * f[i]
    const a = Math.abs(f[i])
    if (a > peak) peak = a
  }
  return { seconds: Math.round((m.durationMs ?? 0) / 100) / 10, rmsDb: Math.round(10 * Math.log10(s / f.length + 1e-12) * 10) / 10, peak: Math.round(peak * 1000) / 1000 }
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export async function runSmoke(
  win: BrowserWindow,
  db: LibraryDb,
  indexer: Indexer,
  ai: AiEngine,
  decodeCompressed: (id: number) => Promise<Float32Array[] | null>,
  stems?: StemEngine
): Promise<void> {
  const dir = process.env.AOS_SMOKE_DIR!
  const outDir = process.env.AOS_SMOKE_OUT ?? join(app.getPath('userData'), 'smoke')
  mkdirSync(outDir, { recursive: true })
  const report: Record<string, unknown> = {}
  const shotErrors: string[] = []
  report.shotErrors = shotErrors
  const shot = async (name: string): Promise<void> => {
    try {
      if (!win.isVisible()) win.showInactive()
      const img = await win.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true })
      writeFileSync(join(outDir, `${name}.png`), img.toPNG())
    } catch (e) {
      shotErrors.push(`${name}: ${String(e)} (visible=${win.isVisible()}, minimized=${win.isMinimized()})`)
    }
  }
  try {
    await new Promise<void>((r) => (win.webContents.isLoading() ? win.webContents.once('did-finish-load', () => r()) : r()))
    await wait(2500)
    await shot('01-empty')
    const id = db.addRoot(dir, basename(dir))
    const done = new Promise<void>((r) => indexer.once('done', () => r()))
    indexer.enqueue(id)
    win.webContents.send('library:changed')
    await done
    await wait(800)
    report.roots = db.listRoots()
    report.status = indexer.status
    for (const q of ['door', 'thunder', 'DOOR wood', 'rumble low', 'stereo', 'kick']) {
      const r = await search(db, ai, { text: q, mode: 'keyword' })
      report[`kw:${q}`] = { total: r.total, top: r.items.slice(0, 3).map((s) => s.filename), ms: r.tookMs }
    }
    const all = await search(db, ai, { text: '', mode: 'keyword', sort: 'name' })
    report.all = all.items.map((s) => ({ f: s.filename, ms: s.durationMs, sr: s.sampleRate, bits: s.bitDepth, ch: s.channels, ucs: s.ucsCat, desc: s.description }))
    report.ai = ai.status
    const decoded: string[] = []
    for (const s of all.items.slice(0, 6)) {
      const t = Date.now()
      const w = await decodeCompressed(s.id)
      decoded.push(`${s.filename}: ${w ? `${w.length} windows × ${w[0]?.length} samples` : 'null'} in ${Date.now() - t} ms`)
    }
    report.aiDecode = decoded

    if (process.env.AOS_SMOKE_AI) {
      // Install (downloads only if missing), wait until every sound is analysed, then try AI searches.
      const t = Date.now()
      const readyOrError = new Promise<void>((r) => {
        const on = (s: { state: string }): void => {
          if (s.state === 'ready' || s.state === 'error') {
            ai.off('status', on)
            r()
          }
        }
        ai.on('status', on)
      })
      void ai.install()
      if (ai.status.state !== 'ready' && ai.status.state !== 'error') await readyOrError
      report.aiInstall = { state: ai.status.state, message: ai.status.message, seconds: Math.round((Date.now() - t) / 1000) }
      if (ai.ready) {
        const t2 = Date.now()
        while (ai.status.pending > 0 && Date.now() - t2 < 600_000) await wait(1000)
        await ai.processQueue()
        report.aiEmbed = { embedded: ai.status.embedded, pending: ai.status.pending, seconds: Math.round((Date.now() - t2) / 1000) }
        const queries = (process.env.AOS_SMOKE_QUERIES ?? 'drums and percussion|traditional indian drums|heavy rock electric guitar|calm piano|rain').split('|')
        const aiResults: Record<string, unknown> = {}
        for (const q of queries) {
          const r = await search(db, ai, { text: q, mode: 'ai' })
          aiResults[q] = { mode: r.modeUsed, ms: r.tookMs, top: r.items.slice(0, 4).map((s) => `${s.filename} (${(s.score ?? 0).toFixed(4)})`) }
        }
        report.aiSearch = aiResults
        const first = all.items[0]
        if (first) {
          const r = await search(db, ai, { text: '', mode: 'ai', similarTo: first.id })
          report.similar = { to: first.filename, ms: r.tookMs, top: r.items.slice(0, 4).map((s) => `${s.filename} (${(s.score ?? 0).toFixed(3)})`) }
        }
        // Raw cosine of text vs each sound, to judge how well CLAP separates them.
        const scores: Record<string, Record<string, number>> = {}
        for (const q of queries) {
          const qv = await ai.embedText(q)
          if (!qv) continue
          scores[q] = {}
          for (const s of all.items) {
            const v = ai.vectorFor(s.id)
            if (v) scores[q][s.filename.slice(0, 28)] = Math.round(v.reduce((a, x, i) => a + x * qv[i], 0) * 1000) / 1000
          }
        }
        report.aiCosine = scores
        win.webContents.send('library:changed')
        await wait(1500)
        await win.webContents.executeJavaScript(`document.querySelectorAll('.seg button')[1]?.click()`)
        await wait(300)
        await win.webContents.executeJavaScript(`(() => { const i = document.querySelector('.search-input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'traditional indian drums'); i.dispatchEvent(new Event('input', { bubbles: true })) })()`)
        await wait(2000)
        await shot('05-ai-search')
      }
    }
    // Drive the UI: select first row with ↓ and show its waveform.
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Down' })
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Down' })
    await wait(1500)
    await shot('02-library')
    for (let i = 0; i < 3; i++) {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Down' })
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Down' })
      await wait(400)
    }
    await wait(1200)
    await shot('03-selected')
    await wait(5000)
    await shot('04-selected-later')
    report.player = await win.webContents.executeJavaScript('window.__aosPlayer ?? null')
    report.lcd = await win.webContents.executeJavaScript(`document.querySelector('.lcd-main')?.textContent`)
    report.decodeEach = await win.webContents.executeJavaScript(`
      (async () => {
        const out = []
        const ctx = new AudioContext()
        for (const id of [1, 2, 3, 4]) {
          try {
            const r = await fetch('aos://sound/' + id)
            const buf = await r.arrayBuffer()
            const len = r.headers.get('content-length')
            try { const a = await ctx.decodeAudioData(buf); out.push(id + ': ok ' + a.duration.toFixed(2) + 's, bytes ' + buf.byteLength + '/' + len) }
            catch (e) { out.push(id + ': DECODE FAIL ' + e.message + ', bytes ' + buf.byteLength + '/' + len) }
          } catch (e) { out.push(id + ': FETCH FAIL ' + e.message) }
        }
        return out
      })()`)
    if (process.env.AOS_SMOKE_STEMS && stems) {
      const t = Date.now()
      if (!stems.installed) await stems.install()
      report.stemInstall = { state: stems.status.state, message: stems.status.message, seconds: Math.round((Date.now() - t) / 1000), sha256ok: await stems.verify() }
      const testRoot = db.listRoots().find((r) => r.path === dir)
      const target = [...all.items].filter((s) => s.rootId === testRoot?.id).sort((a, b) => (a.durationMs ?? 0) - (b.durationMs ?? 0))[0]
      if (stems.installed && target && stems.getStems(target.id)) report.stemSplit = { track: target.filename, alreadySplit: true }
      else if (stems.installed && target) {
        const t2 = Date.now()
        const done = new Promise<void>((r) => stems.once('done', () => r()))
        const failed = new Promise<void>((r) => {
          const on = (s: { state: string; message?: string }): void => {
            if (s.state === 'ready' && s.message) {
              stems.off('status', on)
              r()
            }
          }
          stems.on('status', on)
        })
        stems.split(target.id)
        await Promise.race([done, failed, wait(900_000)])
        const files = stems.getStems(target.id)
        report.stemSplit = {
          track: target.filename,
          trackSeconds: Math.round((target.durationMs ?? 0) / 1000),
          wallSeconds: Math.round((Date.now() - t2) / 1000),
          message: stems.status.message,
          files: files?.map((f) => ({ stem: f.stem, mb: Math.round(f.sizeBytes / 104857.6) / 10, ...stemStats(f.path) }))
        }
      }
      if (stems.installed && target) {
        await wait(4000) // let the Stems folder get indexed
        report.rootsAfterStems = db.listRoots().map((r) => `${r.label}: ${r.count}`)
        // Show the track with its stems in the UI.
        win.webContents.send('library:changed')
        await win.webContents.executeJavaScript(`document.querySelectorAll('.seg button')[0]?.click()`)
        await win.webContents.executeJavaScript(`(() => { const i = document.querySelector('.search-input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(target.filename.replace(/\.[^.]+$/, ''))}); i.dispatchEvent(new Event('input', { bubbles: true })) })()`)
        await wait(1200)
        // Select the original track (not one of its stems) by clicking its row.
        await win.webContents.executeJavaScript(`(() => { const rows = [...document.querySelectorAll('.tr')]; const r = rows.find((x) => x.querySelector('.fname')?.textContent === ${JSON.stringify(target.filename.replace(/\.[^.]+$/, ''))}); r?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })) })()`)
        await wait(2500)
        await shot('06-stems')
      }
    }
    if (process.env.AOS_SMOKE_PLAYTEST && stems?.installed) {
      // Play a sound while a stem split runs; measure stalls and how far playback falls behind wall-clock time.
      const testRoot = db.listRoots().find((r) => r.path === dir)
      const pool = all.items.filter((s) => s.rootId === testRoot?.id)
      const splitTarget = pool.find((s) => !stems.getStems(s.id)) ?? pool[0]
      const playTarget = pool.find((s) => s.id !== splitTarget.id) ?? pool[0]
      const splitDone = new Promise<void>((r) => stems.once('done', () => r()))
      stems.split(splitTarget.id)
      await wait(15000) // let decoding finish and separation get going
      await win.webContents.executeJavaScript(`document.querySelectorAll('.seg button')[0]?.click()`)
      await win.webContents.executeJavaScript(`(() => { const i = document.querySelector('.search-input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })) })()`)
      await wait(800)
      await win.webContents.executeJavaScript(`(() => { const rows = [...document.querySelectorAll('.tr')]; const r = rows.find((x) => x.querySelector('.fname')?.textContent === ${JSON.stringify(playTarget.filename.replace(/\.[^.]+$/, ''))}); r?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); r?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })) })()`)
      const sample = await win.webContents.executeJavaScript(`
        new Promise((resolve) => {
          const ws = window.__aosWs; let waits = 0
          const m = { get currentTime() { return ws.getCurrentTime() }, get paused() { return !ws.isPlaying() }, readyState: 'n/a' }
          const pts = []; const t0 = performance.now(); let lastRaf = performance.now(); let worstFrame = 0
          const raf = () => { const n = performance.now(); worstFrame = Math.max(worstFrame, n - lastRaf); lastRaf = n; if (n - t0 < 20000) requestAnimationFrame(raf) }
          requestAnimationFrame(raf)
          setTimeout(() => {
            const start = m.currentTime; const s0 = performance.now()
            const iv = setInterval(() => pts.push([(performance.now() - s0) / 1000, m.currentTime - start, m.paused]), 1000)
            setTimeout(() => { clearInterval(iv); resolve({ waits, worstFrameMs: Math.round(worstFrame), pts, readyState: m.readyState }) }, 18000)
          }, 1500)
        })`)
      const pts = sample.pts as Array<[number, number, boolean]>
      const last = pts[pts.length - 1]
      report.playtest = {
        played: playTarget.filename,
        whileSplitting: splitTarget.filename,
        stemProgressAtEnd: stems.status.job?.progress,
        waitingEvents: sample.waits,
        worstUiFrameMs: sample.worstFrameMs,
        wallSeconds: last?.[0],
        audioSeconds: last ? Math.round(last[1] * 100) / 100 : null,
        driftSeconds: last ? Math.round((last[0] - last[1]) * 100) / 100 : null,
        pausedAtEnd: last?.[2]
      }
      await shot('07-playing-while-splitting')
      await Promise.race([splitDone, wait(900_000)])
      report.playtestSplit = { message: stems.status.message, lastDone: stems.status.lastDone }
    }
    if (process.env.AOS_SMOKE_SESSION && stems) {
      const js = (code: string): Promise<unknown> => win.webContents.executeJavaScript(code)
      const testRoot = db.listRoots().find((r) => r.path === dir)
      const target = all.items.find((s) => s.rootId === testRoot?.id && stems.getStems(s.id))
      if (!target) report.session = 'no split track available'
      else {
        const name = target.filename.replace(/\.[^.]+$/, '')
        await js(`document.querySelectorAll('.view-tabs button')[0]?.click()`)
        await js(`document.querySelectorAll('.seg button')[0]?.click()`)
        await js(`(() => { const i = document.querySelector('.search-input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(name)}); i.dispatchEvent(new Event('input', { bubbles: true })) })()`)
        await wait(1200)
        await js(`(() => { const r = [...document.querySelectorAll('.tr')].find((x) => x.querySelector('.fname')?.textContent === ${JSON.stringify(name)}); r?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })) })()`)
        await wait(2500)
        const btn = await js(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Open stems in Session')); if (!b) return 'missing'; if (b.disabled) return 'disabled'; b.click(); return 'clicked' })()`)
        await wait(9000) // decode 5 tracks
        const tracks = await js(`[...document.querySelectorAll('.th-name')].map((e) => e.textContent)`)
        const statuses = await js(`[...document.querySelectorAll('.tl-status')].map((e) => e.textContent)`)
        await js(`document.querySelector('.transport .tbtn')?.click()`) // play
        await wait(4000)
        const lcdPlaying = await js(`document.querySelector('.lcd-main')?.textContent`)
        await shot('08-session-playing')
        // Solo the Drums track.
        await js(`(() => { const rows = [...document.querySelectorAll('.tl-row')]; const r = rows.find((x) => x.querySelector('.th-name')?.textContent?.includes('Drums')); r?.querySelectorAll('.ms-btn')[1]?.click() })()`)
        await wait(2500)
        const meters = await js(`[...document.querySelectorAll('.th-meter-fill')].map((e) => e.style.width)`)
        await shot('09-session-solo-drums')
        await js(`document.querySelectorAll('.transport .tbtn')[1]?.click()`) // stop
        report.session = { track: target.filename, button: btn, tracks, statuses, lcdPlaying, metersWithDrumsSoloed: meters }
      }
    }
    report.rendererErrors = await win.webContents.executeJavaScript('window.__aosErrors ?? []')
    report.mediaCheck = await win.webContents.executeJavaScript(`
      Promise.all([1,2,3,4,5,6,7,8,9,10].map(id => fetch('aos://sound/' + id, { headers: { Range: 'bytes=0-15' } })
        .then(r => r.status + ' ' + (r.headers.get('content-type')||'')).catch(e => 'ERR ' + e.message)))`)
  } catch (e) {
    report.error = String((e as Error)?.stack ?? e)
  } finally {
    writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2))
    app.quit()
  }
}
