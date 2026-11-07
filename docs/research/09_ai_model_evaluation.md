# 09 — AI / ML Model Evaluation (Phase 0.6)

Research date: 2026-11-07 · Labels: [V] official model card/repo/paper, [T] third-party, [K] prior knowledge (verify), [A] assumption

> **Principle:** No single model solves every audio-intelligence task. AUDIO OS uses a **portfolio**, each model for the task it was built for, behind a common `AnalysisProvider` interface so models can be swapped (see [ai_pipeline.md](../architecture/ai_pipeline.md)).

## 1. Task → model mapping

| Task | Recommended model(s) | Why | Phase |
|---|---|---|---|
| Text-to-audio semantic search ("distant thunder") | **CLAP** (LAION) audio + text encoders | Joint embedding space; zero-shot | P0 |
| Audio-to-audio similarity ("more like this") | CLAP audio embedding (same vectors) | Reuses the same index; no extra model | P0 |
| Zero-shot tag / UCS category suggestions | CLAP text prompts per UCS subcategory | No training data needed initially | P0 |
| Sound-event tagging with a fixed ontology (AudioSet 527 classes) | **PANNs** (CNN14) or **YAMNet** | Calibrated multi-label classifier; complements CLAP | P1 |
| Speech transcription (dialogue, VO, podcasts) | **Whisper** (large-v3-turbo via faster-whisper) | Strong multilingual ASR; MIT | P1 |
| Speech / music / SFX content-type detection | PANNs/YAMNet top classes | Route files to the right pipeline | P1 |
| Music BPM / key | librosa (basic); Essentia (needs commercial licence) | Licensing constraint (see §4) | P2 |
| Fine-grained UCS classifier | Linear/MLP head on frozen CLAP embeddings, trained on user-confirmed tags | Accuracy beyond zero-shot | P2 |

## 2. Model evaluation

### 2.1 CLAP (Contrastive Language–Audio Pretraining), LAION
| Aspect | Finding |
|---|---|
| Licence | Hugging Face card for `laion/clap-htsat-fused` lists **Apache-2.0** [V] S50. **Training data:** LAION-Audio-630K and others with mixed copyright restrictions; most of the dataset cannot be redistributed [V] S50. → The weights' licence is permissive, but **legal review of training-data provenance risk** is recommended before marketing claims |
| Accuracy (benchmark) | ESC-50 zero-shot: ~82.6% (CLAP baseline) to ~88–89% (LAION-630K variants), depending on prompts and checkpoint [T] S51. A 93.7% figure appears on one third-party page; **unverified** |
| Accuracy (our domain) | **Unknown.** ESC-50 has 50 coarse classes, 5-second clips. Professional SFX libraries need hundreds of UCS subcategories and long or layered files. **Expect markedly lower top-1 on UCS** [A]. Must benchmark (§5) |
| Hardware | HTSAT-based audio encoder is small (tens of millions of params [K]); **CPU inference feasible** for ingest at MVP scale [A, TQ-4]; GPU for bulk back-fills |
| Inference cost | See §3 (estimate) |
| Deployment complexity | Low–medium: PyTorch/transformers; fixed-length 10 s windows → long files need chunking + pooling |
| Variants | `larger_clap_music`, `larger_clap_general` (LAION) [K]: evaluate the general vs. music-specialised split. **Microsoft CLAP**: licence **not verified** this session |

### 2.2 YAMNet (Google)
| Aspect | Finding |
|---|---|
| Licence | Apache-2.0 per a mirror listing [T] S52; official TF Hub/Kaggle model page not checked → verify [K] |
| Classes | 521 AudioSet classes [K] |
| Accuracy | Lower than PANNs CNN14 on AudioSet mAP [K] |
| Hardware | MobileNet-based, very cheap on CPU [K] |
| Use | Fast content-type routing (speech/music/SFX), coarse tags |

### 2.3 PANNs (Kong et al., 2019/2020)
| Aspect | Finding |
|---|---|
| Licence | Code MIT; pretrained weights reported as **CC BY 4.0**; AudioSet class labels **CC BY-SA 4.0** [T] S53. Verify on the original repo (qiuqiangkong/audioset_tagging_cnn) and Zenodo |
| Accuracy | CNN14 AudioSet mAP ≈ 0.43 per the paper [K]. Strong general tagger |
| Hardware | ~80M params (CNN14) [K]; CPU feasible but slower; GPU preferred for back-fills |
| Use | Multi-label tags with calibrated scores; complements CLAP's open vocabulary |
| Alternatives | EfficientAT (MobileNet variants distilled from transformers) [T] S53-alt; BEATs (Microsoft): **licence not verified** |

