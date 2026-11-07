// Minimal, dependency-free readers for WAV/BWF/RF64 and AIFF/AIFC files.
// Only headers and small metadata chunks are read; audio data is located by offset
// so callers can stream it without loading the whole file into memory.
import { openSync, readSync, closeSync, fstatSync } from 'node:fs'

export interface PcmLayout {
  container: 'wav' | 'aiff'
  formatTag: number // 1 = PCM int, 3 = IEEE float (WAV semantics; AIFF mapped to these)
  channels: number
  sampleRate: number
  bitsPerSample: number
  blockAlign: number
  dataOffset: number
  dataBytes: number
  bigEndian: boolean
}

export interface RiffMetadata {
  layout: PcmLayout | null
  durationMs: number | null
  bext?: {
    description: string
    originator: string
    originatorReference: string
    originationDate: string
    originationTime: string
    timeReference: number
    codingHistory?: string
  }
  ixml?: Record<string, string>
  ixmlRaw?: string
  info?: Record<string, string>
  aiffName?: string
  aiffAnnotation?: string
}

const MAX_TEXT_CHUNK = 256 * 1024

function readAt(fd: number, pos: number, len: number): Buffer {
  const buf = Buffer.alloc(len)
  const n = readSync(fd, buf, 0, len, pos)
  return n === len ? buf : buf.subarray(0, n)
}

function cstr(buf: Buffer, start: number, end: number): string {
  const slice = buf.subarray(start, Math.min(end, buf.length))
  const zero = slice.indexOf(0)
  return (zero >= 0 ? slice.subarray(0, zero) : slice).toString('latin1').trim()
}

function parseIxml(xml: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const tag of ['PROJECT', 'SCENE', 'TAKE', 'TAPE', 'NOTE', 'CIRCLED', 'FILE_UID']) {
    const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'))
    if (m && m[1].trim()) out[tag.toLowerCase()] = m[1].trim()
  }
  const names = [...xml.matchAll(/<NAME>([\s\S]*?)<\/NAME>/gi)].map((m) => m[1].trim()).filter(Boolean)
  if (names.length) out.track_names = names.join(', ')
  return out
}

// 80-bit IEEE 754 extended float (AIFF sample rate)
function readExtended(buf: Buffer, off: number): number {
  const exp = ((buf[off] & 0x7f) << 8) | buf[off + 1]
  const hi = buf.readUInt32BE(off + 2)
  const lo = buf.readUInt32BE(off + 6)
  if (exp === 0 && hi === 0 && lo === 0) return 0
  const sign = buf[off] & 0x80 ? -1 : 1
  return sign * (hi * 2 ** (exp - 16383 - 31) + lo * 2 ** (exp - 16383 - 63))
}

