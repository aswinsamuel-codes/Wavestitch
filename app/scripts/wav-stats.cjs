// Prints duration, RMS and peak for WAV files (any PCM/float layout). Usage: node scripts/wav-stats.cjs <compiledDir> <file...>
const path = require('node:path')
const fs = require('node:fs')
const [compiled, ...files] = process.argv.slice(2)
const { readRiffMetadata, decodeToMono } = require(path.join(compiled, 'audio', 'riff.js'))
for (const f of files) {
  const m = readRiffMetadata(f)
  if (!m?.layout) { console.log(f, 'not readable'); continue }
  const raw = fs.readFileSync(f).subarray(m.layout.dataOffset, m.layout.dataOffset + m.layout.dataBytes)
  const mono = decodeToMono(Buffer.from(raw), m.layout)
  let s = 0, peak = 0
  for (const v of mono) { s += v * v; if (Math.abs(v) > peak) peak = Math.abs(v) }
  const db = (10 * Math.log10(s / mono.length + 1e-12)).toFixed(1)
  console.log(`${path.basename(f).padEnd(34)} ${(m.durationMs / 1000).toFixed(1)} s  ${m.layout.bitsPerSample}-bit ${m.layout.formatTag === 3 ? 'float' : 'int'} ${m.layout.channels}ch @${m.layout.sampleRate}  RMS ${db} dB  peak ${peak.toFixed(3)}  desc: ${m.bext?.description ?? ''}`)
}
