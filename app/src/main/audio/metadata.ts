// Extracts technical + descriptive metadata for one audio file and builds its search text.
import { basename, extname } from 'node:path'
import { readRiffMetadata } from './riff'
import type { SoundUpsert } from '../db'

export const AUDIO_EXTS = new Set(['wav', 'wave', 'bwf', 'aif', 'aiff', 'aifc', 'flac', 'mp3', 'ogg', 'oga', 'opus', 'm4a', 'aac'])
export const RIFF_EXTS = ['wav', 'wave', 'bwf', 'aif', 'aiff', 'aifc']

type MusicMetadata = typeof import('music-metadata')
let mm: Promise<MusicMetadata> | null = null
const loadMm = (): Promise<MusicMetadata> => (mm ??= import('music-metadata'))

/** UCS filenames start with a CatID such as "DOORWood" or "AMBForst" followed by "_". */
export function parseUcs(name: string): string | null {
  const m = name.match(/^([A-Z]{2,6}[A-Z][a-z]{1,12})_/)
  return m ? m[1] : null
}

/** "DOORWood_Slam Heavy-01" → "DOORWood DOOR Wood Slam Heavy 01" so prefix search finds parts. */
export function expandName(name: string): string {
  const parts = name.split(/[_\-.\s()[\]{}]+/).filter(Boolean)
  const out: string[] = []
  for (const p of parts) {
    out.push(p)
    const split = p
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([A-Za-z])(\d)/g, '$1 $2')
      .replace(/(\d)([A-Za-z])/g, '$1 $2')
    if (split !== p) out.push(split)
  }
  return out.join(' ')
}

const clean = (s: unknown): string | null => {
  if (typeof s !== 'string') return null
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length ? t.slice(0, 2000) : null
}

export async function extractMetadata(
  absPath: string,
  rootId: number,
  relPath: string,
  sizeBytes: number,
  mtimeMs: number
): Promise<SoundUpsert> {
  const ext = extname(absPath).slice(1).toLowerCase()
  const filename = basename(absPath)
  const stem = filename.slice(0, filename.length - ext.length - 1)
  const meta: Record<string, unknown> = {}
  let durationMs: number | null = null
  let sampleRate: number | null = null
  let bitDepth: number | null = null
  let channels: number | null = null
  let description: string | null = null
  let keywords: string | null = null

  if (RIFF_EXTS.includes(ext)) {
    const r = readRiffMetadata(absPath)
    if (r) {
      durationMs = r.durationMs
      if (r.layout) {
        sampleRate = r.layout.sampleRate
        bitDepth = r.layout.bitsPerSample
        channels = r.layout.channels
        meta.container = r.layout.container
        meta.float = r.layout.formatTag === 3
      }
      if (r.bext) meta.bext = r.bext
      if (r.ixml) meta.ixml = r.ixml
      if (r.info) meta.info = r.info
      if (r.aiffName) meta.aiffName = r.aiffName
      description =
        clean(r.bext?.description) ?? clean(r.info?.ICMT) ?? clean(r.ixml?.note) ?? clean(r.aiffAnnotation) ?? null
      keywords = clean(r.info?.IKEY) ?? null
      if (r.info?.INAM) meta.title = r.info.INAM
    }
  } else {
    try {
      const { parseFile } = await loadMm()
      const m = await parseFile(absPath, { duration: false, skipCovers: true })
      durationMs = m.format.duration ? Math.round(m.format.duration * 1000) : null
      sampleRate = m.format.sampleRate ?? null
      bitDepth = m.format.bitsPerSample ?? null
      channels = m.format.numberOfChannels ?? null
      meta.codec = m.format.codec
      meta.bitrate = m.format.bitrate
      if (m.common.title) meta.title = m.common.title
      if (m.common.artist) meta.artist = m.common.artist
      if (m.common.genre?.length) meta.genre = m.common.genre
      const comment = m.common.comment?.[0]
      description = clean(typeof comment === 'string' ? comment : (comment as { text?: string } | undefined)?.text)
    } catch (e) {
      meta.parseError = String((e as Error).message ?? e).slice(0, 200)
    }
  }

  const ucsCat = parseUcs(stem)
  const folders = relPath.split('/').slice(0, -1).join(' ')
  const searchText = [
    expandName(stem),
    expandName(folders),
    description ?? '',
    keywords ?? '',
    (meta.title as string) ?? '',
    ucsCat ?? '',
    ext,
    channels === 1 ? 'mono' : channels === 2 ? 'stereo' : channels && channels > 2 ? 'multichannel surround' : ''
  ]
    .join(' ')
    .slice(0, 8000)

  return {
    rootId,
    relPath,
    filename,
    ext,
    sizeBytes,
    mtimeMs,
    durationMs,
    sampleRate,
    bitDepth,
    channels,
    description,
    ucsCat,
    keywords,
    metaJson: Object.keys(meta).length ? JSON.stringify(meta) : null,
    searchText
  }
}