function parseWav(fd: number, size: number, head: Buffer): RiffMetadata {
  const isRf64 = head.toString('latin1', 0, 4) === 'RF64' || head.toString('latin1', 0, 4) === 'BW64'
  const meta: RiffMetadata = { layout: null, durationMs: null }
  let fmt: Omit<PcmLayout, 'dataOffset' | 'dataBytes' | 'container' | 'bigEndian'> | null = null
  let dataOffset = -1
  let dataBytes = 0
  let ds64DataSize: number | null = null
  let pos = 12
  let guard = 0
  while (pos + 8 <= size && guard++ < 10000) {
    const h = readAt(fd, pos, 8)
    if (h.length < 8) break
    const id = h.toString('latin1', 0, 4)
    let len = h.readUInt32LE(4)
    const body = pos + 8
    if (id === 'ds64') {
      const b = readAt(fd, body, Math.min(len, 28))
      if (b.length >= 24) ds64DataSize = Number(b.readBigUInt64LE(8))
    } else if (id === 'fmt ') {
      const b = readAt(fd, body, Math.min(len, 40))
      let formatTag = b.readUInt16LE(0)
      if (formatTag === 0xfffe && b.length >= 26) formatTag = b.readUInt16LE(24) // WAVE_FORMAT_EXTENSIBLE subformat
      fmt = {
        formatTag,
        channels: b.readUInt16LE(2),
        sampleRate: b.readUInt32LE(4),
        blockAlign: b.readUInt16LE(12),
        bitsPerSample: b.readUInt16LE(14)
      }
    } else if (id === 'data') {
      dataOffset = body
      if ((isRf64 && len === 0xffffffff) || len === 0xffffffff) len = ds64DataSize ?? size - body
      dataBytes = Math.min(len, size - body)
    } else if (id === 'bext' && len >= 346) {
      const b = readAt(fd, body, Math.min(len, MAX_TEXT_CHUNK))
      const lowRef = b.readUInt32LE(338)
      const highRef = b.readUInt32LE(342)
      meta.bext = {
        description: cstr(b, 0, 256),
        originator: cstr(b, 256, 288),
        originatorReference: cstr(b, 288, 320),
        originationDate: cstr(b, 320, 330),
        originationTime: cstr(b, 330, 338),
        timeReference: highRef * 2 ** 32 + lowRef,
        codingHistory: b.length > 602 ? cstr(b, 602, b.length) || undefined : undefined
      }
    } else if (id === 'iXML') {
      const xml = readAt(fd, body, Math.min(len, MAX_TEXT_CHUNK)).toString('utf8')
      meta.ixmlRaw = xml.slice(0, 32 * 1024)
      meta.ixml = parseIxml(xml)
    } else if (id === 'LIST') {
      const b = readAt(fd, body, Math.min(len, MAX_TEXT_CHUNK))
      if (b.toString('latin1', 0, 4) === 'INFO') {
        const info: Record<string, string> = {}
        let p = 4
        while (p + 8 <= b.length) {
          const sid = b.toString('latin1', p, p + 4)
          const slen = b.readUInt32LE(p + 4)
          info[sid] = cstr(b, p + 8, p + 8 + slen)
          p += 8 + slen + (slen & 1)
        }
        meta.info = info
      }
    }
    if (len === 0xffffffff) break
    pos = body + len + (len & 1)
  }
  if (fmt && dataOffset > 0) {
    meta.layout = { ...fmt, container: 'wav', dataOffset, dataBytes, bigEndian: false }
    if (fmt.blockAlign > 0 && fmt.sampleRate > 0)
      meta.durationMs = Math.round((dataBytes / fmt.blockAlign / fmt.sampleRate) * 1000)
  }
  return meta
}

function parseAiff(fd: number, size: number, head: Buffer): RiffMetadata {
  const isAifc = head.toString('latin1', 8, 12) === 'AIFC'
  const meta: RiffMetadata = { layout: null, durationMs: null }
  let channels = 0
  let frames = 0
  let bits = 0
  let rate = 0
  let formatTag = 1
  let bigEndian = true
  let supported = true
  let dataOffset = -1
  let dataBytes = 0
  let pos = 12
  let guard = 0
  while (pos + 8 <= size && guard++ < 10000) {
    const h = readAt(fd, pos, 8)
    if (h.length < 8) break
    const id = h.toString('latin1', 0, 4)
    const len = h.readUInt32BE(4)
    const body = pos + 8
    if (id === 'COMM') {
      const b = readAt(fd, body, Math.min(len, 64))
      channels = b.readUInt16BE(0)
      frames = b.readUInt32BE(2)
      bits = b.readUInt16BE(6)
      rate = readExtended(b, 8)
      if (isAifc && b.length >= 22) {
        const comp = b.toString('latin1', 18, 22)
        if (comp === 'sowt') bigEndian = false
        else if (comp === 'fl32' || comp === 'FL32') formatTag = 3
        else if (comp !== 'NONE' && comp !== 'twos') supported = false
      }
    } else if (id === 'SSND') {
      const b = readAt(fd, body, 8)
      const offset = b.readUInt32BE(0)
      dataOffset = body + 8 + offset
      dataBytes = Math.min(len - 8 - offset, size - dataOffset)
    } else if (id === 'NAME') {
      meta.aiffName = readAt(fd, body, Math.min(len, 4096)).toString('latin1').replace(/\0/g, '').trim()
    } else if (id === 'ANNO') {
      meta.aiffAnnotation = readAt(fd, body, Math.min(len, 8192)).toString('latin1').replace(/\0/g, '').trim()
    }
    pos = body + len + (len & 1)
  }
  if (channels > 0 && rate > 0 && dataOffset > 0) {
    meta.durationMs = Math.round((frames / rate) * 1000)
    if (supported) {
      const blockAlign = channels * Math.ceil(bits / 8)
      meta.layout = {
        container: 'aiff',
        formatTag,
        channels,
        sampleRate: Math.round(rate),
        bitsPerSample: bits,
        blockAlign,
        dataOffset,
        dataBytes: Math.min(dataBytes, frames * blockAlign),
        bigEndian
      }
    }
  }
  return meta
}

