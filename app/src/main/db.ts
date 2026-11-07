// Local library database (SQLite built into Electron's Node runtime, with FTS5 for keyword search).
import { DatabaseSync, type StatementSync } from 'node:sqlite'
import type { LibraryRoot, SearchQuery, Sound, SoundDetail } from '@shared/types'

export interface SoundRow {
  id: number
  root_id: number
  rel_path: string
  filename: string
  ext: string
  size_bytes: number
  mtime_ms: number
  duration_ms: number | null
  sample_rate: number | null
  bit_depth: number | null
  channels: number | null
  description: string | null
  ucs_cat: string | null
  keywords: string | null
  meta_json: string | null
  favorite: number
  has_emb?: number
  root_path?: string
}

export interface SoundUpsert {
  rootId: number
  relPath: string
  filename: string
  ext: string
  sizeBytes: number
  mtimeMs: number
  durationMs: number | null
  sampleRate: number | null
  bitDepth: number | null
  channels: number | null
  description: string | null
  ucsCat: string | null
  keywords: string | null
  metaJson: string | null
  searchText: string
}

const SCHEMA = `
pragma journal_mode = wal;
pragma synchronous = normal;
pragma foreign_keys = on;
create table if not exists library_root (
  id integer primary key, path text unique not null, label text,
  added_at text default (datetime('now')), online integer not null default 1);
create table if not exists sound (
  id integer primary key,
  root_id integer not null references library_root(id) on delete cascade,
  rel_path text not null, filename text not null, ext text not null,
  size_bytes integer, mtime_ms integer, duration_ms integer, sample_rate integer,
  bit_depth integer, channels integer, description text, ucs_cat text, keywords text,
  meta_json text, favorite integer not null default 0, search_text text,
  unique (root_id, rel_path));
create index if not exists sound_root on sound(root_id);
create virtual table if not exists sound_fts using fts5(
  search_text, content='sound', content_rowid='id', tokenize = 'unicode61 remove_diacritics 2');
create trigger if not exists sound_ai after insert on sound begin
  insert into sound_fts(rowid, search_text) values (new.id, new.search_text); end;
create trigger if not exists sound_ad after delete on sound begin
  insert into sound_fts(sound_fts, rowid, search_text) values ('delete', old.id, old.search_text); end;
create trigger if not exists sound_au after update of search_text on sound begin
  insert into sound_fts(sound_fts, rowid, search_text) values ('delete', old.id, old.search_text);
  insert into sound_fts(rowid, search_text) values (new.id, new.search_text); end;
create table if not exists embedding (
  sound_id integer primary key references sound(id) on delete cascade,
  model text not null, vec blob not null);
create table if not exists setting (key text primary key, value text);
`

const SOUND_COLS = `s.id, s.root_id, s.rel_path, s.filename, s.ext, s.size_bytes, s.duration_ms, s.sample_rate,
  s.bit_depth, s.channels, s.description, s.ucs_cat, s.favorite,
  exists(select 1 from embedding e where e.sound_id = s.id) as has_emb`

export function toSound(r: SoundRow): Sound {
  return {
    id: r.id,
    rootId: r.root_id,
    relPath: r.rel_path,
    filename: r.filename,
    ext: r.ext,
    sizeBytes: r.size_bytes,
    durationMs: r.duration_ms,
    sampleRate: r.sample_rate,
    bitDepth: r.bit_depth,
    channels: r.channels,
    description: r.description,
    ucsCat: r.ucs_cat,
    favorite: !!r.favorite,
    hasEmbedding: !!r.has_emb
  }
}

/** Turns free text into a safe FTS5 query: every word must match as a prefix. */
export function ftsQuery(text: string): string | null {
  const words = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 0)
    .slice(0, 12)
  if (!words.length) return null
  return words.map((w) => `"${w.replace(/"/g, '')}"*`).join(' ')
}

export class LibraryDb {
  readonly db: DatabaseSync
  private stmts = new Map<string, StatementSync>()

  constructor(file: string) {
    this.db = new DatabaseSync(file)
    this.db.exec(SCHEMA)
  }

  private st(sql: string): StatementSync {
    let s = this.stmts.get(sql)
    if (!s) {
      s = this.db.prepare(sql)
      this.stmts.set(sql, s)
    }
    return s
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('begin')
    try {
      const r = fn()
      this.db.exec('commit')
      return r
    } catch (e) {
      this.db.exec('rollback')
      throw e
    }
  }

