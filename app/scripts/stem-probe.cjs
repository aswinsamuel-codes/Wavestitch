// Probes HT-Demucs ONNX session options: load time, memory and one-chunk inference speed.
// Usage: node scripts/stem-probe.cjs <model.onnx> <optLevel: disabled|basic|extended|all> <arena: 0|1> <threads>
const ort = require('onnxruntime-node')
const [modelPath, level = 'basic', arena = '0', threads = '4'] = process.argv.slice(2)
const N = 343980
const mb = () => Math.round(process.memoryUsage().rss / 1048576)
;(async () => {
  const t0 = Date.now()
  const s = await ort.InferenceSession.create(modelPath, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: level,
    enableCpuMemArena: arena === '1',
    enableMemPattern: arena === '1',
    intraOpNumThreads: Number(threads)
  })
  console.log(`loaded in ${Date.now() - t0} ms, rss ${mb()} MB; inputs ${s.inputNames} outputs ${s.outputNames}`)
  const x = new Float32Array(2 * N)
  for (let i = 0; i < N; i++) {
    const v = 0.3 * Math.sin((2 * Math.PI * 220 * i) / 44100) + 0.2 * (Math.random() * 2 - 1) * (i % 22050 < 2000 ? 1 : 0)
    x[i] = v
    x[N + i] = v
  }
  const t1 = Date.now()
  const r = await s.run({ mix: new ort.Tensor('float32', x, [1, 2, N]) })
  const out = r.stems
  console.log(`1 chunk (7.8 s audio) in ${Date.now() - t1} ms, rss ${mb()} MB, out dims ${out.dims}, type ${out.type}`)
  const d = out.data
  const rms = [0, 1, 2, 3].map((st) => {
    let acc = 0
    for (let i = 0; i < N; i++) acc += d[(st * 2) * N + i] ** 2
    return (10 * Math.log10(acc / N + 1e-12)).toFixed(1)
  })
  console.log(`stem RMS dB [drums, bass, other, vocals]: ${rms.join(', ')}`)
})().catch((e) => {
  console.error('FAIL', e.message)
  process.exit(1)
})
