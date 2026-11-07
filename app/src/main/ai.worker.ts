// Worker thread running the CLAP model locally (ONNX Runtime on CPU) via Transformers.js.
// The model is only fetched from the internet when the user explicitly clicks "Install AI model".
import { parentPort } from 'node:worker_threads'
import { readRiffMetadata } from './audio/riff'
import { readAnalysisWindows } from './audio/pcm'

const MODEL_ID = 'Xenova/clap-htsat-unfused'
const DTYPE = 'q8'

type Tf = typeof import('@huggingface/transformers')
let tf: Tf
let processor: Awaited<ReturnType<Tf['AutoProcessor']['from_pretrained']>>
let tokenizer: Awaited<ReturnType<Tf['AutoTokenizer']['from_pretrained']>>
let audioModel: Awaited<ReturnType<Tf['ClapAudioModelWithProjection']['from_pretrained']>>
let textModel: Awaited<ReturnType<Tf['ClapTextModelWithProjection']['from_pretrained']>>

const post = (m: unknown): void => parentPort!.postMessage(m)

function normalize(v: Float32Array): Float32Array {
  let n = 0
  for (let i = 0; i < v.length; i++) n += v[i] * v[i]
  n = Math.sqrt(n) || 1
  const out = new Float32Array(v.length)
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n
  return out
}

async function init(modelsDir: string, allowDownload: boolean): Promise<void> {
  tf = await import('@huggingface/transformers')
  tf.env.cacheDir = modelsDir
  tf.env.localModelPath = modelsDir
  tf.env.allowLocalModels = true
  tf.env.allowRemoteModels = allowDownload
  const progress = (p: { status: string; file?: string; loaded?: number; total?: number }): void => {
    if (p.status === 'progress' && p.total) post({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total })
  }
  // Two threads are plenty for CLAP and keep the CPU free for playback and the DAW.
  const opts = {
    dtype: DTYPE,
    device: 'cpu',
    progress_callback: progress,
    session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 }
  } as const
  processor = await tf.AutoProcessor.from_pretrained(MODEL_ID, { progress_callback: progress })
  tokenizer = await tf.AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback: progress })
  audioModel = await tf.ClapAudioModelWithProjection.from_pretrained(MODEL_ID, opts as never)
  textModel = await tf.ClapTextModelWithProjection.from_pretrained(MODEL_ID, opts as never)
}

async function embedAudio(path: string): Promise<Float32Array | null> {
  const meta = readRiffMetadata(path)
  if (!meta?.layout) return null
  return embedWindows(readAnalysisWindows(path, meta.layout, 48000, 10, 6))
}

/** Mean of L2-normalised CLAP embeddings over 48 kHz mono windows. */
async function embedWindows(windows: Float32Array[]): Promise<Float32Array | null> {
  if (!windows.length) return null
  let sum: Float32Array | null = null
  for (const w of windows) {
    const inputs = await (processor as unknown as (a: Float32Array) => Promise<Record<string, unknown>>)(w)
    const { audio_embeds } = (await (audioModel as unknown as (i: unknown) => Promise<{ audio_embeds: { data: Float32Array } }>)(inputs))
    const e = normalize(audio_embeds.data as Float32Array)
    if (!sum) sum = new Float32Array(e.length)
    for (let i = 0; i < e.length; i++) sum[i] += e[i]
  }
  return normalize(sum!)
}

async function embedText(text: string): Promise<Float32Array> {
  const inputs = (tokenizer as unknown as (t: string[], o: object) => unknown)([text], { padding: true, truncation: true })
  const { text_embeds } = await (textModel as unknown as (i: unknown) => Promise<{ text_embeds: { data: Float32Array } }>)(inputs)
  return normalize(text_embeds.data as Float32Array)
}

parentPort!.on('message', async (msg: {
  type: string
  reqId?: number
  path?: string
  text?: string
  windows?: Float32Array[]
  modelsDir?: string
  allowDownload?: boolean
}) => {
  try {
    if (msg.type === 'init') {
      await init(msg.modelsDir!, !!msg.allowDownload)
      post({ type: 'ready', model: `${MODEL_ID}@${DTYPE}` })
    } else if (msg.type === 'embedAudio') {
      const vec = await embedAudio(msg.path!)
      post({ type: 'result', reqId: msg.reqId, vec })
    } else if (msg.type === 'embedWindows') {
      const vec = await embedWindows(msg.windows ?? [])
      post({ type: 'result', reqId: msg.reqId, vec })
    } else if (msg.type === 'embedText') {
      const vec = await embedText(msg.text!)
      post({ type: 'result', reqId: msg.reqId, vec })
    }
  } catch (e) {
    const err = String((e as Error)?.message ?? e)
    if (msg.type === 'init') post({ type: 'initError', error: err })
    else post({ type: 'result', reqId: msg.reqId, error: err })
  }
})
