import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AiStatus,
  AppInfo,
  IndexStatus,
  LibraryRoot,
  SearchMode,
  SearchResult,
  SortKey,
  SoundDetail,
  StemFile,
  StemStatus
} from '@shared/types'
import { Sidebar, type Scope } from './components/Sidebar'
import { SoundList } from './components/SoundList'
import { Player, type PlayerHandle } from './components/Player'
import { Inspector } from './components/Inspector'
import { fmtChannels, fmtClock, fmtFormat, nf, stem } from './format'
import { timeStore, usePlayTime } from './timeStore'
import { Logo } from './components/Logo'
import { SessionView, type SessionHandle } from './components/SessionView'
import { STEM_COLORS } from './components/StemsPanel'
import { APP_NAME } from '@shared/brand'

const api = window.aos

/** Only this tiny component re-renders while audio plays. */
function LcdTime() {
  const t = usePlayTime(20)
  return <span className="lcd-time">{fmtClock(t)}</span>
}

const DURATIONS: Array<{ label: string; ms: number | null }> = [
  { label: 'Any length', ms: null },
  { label: '≤ 1 s', ms: 1000 },
  { label: '≤ 5 s', ms: 5000 },
  { label: '≤ 30 s', ms: 30000 },
  { label: '≤ 2 min', ms: 120000 }
]
const CHANNELS: Array<{ label: string; n: number | null }> = [
  { label: 'Any', n: null },
  { label: 'Mono', n: 1 },
  { label: 'Stereo', n: 2 },
  { label: 'Multi', n: 3 }
]

