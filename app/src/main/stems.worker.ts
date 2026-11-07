// Worker thread: HT-Demucs 4-stem separation with ONNX Runtime (CPU).
// Model I/O (StemSplitio/htdemucs-onnx): input "mix" float32 [1, 2, 343980] (44.1 kHz stereo, 7.8 s),
// output "stems" float32 [1, 4, 2, 343980] in the order drums, bass, other, vocals.
// Chunks overlap by 25% with linear cross-fades (same as the reference infer.py); finished audio is
// streamed to disk so memory stays flat even for long tracks.
// Runs as an Electron utility process (separate OS process, started at below-normal priority) so heavy
// separation never competes with audio playback or the UI.
import { openSync, readSync, writeSync, closeSync } from 'node:fs'
import { cpus } from 'node:os'
import { APP_NAME } from '@shared/brand'

const parentPort = (
  process as unknown as {
    parentPort: { on(ev: 'message', cb: (e: { data: unknown }) => void): void; postMessage(m: unknown): void }
  }
).parentPort
// Use about half the logical cores, leaving the rest for playback, the UI and the DAW.
const THREADS = Math.max(2, Math.floor(cpus().length / 2) - 1)

const N = 343980
const OVERLAP = Math.floor(N / 4)
const STRIDE = N - OVERLAP
const STEMS = 4

type Ort = typeof import('onnxruntime-node')
let ort: Ort | null = null
let session: import('onnxruntime-node').InferenceSession | null = null
let sessionPath = ''

function makeWindow(): Float32Array {
  const w = new Float32Array(N).fill(1)
  for (let i = 0; i < OVERLAP; i++) {
    const f = i / (OVERLAP - 1)
    w[i] = f
    w[N - 1 - i] = Math.min(w[N - 1 - i], f)
  }
  return w
}

function bextChunk(description: string): Buffer {
  const body = Buffer.alloc(602)
  body.write(description.slice(0, 255), 0, 'latin1')
  body.write(APP_NAME, 256, 'latin1')
  const now = new Date()
  body.write(now.toISOString().slice(0, 10), 320, 'latin1')
  body.write(now.toTimeString().slice(0, 8), 330, 'latin1')
  const h = Buffer.alloc(8)
  h.write('bext', 0, 'latin1')
  h.writeUInt32LE(body.length, 4)
  return Buffer.concat([h, body])
}

/** 32-bit float stereo WAV header (+ bext with a description) for a known frame count. */
function wavHeader(frames: number, description: string): Buffer {
  const dataBytes = frames * 2 * 4
  const bext = bextChunk(description)
  const fmt = Buffer.alloc(24)
  fmt.write('fmt ', 0, 'latin1')
  fmt.writeUInt32LE(16, 4)
  fmt.writeUInt16LE(3, 8) // IEEE float
  fmt.writeUInt16LE(2, 10)
  fmt.writeUInt32LE(44100, 12)
  fmt.writeUInt32LE(44100 * 8, 16)
  fmt.writeUInt16LE(8, 20)
  fmt.writeUInt16LE(32, 22)
  const dataHead = Buffer.alloc(8)
  dataHead.write('data', 0, 'latin1')
  dataHead.writeUInt32LE(dataBytes, 4)
  const riff = Buffer.alloc(12)
  riff.write('RIFF', 0, 'latin1')
  riff.writeUInt32LE(4 + fmt.length + bext.length + dataHead.length + dataBytes, 4)
  riff.write('WAVE', 8, 'latin1')
  return Buffer.concat([riff, fmt, bext, dataHead])
}

interface SplitMsg {
  type: 'split'
  reqId: number
  modelPath: string
  pcmPath: string // raw float32 file: all left samples, then all right samples (44.1 kHz)
  frames: number
  outPaths: string[] // drums, bass, other, vocals
  descriptions: string[]
}

