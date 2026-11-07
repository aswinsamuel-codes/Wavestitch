// Generates a small synthetic test library (WAV/BWF + AIFF) for development and smoke tests.
// Usage: node scripts/make-test-sounds.mjs <outputDir>
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = process.argv[2]
if (!out) throw new Error('usage: node make-test-sounds.mjs <outputDir>')

let seed = 12345
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1

function synth(sec, sr, ch, fn) {
  const n = Math.round(sec * sr)
  const data = Array.from({ length: ch }, () => new Float32Array(n))
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const v = fn(t, i, sr, (x, a) => (lp += a * (x - lp)))
    for (let c = 0; c < ch; c++) data[c][i] = Math.max(-1, Math.min(1, Array.isArray(v) ? v[c] : v))
  }
  return data
}

function bext(description, originator) {
  const b = Buffer.alloc(602)
  b.write(description.slice(0, 255), 0, 'latin1')
  b.write(originator, 256, 'latin1')
  b.write('2026-11-07', 320, 'latin1')
  b.write('10:00:00', 330, 'latin1')
  return b
}

function wav(path, data, sr, bits, { float = false, chunks = [] } = {}) {
  const ch = data.length
  const n = data[0].length
  const bytes = bits / 8
  const pcm = Buffer.alloc(n * ch * bytes)
  let p = 0
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const v = data[c][i]
      if (float) pcm.writeFloatLE(v, p)
      else if (bits === 16) pcm.writeInt16LE(Math.round(v * 32767), p)
      else if (bits === 24) pcm.writeIntLE(Math.round(v * 8388607), p, 3)
      p += bytes
    }
  const fmt = Buffer.alloc(16)
  fmt.writeUInt16LE(float ? 3 : 1, 0)
  fmt.writeUInt16LE(ch, 2)
  fmt.writeUInt32LE(sr, 4)
  fmt.writeUInt32LE(sr * ch * bytes, 8)
  fmt.writeUInt16LE(ch * bytes, 12)
  fmt.writeUInt16LE(bits, 14)
  const chunk = (id, body) => {
    const h = Buffer.alloc(8)
    h.write(id, 0, 'latin1')
    h.writeUInt32LE(body.length, 4)
    return Buffer.concat([h, body, body.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)])
  }
  const body = Buffer.concat([Buffer.from('WAVE'), chunk('fmt ', fmt), ...chunks.map(([id, b]) => chunk(id, b)), chunk('data', pcm)])
  const head = Buffer.alloc(8)
  head.write('RIFF', 0, 'latin1')
  head.writeUInt32LE(body.length, 4)
  writeFileSync(path, Buffer.concat([head, body]))
}

function aiff(path, data, sr) {
  const ch = data.length
  const n = data[0].length
  const pcm = Buffer.alloc(n * ch * 2)
  let p = 0
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++, p += 2) pcm.writeInt16BE(Math.round(data[c][i] * 32767), p)
  const comm = Buffer.alloc(18)
  comm.writeUInt16BE(ch, 0)
  comm.writeUInt32BE(n, 2)
  comm.writeUInt16BE(16, 6)
  // 80-bit extended sample rate
  const e = Math.floor(Math.log2(sr))
  comm.writeUInt16BE(16383 + e, 8)
  comm.writeUInt32BE(Math.floor((sr / 2 ** e) * 2 ** 31), 10)
  const ssnd = Buffer.concat([Buffer.alloc(8), pcm])
  const chunk = (id, b) => {
    const h = Buffer.alloc(8)
    h.write(id, 0, 'latin1')
    h.writeUInt32BE(b.length, 4)
    return Buffer.concat([h, b])
  }
  const body = Buffer.concat([Buffer.from('AIFF'), chunk('COMM', comm), chunk('SSND', ssnd)])
  const head = Buffer.alloc(8)
  head.write('FORM', 0, 'latin1')
  head.writeUInt32BE(body.length, 4)
  writeFileSync(path, Buffer.concat([head, body]))
}

