// Types shared by the main process, preload bridge and renderer UI.

export interface Sound {
  id: number
  rootId: number
  relPath: string
  filename: string
  ext: string
  sizeBytes: number
  durationMs: number | null
  sampleRate: number | null
  bitDepth: number | null
  channels: number | null
  description: string | null
  ucsCat: string | null
  favorite: boolean
  hasEmbedding: boolean
  score?: number
}

export interface SoundDetail extends Sound {
  path: string
  rootPath: string
  metadata: Record<string, unknown>
}

export interface LibraryRoot {
  id: number
  path: string
  label: string
  online: boolean
  count: number
}

export type SearchMode = 'keyword' | 'ai'
export type SortKey = 'relevance' | 'name' | 'duration' | 'folder'

export interface SearchQuery {
  text: string
  mode: SearchMode
  rootId?: number | null
  favoritesOnly?: boolean
  maxDurationMs?: number | null
  channels?: number | null
  sort?: SortKey
  similarTo?: number | null
  limit?: number
}

export interface SearchResult {
  items: Sound[]
  total: number
  tookMs: number
  modeUsed: SearchMode | 'similar' | 'browse'
  note?: string
}

export interface IndexStatus {
  running: boolean
  phase: 'idle' | 'scanning' | 'embedding'
  scanned: number
  added: number
  failed: number
  current?: string
  totalSounds: number
}

export type AiState = 'not-installed' | 'loading' | 'downloading' | 'ready' | 'error'

export interface AiStatus {
  state: AiState
  message?: string
  embedded: number
  pending: number
  downloadMb?: number
}

export interface PeaksResult {
  peaks: number[][] | null
  durationSec: number | null
  decodeInBrowser: boolean
}

export type StemName = 'Vocals' | 'Drums' | 'Bass' | 'Other'

export interface StemFile {
  stem: StemName
  path: string
  sizeBytes: number
  /** Library id once the stem file has been indexed (null while indexing). */
  soundId?: number | null
}

export type StemState = 'not-installed' | 'downloading' | 'ready' | 'splitting' | 'error'

export interface StemStatus {
  state: StemState
  message?: string
  downloadMb?: number
  queue: number[]
  job?: { soundId: number; name: string; progress: number; phase: 'decoding' | 'separating'; etaSec?: number }
  lastDone?: { soundId: number; seconds: number }
}

export interface AppInfo {
  version: string
  platform: string
  dataDir: string
  stemsDir: string
}

export interface AosApi {
  info(): Promise<AppInfo>
  listRoots(): Promise<LibraryRoot[]>
  addRoots(): Promise<LibraryRoot[]>
  removeRoot(id: number): Promise<void>
  rescan(id?: number): Promise<void>
  search(q: SearchQuery): Promise<SearchResult>
  getSound(id: number): Promise<SoundDetail | null>
  getPeaks(id: number): Promise<PeaksResult>
  setFavorite(id: number, favorite: boolean): Promise<void>
  reveal(id: number): void
  startDrag(id: number): void
  indexStatus(): Promise<IndexStatus>
  aiStatus(): Promise<AiStatus>
  installAi(): Promise<AiStatus>
  stemsStatus(): Promise<StemStatus>
  installStems(): Promise<StemStatus>
  splitStems(id: number): Promise<StemStatus>
  getStems(id: number): Promise<StemFile[] | null>
  /** Drag stems of a sound into a DAW: one stem, or all of them when `stem` is omitted. */
  dragStems(id: number, stem?: StemName): void
  revealPath(path: string): void
  onStemsStatus(cb: (s: StemStatus) => void): () => void
  onIndexStatus(cb: (s: IndexStatus) => void): () => void
  onAiStatus(cb: (s: AiStatus) => void): () => void
  onLibraryChanged(cb: () => void): () => void
}
