import type { Sound } from '@shared/types'

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return '–'
  const total = ms / 1000
  if (total < 60) return `${total.toFixed(total < 10 ? 2 : 1)} s`
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  if (m < 60) return `${m}:${String(s).padStart(2, '0')}`
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function fmtClock(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.floor((sec % 1) * 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

export function fmtFormat(s: Pick<Sound, 'ext' | 'bitDepth' | 'sampleRate'>): string {
  const parts = [s.ext.toUpperCase()]
  if (s.bitDepth) parts.push(`${s.bitDepth}-bit`)
  if (s.sampleRate) parts.push(`${s.sampleRate % 1000 === 0 ? s.sampleRate / 1000 : (s.sampleRate / 1000).toFixed(1)} kHz`)
  return parts.join(' · ')
}

export function fmtChannels(n: number | null): string {
  if (!n) return '–'
  if (n === 1) return 'Mono'
  if (n === 2) return 'Stereo'
  return `${n} ch`
}

export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`
  return `${(b / 1073741824).toFixed(2)} GB`
}

export const nf = new Intl.NumberFormat()

export function stem(filename: string): string {
  const i = filename.lastIndexOf('.')
  return i > 0 ? filename.slice(0, i) : filename
}
