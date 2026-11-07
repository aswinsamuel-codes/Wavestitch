# AI Pipeline (Phase 0.7)

Status: Proposed · Date: 2026-11-07 · Module: M4 + M5 · Model evaluation: [09](../research/09_ai_model_evaluation.md)

## 1. Provider abstraction
```python
class AudioEmbedder(Protocol):
    model_id: str          # e.g. "laion-clap-htsat-unfused@<sha>"
    dims: int
    def embed_audio(self, pcm_48k_mono: np.ndarray) -> np.ndarray: ...   # → (n_chunks, dims)
    def embed_text(self, texts: list[str]) -> np.ndarray: ...

class AudioTagger(Protocol):        # PANNs / YAMNet (P1)
    model_id: str
    def tag(self, pcm: np.ndarray) -> list[tuple[str, float]]: ...

class Transcriber(Protocol):        # Whisper (P1)
    def transcribe(self, pcm_16k: np.ndarray) -> Transcript: ...
```
All models are pinned by weights hash in `model_version`. The search module queries by `model_id`, so two embedding models can coexist during a migration.

## 2. Embedding & suggestion flow

```mermaid
flowchart TD
    A[asset ready from M3] --> D[Decode original → mono, resample to model rate<br/>CLAP: 48 kHz]
    D --> C{Duration}
    C -- "≤ 10 s" --> E1[Pad/repeat to 10 s window]
    C -- "> 10 s" --> E2[Chunk: 10 s windows, 5 s hop<br/>skip chunks that are > 90% silence<br/>cap at N=60 chunks, evenly sampled]
    E1 & E2 --> EMB[CLAP audio encoder<br/>batch on GPU or CPU]
    EMB --> POOL[Pooled vector = L2-normalised mean<br/>+ chunk vectors stored for P1]
    POOL --> DB[(embedding halfvec 512)]
    POOL --> ZS[Zero-shot scoring vs<br/>pre-computed text vectors]
    ZS --> UCS[UCS subcategory prompts<br/>'the sound of {CatShort}: {Explanation}']
    ZS --> FREE[Curated tag vocabulary<br/>~2,000 SFX descriptors]
    UCS & FREE --> CAL[Calibrate: softmax temperature,<br/>keep top-k with score ≥ threshold]
    CAL --> SUG[(ai_suggestion: pending)]
    SUG --> HITL[User bulk review<br/>accept → asset_tag / ucs_cat_id]
    HITL -.opt-in only.-> TRAIN[Per-org fine-tuned head P2]
```

- **Text vectors for vocabularies are pre-computed once per model** (UCS ≈ 750 subcategories [T] S36 + free vocabulary), so tagging is just a matrix multiply.
- **Query embedding:** text queries are embedded at request time (CPU, cached per normalised query string, LRU + Valkey).
- **Query by example:** an uploaded clip (not stored, or stored temporarily) is embedded and searched.

## 3. Search ranking (M5)
1. Candidate generation: FTS (top 200) ∪ ANN (top 200, `hnsw.ef_search` tuned) inside the org scope.
2. Reciprocal Rank Fusion (k=60) → top 50.
3. Business rules: boost exact filename/UCS match; demote failed or partial assets; respect filters strictly (filters are applied inside SQL).
4. Log `search_event` (query, mode, clicked rank, auditions, downloads) → offline relevance evaluation (nDCG) and future learning-to-rank (P2).

## 4. Infrastructure for inference
| Phase | Deployment |
|---|---|
| MVP | CLAP on **CPU workers** (batch 16–32) for steady ingest; **serverless GPU** (scale-to-zero) for bulk back-fills over ~10k files. Text encoder runs in the API process (CPU, warm) or a small dedicated service |
| P1 | Add PANNs (same GPU worker image) and Whisper (GPU, only for assets classified as speech) |
| P2 | Dedicated GPU pool when sustained utilisation > ~40% [A]; ONNX/TensorRT export for throughput |

## 5. Quality monitoring
- Offline eval set (see [09 §5](../research/09_ai_model_evaluation.md)) run in CI for every model change: Recall@10, nDCG@10, UCS top-5.
- Online: suggestion acceptance rate per category; zero-result searches; search → audition → download funnel.
- **Release gate:** a new model version must not regress Recall@10 by > 2 points on the eval set [A].

## 6. Cost & quota metering
- Meter **audio-seconds analysed** per org (`usage_event: ai_audio_seconds`).
- Back-fills after a model upgrade are **not charged** to customers.

## 7. Risks
| Risk | Mitigation |
|---|---|
| Zero-shot UCS accuracy too low | Present as suggestions; confidence thresholds; collect accepted labels (opt-in) for a supervised head |
| Embedding model change requires re-embedding everything | Dual-index period; model_id column; background back-fill |
| Long files dominated by one event | Chunk vectors (P1) + max-sim retrieval for long files |
| Training-data provenance of open models | Legal review; document model sources; offer opt-out of AI features per org |
