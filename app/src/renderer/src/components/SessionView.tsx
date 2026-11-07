// DAW-style Session view: synced multitrack playback of stems / library sounds with a mixer.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { SessionEngine, bufferPeaks } from '../session/engine'
import { timeStore } from '../timeStore'
import { fmtClock } from '../format'

export interface SessionHandle {
  toggle(): void
  play(fromStart?: boolean): void
  stop(): void
  pause(): void
  addSound(soundId: number, opts?: { name?: string; color?: string; muted?: boolean }): Promise<void>
  openStems(tracks: Array<{ soundId: number; name: string; color: string; muted?: boolean }>): Promise<void>
  isPlaying(): boolean
}

interface Props {
  active: boolean
  loop: boolean
  volume: number
  onPlaying(p: boolean): void
  onInfo(info: { tracks: number; length: number }): void
}

interface Track {
  id: string
  soundId: number
  name: string
  color: string
  offset: number
  volume: number
  pan: number
  muted: boolean
  solo: boolean
  duration: number
  peaks: Float32Array | null
  status: 'loading' | 'ready' | 'error'
  error?: string
}

type Saved = Pick<Track, 'soundId' | 'name' | 'color' | 'offset' | 'volume' | 'pan' | 'muted' | 'solo'>

const HEADER_W = 230
const ROW_H = 72
const RULER_H = 24
const PALETTE = ['#8ab4f8', '#6fcf97', '#f2b33d', '#e8789a', '#b39ddb', '#4dd0e1', '#ff8a65', '#aed581']
const MAX_DECODED_BYTES = 700 * 1024 * 1024 // memory guard for this alpha (≈ 30 min of stereo audio)
const STORE_KEY = 'session.v1'

const dbLabel = (v: number): string => (v <= 0.0001 ? '-∞' : `${(20 * Math.log10(v)).toFixed(1)} dB`)
const panLabel = (p: number): string => (Math.abs(p) < 0.02 ? 'C' : p < 0 ? `L${Math.round(-p * 100)}` : `R${Math.round(p * 100)}`)

function tickStep(pxPerSec: number): number {
  for (const s of [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]) if (s * pxPerSec >= 70) return s
  return 600
}

function RegionCanvas({ peaks, width, color }: { peaks: Float32Array | null; width: number; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(1, Math.min(32000, Math.round(width)))
    const h = ROW_H - 26
    c.width = Math.round(w * dpr)
    c.height = Math.round(h * dpr)
    c.style.width = `${w}px`
    c.style.height = `${h}px`
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    g.clearRect(0, 0, w, h)
    if (!peaks) return
    // True level, like a DAW: a quiet stem looks quiet (no per-track normalisation).
    const norm = 0.98
    g.fillStyle = 'rgba(255,255,255,0.9)'
    const mid = h / 2
    for (let x = 0; x < w; x++) {
      const i0 = Math.floor((x / w) * peaks.length)
      const i1 = Math.max(i0 + 1, Math.floor(((x + 1) / w) * peaks.length))
      let m = 0
      for (let i = i0; i < i1 && i < peaks.length; i++) if (peaks[i] > m) m = peaks[i]
      const a = Math.max(0.5, m * norm * mid)
      g.fillRect(x, mid - a, 1, a * 2)
    }
  }, [peaks, width, color])
  return <canvas ref={ref} />
}

