// Playback position store. The player writes ~60×/s; only small display components subscribe,
// so the rest of the window is not re-rendered during playback.
import { useEffect, useState } from 'react'

type Listener = (t: number) => void
let current = 0
const listeners = new Set<Listener>()

export const timeStore = {
  get: (): number => current,
  set(t: number): void {
    current = t
    listeners.forEach((l) => l(t))
  },
  subscribe(l: Listener): () => void {
    listeners.add(l)
    return () => listeners.delete(l)
  }
}

/** Current playback time, re-rendered at most `fps` times per second. */
export function usePlayTime(fps = 20): number {
  const [t, setT] = useState(current)
  useEffect(() => {
    let last = 0
    return timeStore.subscribe((v) => {
      const now = performance.now()
      if (now - last >= 1000 / fps || v === 0) {
        last = now
        setT(v)
      }
    })
  }, [fps])
  return t
}
