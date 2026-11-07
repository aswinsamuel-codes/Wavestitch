// Waveform "region" view + audio engine, styled like a DAW audio region.
// Playback uses Web Audio with the whole sound decoded in memory (sample-accurate clock, no streaming,
// unaffected by background work). Very long/large files fall back to streaming via a media element.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import TimelinePlugin from 'wavesurfer.js/plugins/timeline'
import HoverPlugin from 'wavesurfer.js/plugins/hover'
import type { SoundDetail } from '@shared/types'
import { stem } from '../format'

export interface PlayerHandle {
  toggle(): void
  play(fromStart?: boolean): void
  stop(): void
}

interface Props {
  sound: SoundDetail | null
  autoplay: { id: number; token: number } // token increments when sound `id` should start playing
  loop: boolean
  volume: number
  onTime(t: number): void
  onDuration(d: number): void
  onPlaying(p: boolean): void
}

type Backend = 'WebAudio' | 'MediaElement'
const STREAM_OVER_MS = 15 * 60 * 1000 // stream files longer than 15 minutes…
const STREAM_OVER_BYTES = 250 * 1024 * 1024 // …or larger than 250 MB

function backendFor(s: SoundDetail): Backend {
  return (s.durationMs ?? 0) > STREAM_OVER_MS || s.sizeBytes > STREAM_OVER_BYTES ? 'MediaElement' : 'WebAudio'
}

export const Player = forwardRef<PlayerHandle, Props>(function Player(
  { sound, autoplay, loop, volume, onTime, onDuration, onPlaying },
  ref
) {
  const box = useRef<HTMLDivElement>(null)
  const ws = useRef<WaveSurfer | null>(null)
  const backend = useRef<Backend | null>(null)
  const loadToken = useRef(0)
  const loopRef = useRef(loop)
  const volumeRef = useRef(volume)
  const playWhenReady = useRef<number | null>(null)
  const loadingId = useRef<number | null>(null)
  const loadedId = useRef<number | null>(null)
  loopRef.current = loop
  volumeRef.current = volume

  function create(kind: Backend): WaveSurfer {
    ws.current?.destroy()
    const w = WaveSurfer.create({
      container: box.current!,
      backend: kind,
      height: 140,
      waveColor: 'rgba(225, 240, 255, 0.92)',
      progressColor: 'rgba(255, 255, 255, 1)',
      cursorColor: '#ffffff',
      cursorWidth: 1,
      normalize: true,
      interact: true,
      dragToSeek: true,
      hideScrollbar: true,
      plugins: [
        TimelinePlugin.create({
          height: 18,
          insertPosition: 'beforebegin',
          style: { fontSize: '10px', color: 'rgba(8, 24, 40, 0.75)' }
        }),
        HoverPlugin.create({ lineColor: 'rgba(255,255,255,0.5)', lineWidth: 1, labelBackground: '#111', labelColor: '#ddd', labelSize: '10px' })
      ]
    })
    w.setVolume(volumeRef.current)
    w.on('timeupdate', (t) => onTime(t))
    w.on('ready', (d) => {
      onDuration(d)
      loadedId.current = loadingId.current
      if (playWhenReady.current !== null && playWhenReady.current === loadedId.current) {
        playWhenReady.current = null
        void w.play(0)
      }
    })
    w.on('error', (e) => {
      if (loadingId.current == null) return
      const msg = `player (sound ${loadingId.current}, ${kind}): ${String((e as Error)?.message ?? e)}`
      console.error(msg)
      ;((window as unknown as { __aosErrors?: string[] }).__aosErrors ??= []).push(msg)
    })
    const media = w.getMediaElement()
    ;(window as unknown as { __aosWs?: WaveSurfer }).__aosWs = w // used by the developer self-test
    if (media instanceof HTMLMediaElement) {
      // Streaming mode only: log buffer under-runs so lag can be diagnosed from the log file.
      for (const ev of ['waiting', 'stalled'] as const)
        media.addEventListener(ev, () => {
          if (!media.paused) console.warn(`player ${ev} at ${media.currentTime.toFixed(2)}s (sound ${loadingId.current})`)
        })
    }
    w.on('play', () => onPlaying(true))
    w.on('pause', () => onPlaying(false))
    w.on('finish', () => {
      if (loopRef.current) void w.play(0)
      else onPlaying(false)
    })
    ws.current = w
    backend.current = kind
    return w
  }

  useEffect(() => {
    create('WebAudio')
    return () => ws.current?.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ws.current?.setVolume(volume)
  }, [volume])

  // Load a new sound when the selection changes.
  useEffect(() => {
    if (!ws.current) return
    const token = ++loadToken.current
    loadedId.current = null
    if (!sound) {
      loadingId.current = null
      ws.current.empty()
      return
    }
    loadingId.current = sound.id
    const wanted = backendFor(sound)
    const w = backend.current === wanted ? ws.current : create(wanted)
    w.stop()
    void (async () => {
      const p = await window.aos.getPeaks(sound.id)
      if (token !== loadToken.current) return
      const url = `aos://sound/${sound.id}`
      try {
        if (p.peaks && p.durationSec) await w.load(url, p.peaks, p.durationSec)
        else await w.load(url)
      } catch {
        /* superseded by a newer load or unplayable file */
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound?.id])

  // Autoplay request (selection via keyboard/click while auto-play is on, or Enter).
  useEffect(() => {
    if (!autoplay.token || !ws.current) return
    if (loadedId.current === autoplay.id) {
      playWhenReady.current = null
      void ws.current.play(0)
    } else {
      playWhenReady.current = autoplay.id
    }
  }, [autoplay.token])

  useImperativeHandle(ref, () => ({
    toggle: () => void ws.current?.playPause(),
    play: (fromStart) => void ws.current?.play(fromStart ? 0 : undefined),
    stop: () => ws.current?.stop()
  }))

  return (
    <div className="region-wrap">
      <div className={`region ${sound ? '' : 'empty'}`}>
        <div className="region-title">{sound ? stem(sound.filename) : 'No sound selected'}</div>
        <div className="region-wave" ref={box} />
      </div>
    </div>
  )
})
