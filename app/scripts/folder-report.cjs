// Indexes any folder with the core modules (plain Node) and prints what AUDIO OS sees for each file.
// Usage: node scripts/folder-report.cjs <compiledDir> <folder> <tmpDir>
const path = require('node:path')
const fs = require('node:fs')
const [compiled, folder, tmp] = process.argv.slice(2)
const { LibraryDb } = require(path.join(compiled, 'db.js'))
const { Indexer } = require(path.join(compiled, 'indexer.js'))
const { search } = require(path.join(compiled, 'search.js'))

;(async () => {
  fs.mkdirSync(tmp, { recursive: true })
  const file = path.join(tmp, 'folder-report.db')
  for (const f of [file, file + '-wal', file + '-shm']) fs.rmSync(f, { force: true })
  const db = new LibraryDb(file)
  const ix = new Indexer(db)
  const id = db.addRoot(folder, path.basename(folder))
  const t0 = Date.now()
  await new Promise((r) => { ix.once('done', r); ix.enqueue(id) })
  console.log(`Indexed ${db.countSounds()} files in ${Date.now() - t0} ms (failed: ${ix.status.failed})\n`)
  const all = await search(db, { ready: false }, { text: '', mode: 'keyword', sort: 'name' })
  for (const s of all.items) {
    const d = db.getDetail(s.id)
    const m = d.metadata
    console.log(`• ${s.filename}`)
    console.log(`    length ${s.durationMs != null ? (s.durationMs / 1000).toFixed(2) + ' s' : '?'} | ${s.ext.toUpperCase()} ${s.sampleRate ?? '?'} Hz | ${s.channels ?? '?'} ch | ${m.bitrate ? Math.round(m.bitrate / 1000) + ' kbps' : ''} ${m.codec ?? ''}`)
    const extra = { title: m.title, artist: m.artist, genre: m.genre, description: s.description, ucs: s.ucsCat, error: m.parseError }
    const shown = Object.entries(extra).filter(([, v]) => v != null && v !== '')
    if (shown.length) console.log('    ' + shown.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
  }
  const words = [...new Set(all.items.flatMap((s) => s.filename.replace(/\.[^.]+$/, '').split(/[^A-Za-z0-9]+/)).filter((w) => w.length > 3))].slice(0, 6)
  console.log('\nSearch checks:')
  for (const w of words) {
    const r = await search(db, { ready: false }, { text: w.slice(0, 4), mode: 'keyword' })
    console.log(`  "${w.slice(0, 4)}" → ${r.total} result(s) in ${r.tookMs} ms: ${r.items.slice(0, 3).map((s) => s.filename).join(', ')}`)
  }
  ix.dispose()
  db.close()
})().catch((e) => { console.error(e); process.exit(1) })