function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}
function savePref(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

export default function App() {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [roots, setRoots] = useState<LibraryRoot[]>([])
  const [scope, setScope] = useState<Scope>({ kind: 'all' })
  const [text, setText] = useState('')
  const [mode, setMode] = useState<SearchMode>(() => loadPref('mode', 'keyword'))
  const [maxDur, setMaxDur] = useState<number | null>(null)
  const [channels, setChannels] = useState<number | null>(null)
  const [sort, setSort] = useState<SortKey>('relevance')
  const [similar, setSimilar] = useState<{ id: number; name: string } | null>(null)
  const [result, setResult] = useState<SearchResult>({ items: [], total: 0, tookMs: 0, modeUsed: 'browse' })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<SoundDetail | null>(null)
  const [autoplay, setAutoplay] = useState({ id: 0, token: 0 })
  const [autoPlayOn, setAutoPlayOn] = useState<boolean>(() => loadPref('autoplay', true))
  const [loop, setLoop] = useState<boolean>(() => loadPref('loop', false))
  const [volume, setVolume] = useState<number>(() => loadPref('volume', 0.8))
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [idx, setIdx] = useState<IndexStatus | null>(null)
  const [ai, setAi] = useState<AiStatus>({ state: 'not-installed', embedded: 0, pending: 0 })
  const [libVersion, setLibVersion] = useState(0)
  const [stemStatus, setStemStatus] = useState<StemStatus>({ state: 'not-installed', queue: [] })
  const [stemFiles, setStemFiles] = useState<StemFile[] | null>(null)
  const [view, setView] = useState<'library' | 'session'>(() => loadPref('view', 'library'))
  const [sessionPlaying, setSessionPlaying] = useState(false)
  const [sessionInfo, setSessionInfo] = useState({ tracks: 0, length: 0 })
  const session = useRef<SessionHandle>(null)
  const player = useRef<PlayerHandle>(null)
  const searchBox = useRef<HTMLInputElement>(null)
  const searchSeq = useRef(0)

  const isMac = info?.platform === 'darwin'
  const rootLabels = useMemo(() => new Map(roots.map((r) => [r.id, r.label])), [roots])
  const total = roots.reduce((n, r) => n + r.count, 0)

  useEffect(() => savePref('mode', mode), [mode])
  useEffect(() => savePref('autoplay', autoPlayOn), [autoPlayOn])
  useEffect(() => savePref('loop', loop), [loop])
  useEffect(() => savePref('volume', volume), [volume])
  useEffect(() => savePref('view', view), [view])

  // One transport for both views: the control bar drives whichever view is open.
  const inSession = view === 'session'
  const togglePlay = useCallback(() => {
    if (inSession) session.current?.toggle()
    else player.current?.toggle()
  }, [inSession])
  const stopAll = useCallback(() => {
    player.current?.stop()
    session.current?.stop()
  }, [])
  const onPlayerPlaying = useCallback((p: boolean) => {
    setPlaying(p)
    if (p && session.current?.isPlaying()) session.current.pause()
  }, [])
  const onSessionPlaying = useCallback((p: boolean) => {
    setSessionPlaying(p)
    if (p) player.current?.stop()
  }, [])
  const onSessionInfo = useCallback((i: { tracks: number; length: number }) => setSessionInfo(i), [])

  // Initial load + live updates from the main process.
  useEffect(() => {
    void api.info().then(setInfo)
    void api.listRoots().then(setRoots)
    void api.indexStatus().then(setIdx)
    void api.aiStatus().then(setAi)
    void api.stemsStatus().then(setStemStatus)
    const offs = [
      api.onIndexStatus(setIdx),
      api.onAiStatus(setAi),
      api.onStemsStatus(setStemStatus),
      api.onLibraryChanged(() => {
        void api.listRoots().then(setRoots)
        setLibVersion((v) => v + 1)
      })
    ]
    return () => offs.forEach((f) => f())
  }, [])

  // Refresh results every few seconds while indexing.
  useEffect(() => {
    if (!idx?.running) return
    const t = setInterval(() => setLibVersion((v) => v + 1), 3000)
    return () => clearInterval(t)
  }, [idx?.running])

  // Run the search (debounced).
  useEffect(() => {
    const seq = ++searchSeq.current
    const t = setTimeout(async () => {
      const r = await api.search({
        text,
        mode,
        rootId: scope.kind === 'root' ? scope.id : null,
        favoritesOnly: scope.kind === 'fav',
        maxDurationMs: maxDur,
        channels,
        sort,
        similarTo: similar?.id ?? null
      })
      if (seq === searchSeq.current) setResult(r)
    }, text ? 160 : 0)
    return () => clearTimeout(t)
  }, [text, mode, scope, maxDur, channels, sort, similar, libVersion, ai.state === 'ready'])

  // Load details of the selected sound.
  useEffect(() => {
    if (selectedId == null) {
      setDetail(null)
      return
    }
    let live = true
    void api.getSound(selectedId).then((d) => live && setDetail(d))
    return () => {
      live = false
    }
    // Re-read when AI analysis progresses so "More like this" enables as soon as the sound is analysed.
  }, [selectedId, ai.embedded])

  // Stems of the selected sound (re-read when a split finishes).
  useEffect(() => {
    if (selectedId == null) {
      setStemFiles(null)
      return
    }
    let live = true
    void api.getStems(selectedId).then((f) => live && setStemFiles(f))
    return () => {
      live = false
    }
  }, [selectedId, stemStatus.lastDone?.soundId, stemStatus.lastDone?.seconds, stemStatus.state, libVersion])

  const addToSession = useCallback((id: number | null | undefined) => {
    if (id == null) return
    setView('session')
    void session.current?.addSound(id)
  }, [])

  const openStemsInSession = useCallback(() => {
    if (!detail || !stemFiles || stemFiles.some((f) => !f.soundId)) return
    const base = stem(detail.filename)
    setView('session')
    void session.current?.openStems([
      ...stemFiles.map((f) => ({ soundId: f.soundId!, name: `${base} – ${f.stem}`, color: STEM_COLORS[f.stem] })),
      { soundId: detail.id, name: `${base} (original mix)`, color: '#9aa5b1', muted: true }
    ])
  }, [detail, stemFiles])

  const select = useCallback(
    (id: number, play: boolean) => {
      setSelectedId(id)
      if (play && autoPlayOn) setAutoplay((a) => ({ id, token: a.token + 1 }))
    },
    [autoPlayOn]
  )
  const activate = useCallback((id: number) => {
    setSelectedId(id)
    setAutoplay((a) => ({ id, token: a.token + 1 }))
  }, [])

  const toggleFavorite = useCallback(async (id: number, fav: boolean) => {
    await api.setFavorite(id, fav)
    setResult((r) => ({ ...r, items: r.items.map((s) => (s.id === id ? { ...s, favorite: fav } : s)) }))
    setDetail((d) => (d && d.id === id ? { ...d, favorite: fav } : d))
  }, [])

  const showSimilar = useCallback(() => {
    if (!detail) return
    setSimilar({ id: detail.id, name: stem(detail.filename) })
    setSort('relevance')
  }, [detail])

  const addFolders = useCallback(async () => {
    const r = await api.addRoots()
    setRoots(r)
  }, [])

  // Keyboard: ↑/↓ browse (auto-play), Space play/stop, Enter play from start, F favourite, L loop, M similar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const inInput = (e.target as HTMLElement)?.tagName === 'INPUT'
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        searchBox.current?.focus()
        searchBox.current?.select()
        return
      }
      if (inInput && e.key === 'Escape') {
        if (text) setText('')
        else (e.target as HTMLInputElement).blur()
        return
      }
      if (inInput && e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return
      const items = result.items
      const cur = items.findIndex((s) => s.id === selectedId)
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !inSession) {
        e.preventDefault()
        if (inInput) (e.target as HTMLInputElement).blur()
        if (!items.length) return
        const next = cur < 0 ? 0 : Math.max(0, Math.min(items.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1)))
        select(items[next].id, true)
      } else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (inInput) (e.target as HTMLInputElement).blur()
        if (inSession) {
          session.current?.play(true)
          return
        }
        const id = selectedId ?? items[0]?.id
        if (id != null) activate(id)
      } else if (e.key.toLowerCase() === 'a' && !mod && selectedId != null) {
        addToSession(selectedId)
      } else if (e.key.toLowerCase() === 'f' && !mod && selectedId != null) {
        const s = items.find((x) => x.id === selectedId)
        if (s) void toggleFavorite(s.id, !s.favorite)
      } else if (e.key.toLowerCase() === 'l' && !mod) {
        setLoop((l) => !l)
      } else if (e.key.toLowerCase() === 'm' && !mod) {
        showSimilar()
      } else if (e.key === 'Escape') {
        stopAll()
        if (similar) setSimilar(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result.items, selectedId, select, activate, toggleFavorite, showSimilar, similar, text, inSession, togglePlay, stopAll, addToSession])

  const scopeLabel =
    scope.kind === 'all' ? 'All Sounds' : scope.kind === 'fav' ? 'Favourites' : (rootLabels.get(scope.id) ?? 'Folder')

  return (
    <div className={`app ${isMac ? 'mac' : 'win'}`}>
      {/* ---------- Control bar ---------- */}
      <header className="controlbar">
        <div className="brand">
          <Logo size={22} /> {APP_NAME.toUpperCase()}
        </div>
        <div className="transport">
          <button
            className={`tbtn ${(inSession ? sessionPlaying : playing) ? 'on' : ''}`}
            onClick={togglePlay}
            title={inSession ? 'Play / Pause the session (Space)' : 'Play / Pause (Space)'}
          >
            {(inSession ? sessionPlaying : playing) ? '❚❚' : '▶'}
          </button>
          <button className="tbtn" onClick={stopAll} title="Stop (Esc)">
            ■
          </button>
          <button className={`tbtn ${loop ? 'on accent' : ''}`} onClick={() => setLoop((l) => !l)} title="Loop (L)">
            ⟲
          </button>
          <button
            className={`tbtn wide ${autoPlayOn ? 'on' : ''}`}
            onClick={() => setAutoPlayOn((a) => !a)}
            title="Auto-play the selected sound"
          >
            AUTO
          </button>
        </div>
        <div className="lcd">
          <div className="lcd-main">
            <LcdTime />
            <span className="lcd-sep">/</span>
            <span className="lcd-dur">{fmtClock(inSession ? sessionInfo.length : duration)}</span>
          </div>
          <div className="lcd-sub">
            {inSession ? (
              <span className="lcd-name">
                Session · {sessionInfo.tracks} track{sessionInfo.tracks === 1 ? '' : 's'}
              </span>
            ) : detail ? (
              <>
                <span className="lcd-name">{stem(detail.filename)}</span>
                <span>{fmtFormat(detail)}</span>
                <span>{fmtChannels(detail.channels)}</span>
              </>
            ) : (
              <span className="lcd-name dim">No sound selected</span>
            )}
          </div>
        </div>
        <div className="volume" title="Volume">
          <span>🔈</span>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </div>
        <div className="search">
          <div className="seg">
            <button className={mode === 'keyword' ? 'on' : ''} onClick={() => setMode('keyword')} title="Search names, folders and metadata">
              Keyword
            </button>
            <button
              className={mode === 'ai' ? 'on ai' : ''}
              onClick={() => setMode('ai')}
              title={ai.state === 'ready' ? 'Describe the sound you want' : 'Install the AI model to enable AI search'}
            >
              ✦ AI
            </button>
          </div>
          <input
            ref={searchBox}
            className="search-input"
            placeholder={mode === 'ai' ? 'Describe a sound… e.g. "distant thunder rumble"' : 'Search sounds…  (Ctrl/⌘ + F)'}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (similar) setSimilar(null)
            }}
            spellCheck={false}
          />
        </div>
      </header>

      {/* ---------- Body ---------- */}
      <div className="body">
        <Sidebar
          roots={roots}
          scope={scope}
          total={total}
          ai={ai}
          onScope={(s) => {
            setScope(s)
            setSimilar(null)
          }}
          onAdd={addFolders}
          onRemove={async (id) => {
            await api.removeRoot(id)
            if (scope.kind === 'root' && scope.id === id) setScope({ kind: 'all' })
          }}
          onRescan={(id) => void api.rescan(id)}
          onInstallAi={async () => setAi(await api.installAi())}
        />
        <main className="browser">
          <div className="filterbar">
            <div className="view-tabs">
              <button className={!inSession ? 'on' : ''} onClick={() => setView('library')} title="Browse and search your sounds">
                ♫ Library
              </button>
              <button className={inSession ? 'on' : ''} onClick={() => setView('session')} title="Multitrack session (stems, mute/solo)">
                ▤ Session{sessionInfo.tracks ? ` (${sessionInfo.tracks})` : ''}
              </button>
            </div>
            <div className="crumb" style={{ display: inSession ? 'none' : 'flex' }}>
              {similar ? (
                <>
                  <span className="chip ai">✦ Similar to “{similar.name}”</span>
                  <button className="mini-btn" onClick={() => setSimilar(null)} title="Back to search (Esc)">
                    ✕
                  </button>
                </>
              ) : (
                <span>{scopeLabel}</span>
              )}
            </div>
            <div className="filters" style={{ display: inSession ? 'none' : 'flex' }}>
              <select value={maxDur ?? ''} onChange={(e) => setMaxDur(e.target.value ? Number(e.target.value) : null)}>
                {DURATIONS.map((d) => (
                  <option key={d.label} value={d.ms ?? ''}>
                    {d.label}
                  </option>
                ))}
              </select>
              <select value={channels ?? ''} onChange={(e) => setChannels(e.target.value ? Number(e.target.value) : null)}>
                {CHANNELS.map((c) => (
                  <option key={c.label} value={c.n ?? ''}>
                    {c.n == null ? 'Any channels' : c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SessionView ref={session} active={inSession} loop={loop} volume={volume} onPlaying={onSessionPlaying} onInfo={onSessionInfo} />
          {inSession ? null : roots.length === 0 ? (
            <div className="welcome">
              <div className="welcome-card">
                <div className="welcome-logo">
                  <Logo size={72} />
                </div>
                <h1>Welcome to {APP_NAME}</h1>
                <p>
                  Add the folders where your samples and sound effects live: internal or external drives. {APP_NAME} indexes them
                  where they are. Nothing is copied, moved or uploaded.
                </p>
                <button className="btn primary big" onClick={addFolders}>
                  Add sound folders…
                </button>
                <ul className="tips">
                  <li>
                    <b>↑ ↓</b> browse and audition · <b>Space</b> play/stop · <b>Enter</b> play from start
                  </li>
                  <li>
                    <b>Drag</b> any sound straight into Logic Pro or your DAW
                  </li>
                  <li>
                    <b>F</b> favourite · <b>L</b> loop · <b>M</b> more like this (AI) · <b>A</b> add to Session
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <SoundList
              items={result.items}
              selectedId={selectedId}
              rootLabels={rootLabels}
              sort={sort}
              onSort={setSort}
              onSelect={select}
              onActivate={activate}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </main>
      </div>

      {/* ---------- Editor: waveform region + inspector ---------- */}
      <section className="editor">
        <Player
          ref={player}
          sound={detail}
          autoplay={autoplay}
          loop={loop}
          volume={volume}
          onTime={timeStore.set}
          onDuration={setDuration}
          onPlaying={onPlayerPlaying}
        />
        <Inspector
          sound={detail}
          isMac={isMac}
          aiReady={ai.state === 'ready'}
          stemsDir={info?.stemsDir ?? ''}
          stemStatus={stemStatus}
          stemFiles={stemFiles}
          onFavorite={(f) => detail && void toggleFavorite(detail.id, f)}
          onSimilar={showSimilar}
          onInstallStems={async () => setStemStatus(await api.installStems())}
          onSplitStems={async () => detail && setStemStatus(await api.splitStems(detail.id))}
          onAddToSession={() => addToSession(detail?.id)}
          onOpenStemsInSession={openStemsInSession}
        />
      </section>

      {/* ---------- Status bar ---------- */}
      <footer className="statusbar">
        <span>
          {idx?.running ? (
            <span className="pulse">
              Indexing {idx.current ? `“${idx.current}”` : ''} · {nf.format(idx.scanned)} files found · {nf.format(idx.added)} new
            </span>
          ) : (
            <>Library: {nf.format(total)} sounds</>
          )}
        </span>
        <span className="grow" />
        <span>
          {nf.format(result.total)} results · {result.tookMs} ms
          {result.modeUsed === 'ai' && ' · AI'}
          {result.note && <span className="note"> · {result.note}</span>}
        </span>
        <span className="sep">|</span>
        <span>
          AI:{' '}
          {ai.state === 'ready'
            ? `ready${ai.pending ? ` · analysing ${nf.format(ai.pending)}` : ''}`
            : ai.state === 'not-installed'
              ? 'off'
              : ai.state}
        </span>
        {stemStatus.job && (
          <>
            <span className="sep">|</span>
            <span className="pulse">
              Stems: {stemStatus.job.phase === 'decoding' ? 'preparing' : `${Math.round(stemStatus.job.progress * 100)}%`}
              {stemStatus.queue.length > 0 && ` (+${stemStatus.queue.length} queued)`}
            </span>
          </>
        )}
        <span className="sep">|</span>
        <span className="dim">v{info?.version}</span>
      </footer>
    </div>
  )
}