const dirs = ['Foley/Doors', 'Ambience', 'Weather', 'Music Loops', 'UI', 'Cinematic']
for (const d of dirs) mkdirSync(join(out, d), { recursive: true })

wav(join(out, 'Foley/Doors', 'DOORWood_Slam Heavy Close_FS_TEST.wav'),
  synth(1.6, 48000, 1, (t, i, sr, lp) => lp(rnd(), 0.08) * 3 * Math.exp(-t * 6) + Math.sin(2 * Math.PI * 70 * t) * Math.exp(-t * 9) * 0.6),
  48000, 24, { chunks: [['bext', bext('Heavy wooden door slam, close perspective, short room tail', 'AUDIO OS Test')]] })
wav(join(out, 'Foley/Doors', 'DOORMetl_Creak Slow Open_FS_TEST.wav'),
  synth(3.2, 48000, 1, (t) => Math.sin(2 * Math.PI * (300 + 120 * Math.sin(t * 3)) * t) * 0.35 * (0.6 + 0.4 * Math.sin(t * 17))),
  48000, 24, { chunks: [['bext', bext('Old metal door creaking slowly open', 'AUDIO OS Test')]] })
wav(join(out, 'Weather', 'WTHRThun_Distant Rumble Long_FS_TEST.wav'),
  synth(7, 44100, 2, (t, i, sr, lp) => { const v = lp(rnd(), 0.01) * 6 * (0.3 + 0.7 * Math.exp(-((t - 2) ** 2))); return [v, v * 0.9] }),
  44100, 16, { chunks: [['bext', bext('Distant thunder rumble, rolling, low frequency', 'AUDIO OS Test')]] })
wav(join(out, 'Weather', 'RAINLite_Gentle On Window_FS_TEST.wav'),
  synth(6, 44100, 2, (t) => { const d = rnd() * (Math.random() < 0.02 ? 0.9 : 0.08); return [d, rnd() * 0.08] }),
  44100, 16)
wav(join(out, 'Ambience', 'AMBForst_Birds Morning Chirps_FS_TEST.wav'),
  synth(8, 48000, 2, (t) => { const ph = (t * 3) % 1; const c = ph < 0.15 ? Math.sin(2 * Math.PI * (3000 + 4000 * ph) * t) * 0.4 : 0; return [c + rnd() * 0.01, c * 0.7 + rnd() * 0.01] }),
  48000, 24)
wav(join(out, 'Music Loops', 'Pad_Warm Ambient C Minor 90bpm.wav'),
  synth(10, 48000, 2, (t) => { const v = (Math.sin(2 * Math.PI * 130.8 * t) + Math.sin(2 * Math.PI * 155.6 * t) + Math.sin(2 * Math.PI * 196 * t)) * 0.2 * Math.min(1, t); return [v, v] }),
  48000, 24)
aiff(join(out, 'Music Loops', 'Kick_808 Deep Long.aiff'),
  synth(1.2, 44100, 1, (t) => Math.sin(2 * Math.PI * (50 + 120 * Math.exp(-t * 25)) * t) * Math.exp(-t * 2.5) * 0.9), 44100)
wav(join(out, 'UI', 'UIClick_Soft Tap Button.wav'),
  synth(0.08, 48000, 1, (t) => Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 80) * 0.7), 48000, 16)
wav(join(out, 'Cinematic', 'WHOOSH_Fast Pass By_FS_TEST.wav'),
  synth(1.4, 48000, 2, (t, i, sr, lp) => { const env = Math.exp(-(((t - 0.7) / 0.25) ** 2)); const v = lp(rnd(), 0.05 + 0.4 * env) * env * 2.5; return [v * (1.4 - t), v * t] }),
  48000, 32, { float: true })
wav(join(out, 'Cinematic', 'Riser_Tension Build Cinematic 20s.wav'),
  synth(20, 48000, 2, (t) => { const f = 80 + t * t * 8; const v = Math.sin(2 * Math.PI * f * t) * 0.15 * (t / 20) + rnd() * 0.02 * (t / 20); return [v, v] }),
  48000, 24)
console.log('test sounds written to', out)