async function split(m: SplitMsg): Promise<void> {
  ort ??= await import('onnxruntime-node')
  if (!session || sessionPath !== m.modelPath) {
    // Graph optimisation is disabled on purpose: constant folding of this export needs several GB of RAM
    // ("bad allocation" on an 8 GB laptop). The memory arena is also off: it is faster (~0.8 GB RSS) but
    // starved playback and the UI on low-memory machines. Without it the process stays around 100–300 MB.
    session = await ort.InferenceSession.create(m.modelPath, {
      executionProviders: ['cpu'],
      intraOpNumThreads: THREADS,
      interOpNumThreads: 1,
      graphOptimizationLevel: 'disabled',
      enableCpuMemArena: false,
      enableMemPattern: false
    })
    sessionPath = m.modelPath
  }
  const total = m.frames
  const pcmFd = openSync(m.pcmPath, 'r')
  const chunks = Math.max(1, Math.ceil(Math.max(0, total - OVERLAP) / STRIDE))
  const win = makeWindow()
  const fds = m.outPaths.map((p, i) => {
    const fd = openSync(p, 'w')
    writeSync(fd, wavHeader(total, m.descriptions[i]))
    return fd
  })
  // Accumulators for the current N-sample region: [stem][channel] and window weights.
  const acc = Array.from({ length: STEMS }, () => [new Float32Array(N), new Float32Array(N)])
  const weight = new Float32Array(N)
  const input = new Float32Array(2 * N)
  const inputBytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength)
  let written = 0
  const t0 = Date.now()

  const flush = (count: number): void => {
    // Interleave L/R float32 for each stem and append to its file.
    for (let s = 0; s < STEMS; s++) {
      const out = new Float32Array(count * 2)
      const [L, R] = acc[s]
      for (let i = 0; i < count; i++) {
        const w = weight[i] > 1e-8 ? weight[i] : 1
        out[2 * i] = L[i] / w
        out[2 * i + 1] = R[i] / w
      }
      writeSync(fds[s], Buffer.from(out.buffer, out.byteOffset, out.byteLength))
    }
    written += count
  }

  try {
    for (let c = 0; c < chunks; c++) {
      const start = c * STRIDE
      const len = Math.min(N, total - start)
      input.fill(0)
      // Read only this chunk from the temp file: left channel into [0, N), right channel into [N, 2N).
      readSync(pcmFd, inputBytes, 0, len * 4, start * 4)
      readSync(pcmFd, inputBytes, N * 4, len * 4, (total + start) * 4)
      const res = await session.run({ mix: new ort.Tensor('float32', input, [1, 2, N]) })
      const stems = res.stems.data as Float32Array // (1, 4, 2, N)
      for (let s = 0; s < STEMS; s++)
        for (let ch = 0; ch < 2; ch++) {
          const dst = acc[s][ch]
          const off = (s * 2 + ch) * N
          for (let i = 0; i < len; i++) dst[i] += stems[off + i] * win[i]
        }
      for (let i = 0; i < len; i++) weight[i] += win[i]

      const isLast = c === chunks - 1
      const final = isLast ? len : STRIDE // samples that no later chunk will touch
      flush(Math.min(final, total - written))
      if (!isLast) {
        // Shift the overlap region to the front for the next chunk.
        for (let s = 0; s < STEMS; s++)
          for (let ch = 0; ch < 2; ch++) {
            acc[s][ch].copyWithin(0, STRIDE)
            acc[s][ch].fill(0, N - STRIDE)
          }
        weight.copyWithin(0, STRIDE)
        weight.fill(0, N - STRIDE)
      }
      const elapsed = (Date.now() - t0) / 1000
      parentPort.postMessage({
        type: 'progress',
        reqId: m.reqId,
        done: c + 1,
        total: chunks,
        etaSec: Math.round((elapsed / (c + 1)) * (chunks - c - 1))
      })
    }
  } finally {
    fds.forEach((fd) => closeSync(fd))
    closeSync(pcmFd)
  }
  parentPort.postMessage({ type: 'done', reqId: m.reqId, seconds: (Date.now() - t0) / 1000, frames: written })
}

parentPort.on('message', (e) => {
  const m = e.data as SplitMsg
  if (m?.type !== 'split') return
  split(m).catch((e) => parentPort.postMessage({ type: 'error', reqId: m.reqId, error: String((e as Error)?.message ?? e) }))
})
