// Search: keyword (FTS5), AI (CLAP text→audio fused with keyword via Reciprocal Rank Fusion), and "more like this".
import type { SearchQuery, SearchResult, Sound } from '@shared/types'
import type { LibraryDb } from './db'
import type { AiEngine } from './ai'

const RRF_K = 60
// Relevance cut-offs for CLAP cosine similarity (tuned on early tests; adjust with real libraries).
const AI_MIN_SCORE = 0.12 // absolute floor for text→audio matches
const AI_MAX_GAP = 0.25 // drop matches far below the best match
const SIMILAR_MIN_SCORE = 0.45 // audio→audio "more like this"

export async function search(db: LibraryDb, ai: AiEngine, q: SearchQuery): Promise<SearchResult> {
  const t0 = performance.now()
  const limit = Math.min(q.limit ?? 2000, 5000)
  const done = (r: Omit<SearchResult, 'tookMs'>): SearchResult => ({ ...r, tookMs: Math.round(performance.now() - t0) })

  // "More like this"
  if (q.similarTo) {
    if (!ai.ready) return done({ items: [], total: 0, modeUsed: 'similar', note: 'Install the AI model to find similar sounds.' })
    const v = ai.vectorFor(q.similarTo)
    if (!v) return done({ items: [], total: 0, modeUsed: 'similar', note: 'This sound has not been analysed yet.' })
    const hits = ai.nearest(v, 200, db.filteredIds(q), q.similarTo).filter((h) => h.score >= SIMILAR_MIN_SCORE)
    return done({
      items: hydrate(db, hits),
      total: hits.length,
      modeUsed: 'similar',
      note: hits.length ? undefined : 'No similar sounds found in your library yet.'
    })
  }

  const text = q.text.trim()
  if (q.mode === 'ai' && text) {
    if (!ai.ready) {
      const r = db.keywordSearch(q, limit)
      return done({ ...r, modeUsed: 'keyword', note: 'AI model not installed: showing keyword results.' })
    }
    const qv = await ai.embedText(text)
    if (!qv) {
      const r = db.keywordSearch(q, limit)
      return done({ ...r, modeUsed: 'keyword', note: 'AI is busy: showing keyword results.' })
    }
    const allowed = db.filteredIds(q)
    const raw = ai.nearest(qv, 300, allowed)
    const best = raw[0]?.score ?? 0
    const vec = raw.filter((h) => h.score >= Math.max(AI_MIN_SCORE, best - AI_MAX_GAP))
    const kw = db.keywordIds(text, 300).filter((id) => !allowed || allowed.has(id))
    if (!vec.length && !kw.length)
      return done({ items: [], total: 0, modeUsed: 'ai', note: 'No close AI matches. Try describing the sound differently.' })
    const fused = new Map<number, number>()
    vec.forEach((h, i) => fused.set(h.id, (fused.get(h.id) ?? 0) + 1 / (RRF_K + i + 1)))
    kw.forEach((id, i) => fused.set(id, (fused.get(id) ?? 0) + 1 / (RRF_K + i + 1)))
    const ranked = [...fused.entries()].sort((a, b) => b[1] - a[1]).map(([id, score]) => ({ id, score }))
    const items = hydrate(db, ranked)
    return done({ items, total: items.length, modeUsed: 'ai' })
  }

  const r = db.keywordSearch(q, limit)
  return done({ ...r, modeUsed: text ? 'keyword' : 'browse' })
}

function hydrate(db: LibraryDb, hits: Array<{ id: number; score: number }>): Sound[] {
  const map = db.getSoundsByIds(hits.map((h) => h.id))
  const out: Sound[] = []
  for (const h of hits) {
    const s = map.get(h.id)
    if (s) out.push({ ...s, score: h.score })
  }
  return out
}