  // ---- roots
  listRoots(): LibraryRoot[] {
    const rows = this.st(
      `select r.id, r.path, r.label, r.online, (select count(*) from sound s where s.root_id = r.id) as count
       from library_root r order by r.label collate nocase`
    ).all() as unknown as Array<{ id: number; path: string; label: string; online: number; count: number }>
    return rows.map((r) => ({ ...r, online: !!r.online }))
  }
  addRoot(path: string, label: string): number {
    const existing = this.st('select id from library_root where path = ?').get(path) as { id: number } | undefined
    if (existing) return existing.id
    return Number(this.st('insert into library_root(path, label) values (?, ?)').run(path, label).lastInsertRowid)
  }
  removeRoot(id: number): void {
    this.st('delete from library_root where id = ?').run(id)
  }
  setRootOnline(id: number, online: boolean): void {
    this.st('update library_root set online = ? where id = ?').run(online ? 1 : 0, id)
  }
  getRoot(id: number): { id: number; path: string; label: string } | undefined {
    return this.st('select id, path, label from library_root where id = ?').get(id) as never
  }

  // ---- sounds
  existingStamps(rootId: number): Map<string, { id: number; size: number; mtime: number }> {
    const rows = this.st('select id, rel_path, size_bytes, mtime_ms from sound where root_id = ?').all(rootId) as unknown as Array<{
      id: number
      rel_path: string
      size_bytes: number
      mtime_ms: number
    }>
    const m = new Map<string, { id: number; size: number; mtime: number }>()
    for (const r of rows) m.set(r.rel_path, { id: r.id, size: r.size_bytes, mtime: r.mtime_ms })
    return m
  }
  upsertSound(s: SoundUpsert): number {
    const r = this.st(
      `insert into sound (root_id, rel_path, filename, ext, size_bytes, mtime_ms, duration_ms, sample_rate, bit_depth,
         channels, description, ucs_cat, keywords, meta_json, search_text)
       values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       on conflict(root_id, rel_path) do update set filename=excluded.filename, ext=excluded.ext,
         size_bytes=excluded.size_bytes, mtime_ms=excluded.mtime_ms, duration_ms=excluded.duration_ms,
         sample_rate=excluded.sample_rate, bit_depth=excluded.bit_depth, channels=excluded.channels,
         description=excluded.description, ucs_cat=excluded.ucs_cat, keywords=excluded.keywords,
         meta_json=excluded.meta_json, search_text=excluded.search_text
       returning id`
    ).get(
      s.rootId, s.relPath, s.filename, s.ext, s.sizeBytes, s.mtimeMs, s.durationMs, s.sampleRate, s.bitDepth,
      s.channels, s.description, s.ucsCat, s.keywords, s.metaJson, s.searchText
    ) as { id: number }
    // A changed file needs a fresh embedding.
    this.st('delete from embedding where sound_id = ?').run(r.id)
    return r.id
  }
  deleteSounds(ids: number[]): void {
    const del = this.st('delete from sound where id = ?')
    for (const id of ids) del.run(id)
  }
  countSounds(): number {
    return (this.st('select count(*) as n from sound').get() as { n: number }).n
  }
  getSoundRow(id: number): SoundRow | undefined {
    return this.st(
      `select s.*, r.path as root_path, exists(select 1 from embedding e where e.sound_id = s.id) as has_emb
       from sound s join library_root r on r.id = s.root_id where s.id = ?`
    ).get(id) as unknown as SoundRow | undefined
  }
  getSoundsByIds(ids: number[]): Map<number, Sound> {
    const out = new Map<number, Sound>()
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500)
      const rows = this.db
        .prepare(`select ${SOUND_COLS} from sound s where s.id in (${chunk.map(() => '?').join(',')})`)
        .all(...chunk) as unknown as SoundRow[]
      for (const r of rows) out.set(r.id, toSound(r))
    }
    return out
  }
  getDetail(id: number): SoundDetail | null {
    const r = this.getSoundRow(id)
    if (!r) return null
    let metadata: Record<string, unknown> = {}
    try {
      metadata = r.meta_json ? JSON.parse(r.meta_json) : {}
    } catch {
      /* ignore malformed */
    }
    const sep = r.root_path!.includes('\\') ? '\\' : '/'
    return {
      ...toSound(r),
      path: r.root_path + sep + r.rel_path.split('/').join(sep),
      rootPath: r.root_path!,
      metadata
    }
  }
  /** Library id of a file given its absolute path (null if it is not indexed yet). */
  findSoundIdByPath(absPath: string): number | null {
    const norm = (p: string): string => p.replace(/\\/g, '/').replace(/\/+$/, '')
    const target = norm(absPath)
    const ci = process.platform === 'win32' || process.platform === 'darwin'
    for (const r of this.listRoots()) {
      const root = norm(r.path)
      const a = ci ? target.toLowerCase() : target
      const b = ci ? root.toLowerCase() : root
      if (!a.startsWith(b + '/')) continue
      const rel = target.slice(root.length + 1)
      const row = this.st(
        ci ? 'select id from sound where root_id = ? and rel_path = ? collate nocase' : 'select id from sound where root_id = ? and rel_path = ?'
      ).get(r.id, rel) as { id: number } | undefined
      if (row) return row.id
    }
    return null
  }

  setFavorite(id: number, fav: boolean): void {
    this.st('update sound set favorite = ? where id = ?').run(fav ? 1 : 0, id)
  }

  // ---- search
  private filterSql(q: SearchQuery, params: unknown[]): string {
    const where: string[] = []
    if (q.rootId) {
      where.push('s.root_id = ?')
      params.push(q.rootId)
    }
    if (q.favoritesOnly) where.push('s.favorite = 1')
    if (q.maxDurationMs) {
      where.push('s.duration_ms <= ?')
      params.push(q.maxDurationMs)
    }
    if (q.channels) {
      where.push(q.channels >= 3 ? 's.channels >= 3' : 's.channels = ?')
      if (q.channels < 3) params.push(q.channels)
    }
    return where.length ? ' and ' + where.join(' and ') : ''
  }

  private orderSql(q: SearchQuery, hasFts: boolean): string {
    switch (q.sort) {
      case 'name':
        return 'order by s.filename collate nocase'
      case 'duration':
        return 'order by s.duration_ms'
      case 'folder':
        return 'order by s.rel_path collate nocase'
      default:
        return hasFts ? 'order by bm25(sound_fts)' : 'order by s.rel_path collate nocase'
    }
  }

  keywordSearch(q: SearchQuery, limit: number): { items: Sound[]; total: number } {
    const fts = ftsQuery(q.text)
    const params: unknown[] = []
    let base: string
    if (fts) {
      params.push(fts)
      base = `from sound_fts join sound s on s.id = sound_fts.rowid where sound_fts match ?`
    } else {
      base = `from sound s where 1 = 1`
    }
    base += this.filterSql(q, params)
    const total = (this.db.prepare(`select count(*) as n ${base}`).get(...(params as never[])) as { n: number }).n
    const rows = this.db
      .prepare(`select ${SOUND_COLS} ${base} ${this.orderSql(q, !!fts)} limit ?`)
      .all(...(params as never[]), limit) as unknown as SoundRow[]
    return { items: rows.map(toSound), total }
  }

  /** Ids allowed by the filters (used to restrict AI similarity results). */
  filteredIds(q: SearchQuery): Set<number> | null {
    const params: unknown[] = []
    const f = this.filterSql(q, params)
    if (!f) return null
    const rows = this.db.prepare(`select s.id from sound s where 1 = 1 ${f}`).all(...(params as never[])) as unknown as Array<{ id: number }>
    return new Set(rows.map((r) => r.id))
  }

  /** Ranked ids for keyword match, for hybrid fusion with AI results. */
  keywordIds(text: string, limit: number): number[] {
    const fts = ftsQuery(text)
    if (!fts) return []
    const rows = this.st(
      `select rowid as id from sound_fts where sound_fts match ? order by bm25(sound_fts) limit ?`
    ).all(fts, limit) as unknown as Array<{ id: number }>
    return rows.map((r) => r.id)
  }

  // ---- embeddings
  allEmbeddings(model: string): Array<{ sound_id: number; vec: Uint8Array }> {
    return this.st('select sound_id, vec from embedding where model = ?').all(model) as never
  }
  saveEmbedding(id: number, model: string, vec: Float32Array): void {
    this.st('insert or replace into embedding(sound_id, model, vec) values (?, ?, ?)').run(
      id,
      model,
      new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength)
    )
  }
  pendingEmbeddingIds(exts: string[], limit: number): Array<{ id: number }> {
    return this.db
      .prepare(
        `select s.id from sound s join library_root r on r.id = s.root_id
         where r.online = 1 and s.ext in (${exts.map(() => '?').join(',')})
           and not exists (select 1 from embedding e where e.sound_id = s.id)
           and coalesce(json_extract(s.meta_json, '$.aiFailed'), 0) = 0
         order by s.id limit ?`
      )
      .all(...exts, limit) as never
  }
  countPendingEmbeddings(exts: string[]): number {
    return (
      this.db
        .prepare(
          `select count(*) as n from sound s join library_root r on r.id = s.root_id
           where r.online = 1 and s.ext in (${exts.map(() => '?').join(',')})
             and not exists (select 1 from embedding e where e.sound_id = s.id)
             and coalesce(json_extract(s.meta_json, '$.aiFailed'), 0) = 0`
        )
        .get(...exts) as { n: number }
    ).n
  }
  markAiFailed(id: number): void {
    this.st(`update sound set meta_json = json_set(coalesce(meta_json, '{}'), '$.aiFailed', 1) where id = ?`).run(id)
  }
  countEmbeddings(model: string): number {
    return (this.st('select count(*) as n from embedding where model = ?').get(model) as { n: number }).n
  }

  getSetting(key: string): string | undefined {
    return (this.st('select value from setting where key = ?').get(key) as { value: string } | undefined)?.value
  }
  setSetting(key: string, value: string): void {
    this.st('insert or replace into setting(key, value) values (?, ?)').run(key, value)
  }

  close(): void {
    this.db.close()
  }
}