### 2.4 Whisper (OpenAI)
| Aspect | Finding |
|---|---|
| Licence | MIT (code and weights) [K]; CTranslate2 conversion of large-v3-turbo tagged MIT [V] S54 |
| Accuracy | large-v3-turbo keeps the large-v3 encoder with a 4-layer decoder (vs 32): near-large-v3 transcription accuracy, **no translation task** [T] S54 |
| Speed (vendor blog, unverified) | 13-min clip on GPU via faster-whisper: turbo fp16 ~19 s, ~2.5 GB VRAM vs large-v3 ~52 s, ~4.5 GB [T] S54 → ~40× real time |
| Hardware | GPU strongly preferred (T4/L4 class). CPU int8 workable for low volume [K] |
| Use | Dialogue/VO libraries, podcast assets: transcript-searchable audio; language detection |
| Caveat | Hallucination on music or silence is known [K] → run only on speech-detected segments (VAD) |

### 2.5 Other open-source embedding models (shortlist for later benchmarking)
| Model | Use | Licence status |
|---|---|---|
| OpenL3 | General audio embeddings | [K] verify |
| MERT | Music representation | [K] possibly non-commercial → verify |
| Essentia models (Discogs-EffNet, etc.) | Music tagging, genre, mood | **CC BY-NC-ND 4.0** (non-commercial) [V] S44 → ❌ without licence |
| madmom | Beat/tempo | Code BSD, models reportedly non-commercial [K] → verify |

## 3. Inference cost estimates (illustrative)

GPU price inputs: L4 ~$0.39–$0.80 per GPU-hour depending on provider (RunPod ~$0.39–0.49, Modal ~$0.80 serverless) [T] S56.

| Workload | Throughput assumption [A] | Cost per hour of audio | Cost per 10,000 SFX files (avg 8 s ≈ 22 h audio) |
|---|---|---|---|
| CLAP audio embedding (GPU L4) | ~1,000× real time with batching [A, benchmark TQ-4] | ≈ $0.0008 | ≈ $0.02 |
| CLAP on CPU (4 vCPU) | ~30–100× real time [A] | depends on instance; ~$0.002–0.01 | ≈ $0.05–0.20 |
| PANNs CNN14 (GPU) | ~500× real time [A] | ≈ $0.0016 | ≈ $0.04 |
| Whisper large-v3-turbo (GPU L4) | ~40× real time [T] S54 | ≈ $0.02 | n/a (speech only) |
| Preview + peaks + loudness (FFmpeg, CPU) | ~50–200× real time [A] | ≈ $0.001–0.005 | ≈ $0.05–0.10 |

**Conclusion:** At MVP scale, **AI inference is a small cost per asset**. Storage dominates COGS (see [12_unit_economics.md](12_unit_economics.md)). The real cost risk is **idle GPU capacity**, so use scale-to-zero serverless GPU or CPU batching. **All throughput figures must be benchmarked (TQ-4).**

## 4. Licensing summary (gate for commercial use)
| Component | Status | Action |
|---|---|---|
| LAION CLAP weights | Apache-2.0 [V] | ✅ Use; document training-data risk |
| PANNs weights | CC BY 4.0 [T] | ✅ with attribution, after verification |
| AudioSet labels | CC BY-SA 4.0 [T] | ✅ attribution + share-alike on label lists |
| YAMNet | Apache-2.0 [T] | ✅ after verification |
| Whisper | MIT [K/V] | ✅ |
| Essentia library and models | AGPL / CC BY-NC-ND [V] | ❌ unless commercially licensed |
| Microsoft CLAP, BEATs, MERT | Unverified | ⏸ verify first |

## 5. Required evaluation plan (before committing to MVP AI claims)
1. **Build an eval set:** 2,000–5,000 SFX with trusted UCS labels (own recordings plus CC0/CC BY Freesound sounds, *respecting the API terms*, or vendor-provided samples under agreement).
2. **Metrics:** UCS category top-1/top-5 accuracy; tag precision@5; text-to-audio retrieval Recall@10 and nDCG@10 on 200 realistic queries written by sound designers; similarity relevance judged by experts.
3. **Compare:** CLAP general vs music vs fused; prompt templates ("the sound of {x}", UCS descriptions); CLAP+PANNs fusion.
4. **Go/no-go threshold [A]:** text→audio Recall@10 ≥ 0.6 on the expert query set, and UCS top-5 ≥ 0.6. Below that, position the features as "suggestions" and lean on keyword/metadata search.
5. **Latency:** p95 query embedding + ANN search < 300 ms at 1M vectors per tenant.

## 6. Data and ethics policy (recommendation)
- **No training on customer audio by default.** Fine-tuning heads on customer-confirmed tags only with explicit opt-in, per organisation. This is a trust differentiator for professionals with licensed libraries.
- Store embeddings as tenant data (deleted with the tenant).
