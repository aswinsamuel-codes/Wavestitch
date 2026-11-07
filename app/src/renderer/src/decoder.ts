// Hidden background page: decodes audio with Chromium's decoder (MP3/FLAC/OGG/M4A/WAV, AIFF via aos://).
//  - kind "windows": 48 kHz mono, up to 6 ten-second windows for AI analysis
//  - kind "stereo44k": full-length 44.1 kHz stereo for stem separation
interface DecodeRequest {
  reqId: number
  id: number
  kind?: 'windows' | 'stereo44k'
}
interface DecoderBridge {
  onRequest(cb: (req: DecodeRequest) => void): void
  reply(res: { reqId: number; windows?: Float32Array[]; left?: Float32Array; right?: Float32Array; error?: string }): void
}
const bridge = (window as unknown as { aosDecoder: DecoderBridge }).aosDecoder

const MAX_BYTES = 500 * 1024 * 1024
const MAX_STEM_SECONDS = 20 * 60

function rms(a: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * a[i]
  return Math.sqrt(s / Math.max(1, a.length))
}

async function load(id: number, rate: number): Promise<AudioBuffer> {
  const res = await fetch(`aos://sound/${id}`)
  if (!res.ok) throw new Error(`could not read file (${res.status})`)
  const len = Number(res.headers.get('content-length') ?? 0)
  if (len > MAX_BYTES) throw new Error('file too large')
  const buf = await res.arrayBuffer()
  // decodeAudioData on an OfflineAudioContext resamples to the context rate (high-quality resampler).
  return new OfflineAudioContext(2, 1, rate).decodeAudioData(buf)
}

async function analysisWindows(id: number): Promise<Float32Array[]> {
  const RATE = 48000
  const WIN = 10 * RATE
  const audio = await load(id, RATE)
  const n = audio.length
  const mono = new Float32Array(n)
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const d = audio.getChannelData(c)
    for (let i = 0; i < n; i++) mono[i] += d[i] / audio.numberOfChannels
  }
  const winLen = Math.min(n, WIN)
  const count = Math.max(1, Math.min(6, Math.ceil(n / winLen)))
  const out: Float32Array[] = []
  for (let w = 0; w < count; w++) {
    const start = count === 1 ? 0 : Math.round(((n - winLen) * w) / (count - 1))
    const win = mono.slice(start, start + winLen)
    if (count > 1 && rms(win) < 0.0005) continue
    out.push(win)
  }
  return out
}

async function stereo44k(id: number): Promise<{ left: Float32Array; right: Float32Array }> {
  const audio = await load(id, 44100)
  if (audio.duration > MAX_STEM_SECONDS) throw new Error('track longer than 20 minutes')
  const left = audio.getChannelData(0).slice()
  const right = audio.numberOfChannels > 1 ? audio.getChannelData(1).slice() : left.slice()
  return { left, right }
}

bridge.onRequest(async ({ reqId, id, kind }) => {
  try {
    if (kind === 'stereo44k') bridge.reply({ reqId, ...(await stereo44k(id)) })
    else bridge.reply({ reqId, windows: await analysisWindows(id) })
  } catch (e) {
    bridge.reply({ reqId, error: String((e as Error)?.message ?? e) })
  }
})