/** Reads container metadata for WAV/BWF/RF64/AIFF/AIFC. Returns null for other formats. */
export function readRiffMetadata(path: string): RiffMetadata | null {
  const fd = openSync(path, 'r')
  try {
    const size = fstatSync(fd).size
    const head = readAt(fd, 0, 12)
    if (head.length < 12) return null
    const magic = head.toString('latin1', 0, 4)
    if ((magic === 'RIFF' || magic === 'RF64' || magic === 'BW64') && head.toString('latin1', 8, 12) === 'WAVE')
      return parseWav(fd, size, head)
    if (magic === 'FORM') {
      const t = head.toString('latin1', 8, 12)
      if (t === 'AIFF' || t === 'AIFC') return parseAiff(fd, size, head)
    }
    return null
  } finally {
    closeSync(fd)
  }
}

/** Decodes interleaved PCM bytes to a mono float array (channel average). */
export function decodeToMono(buf: Buffer, layout: PcmLayout, out?: Float32Array): Float32Array {
  const { channels, bitsPerSample: bits, formatTag, bigEndian } = layout
  const bytes = Math.ceil(bits / 8)
  const frames = Math.floor(buf.length / (bytes * channels))
  const res = out && out.length >= frames ? out : new Float32Array(frames)
  let o = 0
  for (let f = 0; f < frames; f++) {
    let sum = 0
    for (let c = 0; c < channels; c++) {
      const p = (f * channels + c) * bytes
      let v: number
      if (formatTag === 3) {
        v = bits === 64 ? (bigEndian ? buf.readDoubleBE(p) : buf.readDoubleLE(p)) : bigEndian ? buf.readFloatBE(p) : buf.readFloatLE(p)
      } else if (bytes === 1) {
        v = layout.container === 'wav' ? (buf[p] - 128) / 128 : buf.readInt8(p) / 128
      } else if (bytes === 2) {
        v = (bigEndian ? buf.readInt16BE(p) : buf.readInt16LE(p)) / 32768
      } else if (bytes === 3) {
        v = (bigEndian ? buf.readIntBE(p, 3) : buf.readIntLE(p, 3)) / 8388608
      } else {
        v = (bigEndian ? buf.readInt32BE(p) : buf.readInt32LE(p)) / 2147483648
      }
      sum += v
    }
    res[o++] = sum / channels
  }
  return o === res.length ? res : res.subarray(0, o)
}

/** Converts an AIFF file into an in-memory little-endian WAV so Chromium can play it. */
export function aiffToWav(path: string, layout: PcmLayout): Buffer {
  const fd = openSync(path, 'r')
  try {
    const data = readAt(fd, layout.dataOffset, layout.dataBytes)
    const bytes = Math.ceil(layout.bitsPerSample / 8)
    if (layout.bigEndian && bytes > 1) {
      for (let p = 0; p + bytes <= data.length; p += bytes) data.subarray(p, p + bytes).reverse()
    }
    if (bytes === 1) for (let p = 0; p < data.length; p++) data[p] = (data[p] + 128) & 0xff // signed → unsigned 8-bit
    const header = Buffer.alloc(44)
    header.write('RIFF', 0, 'latin1')
    header.writeUInt32LE(36 + data.length, 4)
    header.write('WAVE', 8, 'latin1')
    header.write('fmt ', 12, 'latin1')
    header.writeUInt32LE(16, 16)
    header.writeUInt16LE(layout.formatTag, 20)
    header.writeUInt16LE(layout.channels, 22)
    header.writeUInt32LE(layout.sampleRate, 24)
    header.writeUInt32LE(layout.sampleRate * layout.channels * bytes, 28)
    header.writeUInt16LE(layout.channels * bytes, 32)
    header.writeUInt16LE(bytes * 8, 34)
    header.write('data', 36, 'latin1')
    header.writeUInt32LE(data.length, 40)
    return Buffer.concat([header, data])
  } finally {
    closeSync(fd)
  }
}

export { readAt }
