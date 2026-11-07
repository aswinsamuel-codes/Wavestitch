// Streaming PCM helpers: waveform peaks and short analysis windows, without loading whole files.
import { openSync, closeSync } from 'node:fs'
import { readAt, decodeToMono, type PcmLayout } from './riff'

const CHUNK_FRAMES = 65536

/** Max-abs peaks of the mono mix in `buckets` columns (WaveSurfer mirrors them). */
export function computePeaks(path: string, layout: PcmLayout, buckets: number): number[] {
  const totalFrames = Math.floor(layout.dataBytes / layout.blockAlign)
  const peaks = new Array<number>(buckets).fill(0)
  if (totalFrames <= 0) return peaks
  const fd = openSync(path, 'r')
  try {
    const framesPerBucket = totalFrames / buckets
    // Very long files: sample a subset of frames per bucket to keep this fast.
    const stride = totalFrames > 20_000_000 ? Math.ceil(totalFrames / 20_000_000) : 1
    const scratch = new Float32Array(CHUNK_FRAMES)
    for (let start = 0; start < totalFrames; start += CHUNK_FRAMES * stride) {
      const frames = Math.min(CHUNK_FRAMES, totalFrames - start)
      const buf = readAt(fd, layout.dataOffset + start * layout.blockAlign, frames * layout.blockAlign)
      const mono = decodeToMono(buf, layout, scratch)
      const n = Math.floor(buf.length / layout.blockAlign)
      for (let i = 0; i < n; i++) {
        const b = Math.min(buckets - 1, Math.floor((start + i) / framesPerBucket))
        const v = Math.abs(mono[i])
        if (v > peaks[b]) peaks[b] = v
      }
    }
  } finally {
    closeSync(fd)
  }
  return peaks.map((v) => Math.round(v * 10000) / 10000)
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input
  const outLen = Math.floor((input.length * toRate) / fromRate)
  const out = new Float32Array(outLen)
  const ratio = fromRate / toRate
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio
    const i0 = Math.floor(x)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const t = x - i0
    out[i] = input[i0] * (1 - t) + input[i1] * t
  }
  return out
}

function rms(a: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * a[i]
  return Math.sqrt(s / Math.max(1, a.length))
}

/**
 * Returns up to `maxWindows` mono windows of `windowSec` seconds at `targetRate`,
 * evenly spread across the file and skipping near-silent ones.
 */
export function readAnalysisWindows(
  path: string,
  layout: PcmLayout,
  targetRate = 48000,
  windowSec = 10,
  maxWindows = 6
): Float32Array[] {
  const totalFrames = Math.floor(layout.dataBytes / layout.blockAlign)
  if (totalFrames <= 0) return []
  const winFrames = Math.min(totalFrames, Math.round(windowSec * layout.sampleRate))
  const count = Math.max(1, Math.min(maxWindows, Math.ceil(totalFrames / winFrames)))
  const fd = openSync(path, 'r')
  const out: Float32Array[] = []
  try {
    for (let w = 0; w < count; w++) {
      const start = count === 1 ? 0 : Math.round(((totalFrames - winFrames) * w) / (count - 1))
      const buf = readAt(fd, layout.dataOffset + start * layout.blockAlign, winFrames * layout.blockAlign)
      const mono = decodeToMono(buf, layout)
      if (count > 1 && rms(mono) < 0.0005) continue // ~ -66 dBFS: treat as silence
      out.push(resampleLinear(mono, layout.sampleRate, targetRate))
    }
  } finally {
    closeSync(fd)
  }
  return out
}
