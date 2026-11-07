// Core logic test in plain Node (no Electron): indexing, metadata, search, peaks, AI windows, AIFF→WAV.
// Usage: node scripts/core-test.cjs <compiledDir> <soundsDir> <tmpDir>
const path = require('node:path')
const fs = require('node:fs')
const [compiled, sounds, tmp] = process.argv.slice(2)
const { LibraryDb } = require(path.join(compiled, 'db.js'))
const { Indexer } = require(path.join(compiled, 'indexer.js'))
const { search } = require(path.join(compiled, 'search.js'))
const { readRiffMetadata, aiffToWav } = require(path.join(compiled, 'audio', 'riff.js'))
const { computePeaks, readAnalysisWindows } = require(path.join(compiled, 'audio', 'pcm.js'))

let failures = 0
const check = (name, ok, extra = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
}

;(async () => {
  fs.mkdirSync(tmp, { recursive: true })
  const dbFile = path.join(tmp, 'core-test.db')
  for (const f of [dbFile, dbFile + '-wal', dbFile + '-shm']) fs.rmSync(f, { force: true })
  const db = new LibraryDb(dbFile)
  const indexer = new Indexer(db)
  const id = db.addRoot(sounds, path.basename(sounds))
  const t0 = Date.now()
  await new Promise((r) => { indexer.once('done', r); indexer.enqueue(id) })
  const all = await search(db, { ready: false }, { text: '', mode: 'keyword', sort: 'name' })
  check('indexed all 10 test files', all.total === 10, `${all.total} files in ${Date.now() - t0} ms`)
  const byName = Object.fromEntries(all.items.map((s) => [s.filename, s]))

  const door = byName['DOORWood_Slam Heavy Close_FS_TEST.wav']
  check('WAV 24-bit/48k mono parsed', door && door.bitDepth === 24 && door.sampleRate === 48000 && door.channels === 1, JSON.stringify(door && { b: door.bitDepth, sr: door.sampleRate, ch: door.channels, ms: door.durationMs }))
  check('duration ≈ 1600 ms', door && Math.abs(door.durationMs - 1600) <= 2)
  check('BWF description read', door && door.description === 'Heavy wooden door slam, close perspective, short room tail', door && door.description)
  check('UCS CatID from filename', door && door.ucsCat === 'DOORWood', door && door.ucsCat)
  const kick = byName['Kick_808 Deep Long.aiff']
  check('AIFF parsed (16-bit/44.1k mono, 1200 ms)', kick && kick.bitDepth === 16 && kick.sampleRate === 44100 && kick.channels === 1 && Math.abs(kick.durationMs - 1200) <= 2, JSON.stringify(kick && { b: kick.bitDepth, sr: kick.sampleRate, ms: kick.durationMs }))
  const whoosh = byName['WHOOSH_Fast Pass By_FS_TEST.wav']
  check('32-bit float stereo WAV parsed', whoosh && whoosh.bitDepth === 32 && whoosh.channels === 2)

  const q = async (text) => (await search(db, { ready: false }, { text, mode: 'keyword' })).items.map((s) => s.filename)
  check('search "door" → 2 door sounds', (await q('door')).length === 2, (await q('door')).join(', '))
  check('search "wood" finds DOORWood (camelCase split)', (await q('wood')).some((f) => f.startsWith('DOORWood')))
  check('search "rumble" finds thunder via name', (await q('rumble'))[0]?.startsWith('WTHRThun'))
  check('search "perspective" finds BWF description text', (await q('perspective'))[0]?.startsWith('DOORWood'))
  check('search "foley" finds by folder name', (await q('foley')).length === 2)
  check('search "thun" prefix match', (await q('thun')).length === 1)
  const ai = await search(db, { ready: false }, { text: 'storm', mode: 'ai' })
  check('AI mode without model falls back to keyword with a note', ai.modeUsed === 'keyword' && !!ai.note, ai.note)
  const mono = await search(db, { ready: false }, { text: '', mode: 'keyword', channels: 1 })
  check('channel filter (mono)', mono.items.every((s) => s.channels === 1) && mono.total === 4, `${mono.total} mono`)
  const short = await search(db, { ready: false }, { text: '', mode: 'keyword', maxDurationMs: 1000 })
  check('duration filter (≤ 1 s)', short.total === 1 && short.items[0].filename.startsWith('UIClick'), short.items.map((s) => s.filename).join(','))
  db.setFavorite(door.id, true)
  const fav = await search(db, { ready: false }, { text: '', mode: 'keyword', favoritesOnly: true })
  check('favourites', fav.total === 1)

  const detail = db.getDetail(door.id)
  check('absolute path rebuilt', detail && fs.existsSync(detail.path), detail && detail.path)
  const m = readRiffMetadata(detail.path)
  const peaks = computePeaks(detail.path, m.layout, 2000)
  const maxPeak = Math.max(...peaks)
  check('peaks: 2000 buckets, non-silent, ≤ 1', peaks.length === 2000 && maxPeak > 0.3 && maxPeak <= 1, `max ${maxPeak}`)
  const riser = db.getDetail(byName['Riser_Tension Build Cinematic 20s.wav'].id)
  const wins = readAnalysisWindows(riser.path, readRiffMetadata(riser.path).layout, 48000, 10, 6)
  check('AI analysis windows for 20 s file (10 s @ 48 kHz each)', wins.length >= 2 && wins.every((w) => w.length === 480000), `${wins.length} windows`)
  const k = db.getDetail(kick.id)
  const wav = aiffToWav(k.path, readRiffMetadata(k.path).layout)
  const conv = path.join(tmp, 'kick-converted.wav')
  fs.writeFileSync(conv, wav)
  const cm = readRiffMetadata(conv)
  check('AIFF → WAV conversion is a valid WAV', cm && cm.layout && cm.layout.container === 'wav' && Math.abs(cm.durationMs - 1200) <= 2)
  // Same audio after conversion? compare a few samples
  const a = readAnalysisWindows(k.path, readRiffMetadata(k.path).layout, 44100, 1, 1)[0]
  const b = readAnalysisWindows(conv, cm.layout, 44100, 1, 1)[0]
  let maxDiff = 0
  for (let i = 0; i < 1000; i++) maxDiff = Math.max(maxDiff, Math.abs(a[i] - b[i]))
  check('AIFF → WAV samples identical', maxDiff < 1e-6, `max diff ${maxDiff}`)

  // Rescan: unchanged files are skipped; deleted file is removed.
  const extra = path.join(sounds, 'UI', 'TEMP_delete_me.wav')
  fs.copyFileSync(path.join(sounds, 'UI', 'UIClick_Soft Tap Button.wav'), extra)
  await new Promise((r) => { indexer.once('done', r); indexer.enqueue(id) })
  check('rescan picks up new file (only 1 new)', db.countSounds() === 11 && indexer.status.added === 1, `added ${indexer.status.added}`)
  fs.rmSync(extra)
  await new Promise((r) => { indexer.once('done', r); indexer.enqueue(id) })
  check('rescan removes deleted file', db.countSounds() === 10)

  indexer.dispose()
  db.close()
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED')
  process.exit(failures ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