export const SessionView = forwardRef<SessionHandle, Props>(function SessionView({ active, loop, volume, onPlaying, onInfo }, ref) {
  const engine = useRef<SessionEngine | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [pxPerSec, setPxPerSec] = useState(20)
  const [message, setMessage] = useState<string | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const playhead = useRef<HTMLDivElement>(null)
  const meters = useRef(new Map<string, HTMLDivElement>())
  const tracksRef = useRef<Track[]>([])
  const restored = useRef(false)
  tracksRef.current = tracks

  const eng = (): SessionEngine => (engine.current ??= new SessionEngine())
  const length = tracks.reduce((m, t) => Math.max(m, t.offset + t.duration), 0)
  const laneW = Math.max(800, Math.ceil((length + 10) * pxPerSec))

  useEffect(() => onInfo({ tracks: tracks.length, length }), [tracks.length, length, onInfo])
  useEffect(() => {
    if (engine.current) engine.current.loop = loop
  }, [loop])
  useEffect(() => engine.current?.setMasterVolume(volume), [volume])

  // Persist the session layout (not the audio) so it survives restarts.
  useEffect(() => {
    if (!restored.current) return
    const saved: Saved[] = tracks.map(({ soundId, name, color, offset, volume: v, pan, muted, solo }) => ({ soundId, name, color, offset, volume: v, pan, muted, solo }))
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(saved))
    } catch {
      /* ignore */
    }
  }, [tracks])

  const patch = useCallback((id: string, p: Partial<Track>) => {
    setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)))
    const { offset, volume: v, pan, muted, solo } = p
    const ep = Object.fromEntries(Object.entries({ offset, volume: v, pan, muted, solo }).filter(([, x]) => x !== undefined))
    if (Object.keys(ep).length) engine.current?.update(id, ep)
  }, [])

  const load = useCallback(async (spec: Saved): Promise<void> => {
    const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
    setTracks((ts) => [...ts, { ...spec, id, duration: 0, peaks: null, status: 'loading' }])
    try {
      const d = await window.aos.getSound(spec.soundId)
      if (!d) throw new Error('sound not found in library')
      const e = eng()
      const used = tracksRef.current.reduce((n, t) => n + t.duration * e.ctx.sampleRate * 2 * 4, 0)
      const need = ((d.durationMs ?? 0) / 1000) * e.ctx.sampleRate * 2 * 4
      if (used + need > MAX_DECODED_BYTES) throw new Error('session is full (memory limit); remove a track first')
      const res = await fetch(`aos://sound/${spec.soundId}`)
      if (!res.ok) throw new Error(`could not read file (${res.status})`)
      const buffer = await e.ctx.decodeAudioData(await res.arrayBuffer())
      if (!tracksRef.current.some((t) => t.id === id)) return // removed while loading
      e.addTrack({ id, buffer, offset: spec.offset, volume: spec.volume, pan: spec.pan, muted: spec.muted, solo: spec.solo })
      setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, duration: buffer.duration, peaks: bufferPeaks(buffer, 4000), status: 'ready' } : t)))
    } catch (err) {
      const msg = String((err as Error)?.message ?? err)
      console.error(`session: could not load sound ${spec.soundId}: ${msg}`)
      setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, status: 'error', error: msg } : t)))
    }
  }, [])

  // Restore the last session the first time the view is shown.
  useEffect(() => {
    if (!active || restored.current) return
    restored.current = true
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') as Saved[]
      saved.forEach((s) => void load(s))
    } catch {
      /* ignore */
    }
  }, [active, load])

  const fit = useCallback(() => {
    const w = (scroll.current?.clientWidth ?? 1000) - HEADER_W - 40
    const len = tracksRef.current.reduce((m, t) => Math.max(m, t.offset + t.duration), 0)
    if (len > 0) setPxPerSec(Math.max(2, Math.min(400, w / len)))
  }, [])

  // Animation loop: playhead, meters, LCD time, end-of-session handling.
  useEffect(() => {
    let raf = 0
    const frame = (): void => {
      const e = engine.current
      if (e) {
        e.tick()
        const pos = e.position()
        if (playhead.current) playhead.current.style.transform = `translateX(${pos * pxPerSec}px)`
        if (e.isPlaying) {
          timeStore.set(pos)
          const sc = scroll.current
          const x = HEADER_W + pos * pxPerSec
          if (sc && (x > sc.scrollLeft + sc.clientWidth - 60 || x < sc.scrollLeft + HEADER_W)) sc.scrollLeft = Math.max(0, x - HEADER_W - 80)
        }
        for (const [id, el] of meters.current) {
          const lv = e.level(id)
          el.style.width = `${Math.min(100, lv * 100)}%`
          el.classList.toggle('hot', lv > 0.98)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [pxPerSec])

  useEffect(() => {
    const e = eng()
    e.onEnded = () => {
      onPlaying(false)
      timeStore.set(0)
    }
    return () => engine.current?.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    toggle: () => {
      const e = eng()
      if (e.isPlaying) {
        e.pause()
        onPlaying(false)
      } else {
        void e.play()
        onPlaying(true)
      }
    },
    play: (fromStart) => {
      void eng().play(fromStart ? 0 : undefined)
      onPlaying(true)
    },
    stop: () => {
      eng().stop()
      timeStore.set(0)
      onPlaying(false)
    },
    pause: () => {
      eng().pause()
      onPlaying(false)
    },
    isPlaying: () => !!engine.current?.isPlaying,
    addSound: async (soundId, opts) => {
      const d = await window.aos.getSound(soundId)
      const color = opts?.color ?? PALETTE[tracksRef.current.length % PALETTE.length]
      await load({ soundId, name: opts?.name ?? d?.filename.replace(/\.[^.]+$/, '') ?? `Sound ${soundId}`, color, offset: 0, volume: 1, pan: 0, muted: !!opts?.muted, solo: false })
    },
    openStems: async (list) => {
      // Replace the session with the stems (and the original, muted, for A/B comparison).
      eng().stop()
      for (const t of tracksRef.current) engine.current?.removeTrack(t.id)
      setTracks([])
      tracksRef.current = []
      restored.current = true
      setMessage(null)
      await Promise.all(list.map((s) => load({ soundId: s.soundId, name: s.name, color: s.color, offset: 0, volume: 1, pan: 0, muted: !!s.muted, solo: false })))
      requestAnimationFrame(fit)
    }
  }))

  const seekFromEvent = (e: React.PointerEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    const t = Math.max(0, (e.clientX - rect.left) / pxPerSec)
    eng().seek(t)
    if (!eng().isPlaying) timeStore.set(t)
  }

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, t: Track): void => {
    e.stopPropagation()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const x0 = e.clientX
    const o0 = t.offset
    const move = (ev: PointerEvent): void => {
      let o = Math.max(0, o0 + (ev.clientX - x0) / pxPerSec)
      if (o * pxPerSec < 6) o = 0 // snap to the session start
      setTracks((ts) => ts.map((x) => (x.id === t.id ? { ...x, offset: o } : x)))
    }
    const up = (ev: PointerEvent): void => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      let o = Math.max(0, o0 + (ev.clientX - x0) / pxPerSec)
      if (o * pxPerSec < 6) o = 0
      patch(t.id, { offset: o })
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  const remove = (t: Track): void => {
    engine.current?.removeTrack(t.id)
    meters.current.delete(t.id)
    setTracks((ts) => ts.filter((x) => x.id !== t.id))
  }

  const step = tickStep(pxPerSec)
  const ticks: number[] = []
  for (let s = 0; s * pxPerSec <= laneW; s += step) ticks.push(s)

  return (
    <div className="session" style={{ display: active ? 'flex' : 'none' }}>
      <div className="session-toolbar">
        <span className="session-title">Session</span>
        <span className="dim">
          {tracks.length} track{tracks.length === 1 ? '' : 's'} · {fmtClock(length)}
        </span>
        <span className="grow" />
        {message && <span className="err small">{message}</span>}
        <button className="mini-btn" title="Zoom out" onClick={() => setPxPerSec((p) => Math.max(2, p / 1.5))}>
          －
        </button>
        <button className="mini-btn" title="Fit session to window" onClick={fit}>
          Fit
        </button>
        <button className="mini-btn" title="Zoom in" onClick={() => setPxPerSec((p) => Math.min(400, p * 1.5))}>
          ＋
        </button>
        <button
          className="mini-btn"
          title="Remove all tracks"
          onClick={() => {
            engine.current?.stop()
            onPlaying(false)
            tracks.forEach((t) => engine.current?.removeTrack(t.id))
            setTracks([])
          }}
          disabled={!tracks.length}
        >
          Clear
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="welcome">
          <div className="welcome-card">
            <h1>Session</h1>
            <p>
              Split a track into stems, then click <b>Open stems in Session</b>, or select any sound and click <b>Add to Session</b> (key <b>A</b>).
              Tracks play in sync. Use <b>M</b>/<b>S</b> to mute or solo, and drag regions to move them in time.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="tl-scroll"
          ref={scroll}
          onWheel={(e) => {
            if (!e.ctrlKey && !e.metaKey) return
            e.preventDefault()
            setPxPerSec((p) => Math.max(2, Math.min(400, p * (e.deltaY < 0 ? 1.2 : 1 / 1.2))))
          }}
        >
          <div className="tl-inner" style={{ width: HEADER_W + laneW }}>
            <div className="tl-row tl-ruler-row" style={{ height: RULER_H }}>
              <div className="tl-head tl-corner" style={{ width: HEADER_W }} />
              <div className="tl-ruler" style={{ width: laneW }} onPointerDown={seekFromEvent}>
                {ticks.map((s) => (
                  <div key={s} className="tl-tick" style={{ left: s * pxPerSec }}>
                    <span>{s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${s}s`}</span>
                  </div>
                ))}
              </div>
            </div>

            {tracks.map((t) => (
              <div className="tl-row" key={t.id} style={{ height: ROW_H }}>
                <div className="tl-head" style={{ width: HEADER_W }}>
                  <div className="th-top">
                    <span className="th-color" style={{ background: t.color }} />
                    <span className="th-name" title={t.name}>
                      {t.name}
                    </span>
                    <button className="mini-btn" title="Remove track" onClick={() => remove(t)}>
                      ✕
                    </button>
                  </div>
                  <div className="th-controls">
                    <button className={`ms-btn ${t.muted ? 'mute-on' : ''}`} title="Mute" onClick={() => patch(t.id, { muted: !t.muted })}>
                      M
                    </button>
                    <button className={`ms-btn ${t.solo ? 'solo-on' : ''}`} title="Solo" onClick={() => patch(t.id, { solo: !t.solo })}>
                      S
                    </button>
                    <input
                      className="th-vol"
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.01}
                      value={t.volume}
                      title={`Volume ${dbLabel(t.volume)} (double-click: 0 dB)`}
                      onChange={(e) => patch(t.id, { volume: Number(e.target.value) })}
                      onDoubleClick={() => patch(t.id, { volume: 1 })}
                    />
                    <input
                      className="th-pan"
                      type="range"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={t.pan}
                      title={`Pan ${panLabel(t.pan)} (double-click: centre)`}
                      onChange={(e) => patch(t.id, { pan: Number(e.target.value) })}
                      onDoubleClick={() => patch(t.id, { pan: 0 })}
                    />
                    <span className="th-db">{dbLabel(t.volume)}</span>
                  </div>
                  <div className="th-meter">
                    <div
                      className="th-meter-fill"
                      ref={(el) => {
                        if (el) meters.current.set(t.id, el)
                      }}
                    />
                  </div>
                </div>
                <div className="tl-lane" style={{ width: laneW }} onPointerDown={seekFromEvent}>
                  {t.status === 'ready' ? (
                    <div
                      className={`tl-region ${t.muted ? 'muted' : ''}`}
                      style={{ left: t.offset * pxPerSec, width: t.duration * pxPerSec, background: t.color }}
                      onPointerDown={(e) => startDrag(e, t)}
                      title={`${t.name} · drag to move in time`}
                    >
                      <div className="tl-region-name">{t.name}</div>
                      <RegionCanvas peaks={t.peaks} width={t.duration * pxPerSec} color={t.color} />
                    </div>
                  ) : (
                    <div className={`tl-status ${t.status}`}>{t.status === 'loading' ? 'Loading…' : `Could not load: ${t.error}`}</div>
                  )}
                </div>
              </div>
            ))}
            <div className="tl-playhead" ref={playhead} style={{ left: HEADER_W, top: 0 }} />
          </div>
        </div>
      )}
    </div>
  )
})
