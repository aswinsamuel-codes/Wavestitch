// Serves indexed audio files to the UI through the private "aos://" protocol (with HTTP range support).
// Only files that exist in the library database can be served, never arbitrary paths.
import { protocol } from 'electron'
import { open, stat } from 'node:fs/promises'
import type { LibraryDb } from './db'
import { aiffToWav, readRiffMetadata } from './audio/riff'

const CHUNK = 8 * 1024 * 1024 // max bytes for an open-ended range response
const MAX_FULL = 512 * 1024 * 1024 // max bytes for a non-range (full) response

async function readRange(path: string, start: number, end: number): Promise<Uint8Array<ArrayBuffer>> {
  const fh = await open(path, 'r')
  try {
    const len = end - start + 1
    const buf = new Uint8Array(len)
    let off = 0
    while (off < len) {
      const { bytesRead } = await fh.read(buf, off, len - off, start + off)
      if (!bytesRead) break
      off += bytesRead
    }
    return off === len ? buf : buf.subarray(0, off)
  } finally {
    await fh.close()
  }
}

const MIME: Record<string, string> = {
  wav: 'audio/wav', wave: 'audio/wav', bwf: 'audio/wav', mp3: 'audio/mpeg', flac: 'audio/flac',
  ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac',
  aif: 'audio/wav', aiff: 'audio/wav', aifc: 'audio/wav' // AIFF is converted to WAV on the fly
}

export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'aos', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }
  ])
}

const converted = new Map<number, Buffer>() // small cache of AIFF→WAV conversions

function rangeResponse(total: number, rangeHeader: string | null, type: string, body: (s: number, e: number) => Uint8Array<ArrayBuffer>): Response {
  const m = rangeHeader?.match(/bytes=(\d*)-(\d*)/)
  if (m && (m[1] || m[2])) {
    let start = m[1] ? parseInt(m[1], 10) : total - parseInt(m[2], 10)
    let end = m[1] && m[2] ? parseInt(m[2], 10) : total - 1
    start = Math.max(0, start)
    end = Math.min(end, total - 1)
    if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } })
    return new Response(body(start, end), {
      status: 206,
      headers: {
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Content-Length': String(end - start + 1)
      }
    })
  }
  return new Response(body(0, total - 1), {
    status: 200,
    headers: { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': String(total) }
  })
}

export function handleMediaProtocol(db: LibraryDb): void {
  protocol.handle('aos', async (req) => {
    const url = new URL(req.url)
    const id = Number(url.pathname.replace(/^\//, ''))
    if (url.hostname !== 'sound' || !Number.isInteger(id)) return new Response('Not found', { status: 404 })
    let d: ReturnType<LibraryDb['getDetail']>
    try {
      d = db.getDetail(id)
    } catch {
      return new Response('Unavailable', { status: 503 }) // database closing during shutdown
    }
    if (!d) return new Response('Not found', { status: 404 })
    const type = MIME[d.ext] ?? 'application/octet-stream'
    try {
      if (d.ext === 'aif' || d.ext === 'aiff' || d.ext === 'aifc') {
        let buf = converted.get(id)
        if (!buf) {
          const meta = readRiffMetadata(d.path)
          if (!meta?.layout) return new Response('Unsupported AIFF variant', { status: 415 })
          buf = aiffToWav(d.path, meta.layout)
          converted.set(id, buf)
          if (converted.size > 4) converted.delete(converted.keys().next().value!)
        }
        const b = buf
        return rangeResponse(b.length, req.headers.get('range'), type, (s, e) => new Uint8Array(b.subarray(s, e + 1)))
      }
      const { size } = await stat(d.path)
      const range = req.headers.get('range')
      const m = range?.match(/bytes=(\d*)-(\d*)/)
      let start = 0
      let end = size - 1
      let partial = false
      if (m && (m[1] || m[2])) {
        partial = true
        start = m[1] ? parseInt(m[1], 10) : Math.max(0, size - parseInt(m[2], 10))
        end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1
        // Open-ended range ("bytes=N-"): serve at most CHUNK; the media element asks again for more.
        if (!m[2] && end - start + 1 > CHUNK) end = start + CHUNK - 1
        if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
      } else if (size > MAX_FULL) {
        return new Response('File too large for a full read', { status: 413 })
      }
      const body = await readRange(d.path, start, end)
      const headers: Record<string, string> = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': String(body.length) }
      if (partial) headers['Content-Range'] = `bytes ${start}-${end}/${size}`
      return new Response(body, { status: partial ? 206 : 200, headers })
    } catch {
      return new Response('File unavailable', { status: 410 })
    }
  })
}
