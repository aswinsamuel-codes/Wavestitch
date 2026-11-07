// Session audio engine: sample-accurate multitrack playback with Web Audio.
// Each track: AudioBufferSourceNode → gain (volume · mute/solo) → stereo panner → analyser → master.
// All sources are started against the same AudioContext clock, so tracks stay in perfect sync.

export interface EngineTrack {
  id: string
  buffer: AudioBuffer
  offset: number // seconds from session start
  volume: number // linear gain (1 = 0 dB)
  pan: number // -1 … 1
  muted: boolean
  solo: boolean
}

interface Live {
  t: EngineTrack
  gain: GainNode
  panner: StereoPannerNode
  analyser: AnalyserNode
  src: AudioBufferSourceNode | null
  meterBuf: Float32Array<ArrayBuffer>
}

export class SessionEngine {
  readonly ctx: AudioContext
  private master: GainNode
  private tracks = new Map<string, Live>()
  private playing = false
  private startCtxTime = 0
  private startPos = 0
  private pausedAt = 0
  loop = false
  onEnded: (() => void) | null = null

  constructor() {
    // "playback" latency favours glitch-free audio over low latency (we are not recording).
    this.ctx = new AudioContext({ latencyHint: 'playback' })
    this.master = this.ctx.createGain()
    this.master.connect(this.ctx.destination)
  }

  get isPlaying(): boolean {
    return this.playing
  }

  get length(): number {
    let end = 0
    for (const l of this.tracks.values()) end = Math.max(end, l.t.offset + l.t.buffer.duration)
    return end
  }

  position(): number {
    if (!this.playing) return this.pausedAt
    return this.startPos + (this.ctx.currentTime - this.startCtxTime)
  }

  addTrack(t: EngineTrack): void {
    const gain = this.ctx.createGain()
    const panner = this.ctx.createStereoPanner()
    const analyser = this.ctx.createAnalyser()
    analyser.fftSize = 1024
    gain.connect(panner).connect(analyser).connect(this.master)
    this.tracks.set(t.id, { t, gain, panner, analyser, src: null, meterBuf: new Float32Array(analyser.fftSize) })
    this.applyMix()
    if (this.playing) this.restart()
  }

  removeTrack(id: string): void {
    const l = this.tracks.get(id)
    if (!l) return
    this.stopSource(l)
    l.analyser.disconnect()
    this.tracks.delete(id)
    this.applyMix()
  }

  update(id: string, patch: Partial<Omit<EngineTrack, 'id' | 'buffer'>>): void {
    const l = this.tracks.get(id)
    if (!l) return
    const offsetChanged = patch.offset !== undefined && patch.offset !== l.t.offset
    Object.assign(l.t, patch)
    this.applyMix()
    if (offsetChanged && this.playing) this.restart()
  }

  /** Mute/solo logic like a DAW: if any track is soloed, only soloed tracks are heard. */
  private applyMix(): void {
    const anySolo = [...this.tracks.values()].some((l) => l.t.solo)
    const now = this.ctx.currentTime
    for (const l of this.tracks.values()) {
      const audible = anySolo ? l.t.solo : !l.t.muted
      l.gain.gain.setTargetAtTime(audible ? l.t.volume : 0, now, 0.01) // short ramp: no clicks
      l.panner.pan.setTargetAtTime(l.t.pan, now, 0.01)
    }
  }

  private stopSource(l: Live): void {
    if (!l.src) return
    l.src.onended = null
    try {
      l.src.stop()
    } catch {
      /* already stopped */
    }
    l.src.disconnect()
    l.src = null
  }

  async play(from?: number): Promise<void> {
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    const pos = Math.max(0, from ?? this.pausedAt)
    for (const l of this.tracks.values()) this.stopSource(l)
    const when = this.ctx.currentTime + 0.05 // tiny lead time so every source starts on the same sample
    for (const l of this.tracks.values()) {
      const { offset, buffer } = l.t
      if (pos >= offset + buffer.duration) continue
      const src = this.ctx.createBufferSource()
      src.buffer = buffer
      src.connect(l.gain)
      src.start(when + Math.max(0, offset - pos), Math.max(0, pos - offset))
      l.src = src
    }
    this.startCtxTime = when
    this.startPos = pos
    this.playing = true
  }

  pause(): void {
    if (!this.playing) return
    this.pausedAt = this.position()
    for (const l of this.tracks.values()) this.stopSource(l)
    this.playing = false
  }

  stop(): void {
    for (const l of this.tracks.values()) this.stopSource(l)
    this.playing = false
    this.pausedAt = 0
  }

  seek(t: number): void {
    const pos = Math.max(0, Math.min(t, this.length))
    if (this.playing) void this.play(pos)
    else this.pausedAt = pos
  }

  private restart(): void {
    void this.play(this.position())
  }

  /** Called every animation frame by the UI: handles end-of-session and loop. */
  tick(): void {
    if (!this.playing) return
    const len = this.length
    if (len > 0 && this.position() >= len) {
      if (this.loop) void this.play(0)
      else {
        this.stop()
        this.onEnded?.()
      }
    }
  }

  /** Peak level (0…1) of a track's output since the last call, for the meters. */
  level(id: string): number {
    const l = this.tracks.get(id)
    if (!l || !this.playing) return 0
    l.analyser.getFloatTimeDomainData(l.meterBuf)
    let peak = 0
    for (let i = 0; i < l.meterBuf.length; i++) {
      const v = Math.abs(l.meterBuf[i])
      if (v > peak) peak = v
    }
    return peak
  }

  setMasterVolume(v: number): void {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01)
  }

  dispose(): void {
    this.stop()
    void this.ctx.close()
  }
}

/** Max-abs peaks of a buffer's channel mix, `points` columns wide (for drawing regions). */
export function bufferPeaks(buf: AudioBuffer, points: number): Float32Array {
  const out = new Float32Array(points)
  const per = buf.length / points
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c))
  for (let p = 0; p < points; p++) {
    const a = Math.floor(p * per)
    const b = Math.min(buf.length, Math.floor((p + 1) * per))
    const step = Math.max(1, Math.floor((b - a) / 256)) // sample long buckets for speed
    let m = 0
    for (const ch of chans)
      for (let i = a; i < b; i += step) {
        const v = Math.abs(ch[i])
        if (v > m) m = v
      }
    out[p] = m
  }
  return out
}
