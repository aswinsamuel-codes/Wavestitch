// Worker thread: computes waveform peaks so the main process stays responsive.
import { parentPort } from 'node:worker_threads'
import { readRiffMetadata } from './audio/riff'
import { computePeaks } from './audio/pcm'

parentPort!.on('message', (msg: { reqId: number; path: string; buckets: number }) => {
  try {
    const meta = readRiffMetadata(msg.path)
    if (!meta?.layout) {
      parentPort!.postMessage({ reqId: msg.reqId, peaks: null, durationSec: null })
      return
    }
    const peaks = computePeaks(msg.path, meta.layout, msg.buckets)
    parentPort!.postMessage({ reqId: msg.reqId, peaks, durationSec: (meta.durationMs ?? 0) / 1000 })
  } catch (e) {
    parentPort!.postMessage({ reqId: msg.reqId, error: String(e) })
  }
})
