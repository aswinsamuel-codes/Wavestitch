# 08 — Technical Stack Evaluation (Phase 0.6)

Research date: 2026-11-07 · Labels: [V] official docs / licence file, [T] third-party, [K] prior knowledge (verify), [A] assumption.
Licences marked [K] were **not re-verified this session**. Item TQ-1 in the open questions requires a licence audit (e.g. a `pip-licenses` / `license-checker` scan) before code is written.

## 1. Frontend

### Recommendation: Next.js (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui
| Option | Fit | Notes |
|---|---|---|
| **Next.js + React + TS** | ✅ | Largest ecosystem; SSR for marketing/SEO pages and public share links; route handlers useful for BFF (backend-for-frontend) concerns. MIT [K] |
| Vite + React SPA | ✅ alternative | Simpler for a pure app (the library UI is mostly client-side). Needs a separate site for marketing/SEO. **Valid choice if the team prefers to avoid Next.js server complexity** |
| SvelteKit / Remix | ◐ | Good, but smaller hiring pool [A] |
| Tailwind + shadcn/ui | ✅ | shadcn copies components into the repo (no runtime lock-in); MIT [K] |

**Decision note:** Use Next.js mainly as the UI layer and keep **all business logic in the FastAPI backend**. Do not split domain logic across Next.js server actions and FastAPI (avoids two backends). See ADR-005.

### Waveform visualisation: WaveSurfer.js (BSD-3-Clause) [V] S48
- **Critical finding [V] S48:** WaveSurfer decodes audio entirely in the browser via Web Audio, so **large files may fail to decode due to memory limits**. The maintainers recommend **pre-computed peaks**, e.g. generated with BBC `audiowaveform`. Streaming is only supported with pre-decoded peaks and duration.
- **Design consequence:** The server generates peaks (`audiowaveform` → JSON/binary, 8-bit) at ingest. The browser loads peaks plus a compressed streaming preview, **never the original WAV**.
- Alternative: BBC **peaks.js** (uses the same `audiowaveform` data) [V] S49; good for zoomable editing views. Licence not verified (TQ-1).

### Web Audio API
| Use | Verdict |
|---|---|
| Playback, gain, simple metering, A/B switching | ✅ Suitable |
| Client-side analysis of short previews (e.g. a live spectrum) | ✅ via AnalyserNode |
| Heavy processing (time-stretch, restoration, full-file decode of multi-GB WAVs) | ❌ Do it server-side |

### Playback and streaming compatibility
- Use **HTML `<audio>` with HTTP range requests** on compressed previews. Codec choice [K]:
  - **AAC (in MP4/M4A)** is the most universally supported (Safari included).
  - **Opus** is efficient; Safari support has historically been incomplete in some containers → **verify on current Safari** (TQ-2).
  - **MP3** is universally supported, slightly less efficient.
- **Recommendation:** Generate **AAC 256 kbps** (or MP3 320) as the default preview, plus an optional Opus variant. Originals (WAV/BWF/AIFF/FLAC) are available as download.
- HLS/DASH is unnecessary for clips. Reconsider for long-form (>30 min) review audio [A].

### Large-file uploads
- **S3-compatible multipart upload directly from the browser to object storage** with presigned part URLs (server never proxies bytes). Uppy (MIT [K]) with AWS S3 multipart plugin, or a custom implementation.
- Resumable across page reloads (persist upload state). Parallel parts (e.g. 4–6), chunk size 8–64 MB [A].
- Folder upload (`webkitdirectory`) for library ingest. Pre-hash files client-side (SHA-256 in a Web Worker) to skip duplicates before upload [A]. Optional: this is CPU-heavy for TB-scale libraries.
- Alternative: tus protocol (tusd). More moving parts; S3 multipart is enough.

### Browser memory constraints
- Never decode full originals in the browser (see WaveSurfer finding).
- Virtualise long result lists (e.g. TanStack Virtual, MIT [K]).
- Limit simultaneous audio elements; reuse one player.
- Assume roughly 1–4 GB usable tab memory on typical desktops [A]; mobile is much lower.

## 2. Backend

### Recommendation: Python 3.12+ / FastAPI / Pydantic v2 / SQLAlchemy 2.0 (async) / Alembic
| Criterion | Assessment |
|---|---|
| Why Python | The audio/ML ecosystem (librosa, PyTorch, transformers, faster-whisper) is Python-native. A single language for API and workers reduces cognitive load |
| FastAPI | OpenAPI generated automatically (useful for the public API and TS client generation); async I/O; MIT [K] |
| Pydantic v2 | Validation and serialisation; MIT [K] |
| SQLAlchemy 2.0 + Alembic | Mature ORM + migrations; MIT [K] |
| Alternatives | Django + DRF (batteries included: admin, auth; slower async story); Node/NestJS (splits language from the ML workers); Go (fast, but loses the Python ML ecosystem for workers) |
| Verdict | ✅ FastAPI. **Use Django-admin-like tooling alternatives (e.g. SQLAdmin, MIT [K]) for internal admin** |

### REST architecture
- Resource-oriented REST under `/api/v1/…`, JSON, cursor pagination, idempotency keys on POSTs that create billable work. Details: [api_design.md](../architecture/api_design.md).
- **API versioning:** URL major version (`/v1`), additive changes only within a version, deprecation headers (`Deprecation`, `Sunset`). Keep the internal web API and the public API on the same versioned surface to avoid duplication.

### Authentication and authorization
| Option | Pros | Cons |
|---|---|---|
| **Managed auth (e.g. Clerk, WorkOS AuthKit, Auth0, Supabase Auth)** | Fast; MFA, social login; SSO/SAML available (WorkOS strong for B2B SSO) | Vendor cost and lock-in; pricing **not verified this session** |
| Self-hosted Keycloak / Ory / Zitadel | Control, no per-MAU cost | Ops burden |
| Build it in-app (fastapi-users etc.) | Free | Security risk; SSO later is hard |
- **Recommendation:** Managed OIDC provider with a B2B SSO path (founder decision D-04). The backend validates JWTs (JWKS) and keeps **authorization (RBAC, tenant membership) in our own DB**, not in the IdP.

### Background processing
Audio processing and AI inference are long-running and must be asynchronous.
| Option | Pros | Cons |
|---|---|---|
| **Celery + Redis/Valkey broker** | Most mature Python task queue; routing to dedicated queues (cpu, gpu); retries, rate limits, chords/chains | Complex config; long-task visibility-timeout pitfalls with Redis (use `acks_late`, tune visibility timeout) [K] |
| Dramatiq | Simpler, reliable defaults | Smaller ecosystem |
| ARQ / SAQ (asyncio) | Lightweight, async-native | Less mature for heavy pipelines |
| Postgres-backed queue (Procrastinate, etc.) | No extra infra; transactional enqueue | Throughput limits at scale [A] |
| Temporal | Durable workflows, excellent for multi-step pipelines | Heavier ops; later-stage option |
- **Recommendation:** **Celery** with separate queues `ingest`, `audio_cpu`, `ml_gpu`, `maintenance`. Use the **transactional outbox** pattern (write a job row in Postgres in the same transaction, then dispatch) to avoid lost jobs. Reassess Temporal at P2.

### WebSockets / real-time
- MVP needs **processing-progress updates** and notifications only → **Server-Sent Events (SSE)** or polling are enough. Real-time co-presence is not needed.
- WebSockets (FastAPI native, or a managed service) when live comments or presence arrive (P1–P2).

### Multi-tenant architecture
- **Shared database, shared schema, `org_id` on every tenant-owned row**, enforced by (1) application-level scoping in a repository layer and (2) **PostgreSQL Row-Level Security** as defence in depth (ADR-007).
- Object storage keys prefixed `org/{org_id}/…`; presigned URLs only issued after an authz check.
- Schema-per-tenant / DB-per-tenant only for enterprise contracts that require it (P3).

## 3. Database: PostgreSQL 16+ with pgvector
| Domain | Fit |
|---|---|
| Users, orgs, memberships, roles | ✅ relational |
| Projects, collections, libraries | ✅ |
| Audio metadata (technical + embedded + AI tags) | ✅ typed columns for core fields + `JSONB` for raw embedded chunks (bext/iXML) |
| Licensing records | ✅ relational with history |
| Subscriptions | ✅ mirror of billing provider state (provider = source of truth) |
| Transactions | ✅ append-only ledger tables |
| Audit history | ✅ append-only, partitioned by month |
| Full-text search | ✅ `tsvector` + GIN; `pg_trgm` for fuzzy filenames |
| Vector search | ✅ **pgvector** (PostgreSQL licence, permissive) [T] S55 |

**pgvector assessment [T] S55:**
- HNSW gives a better speed/recall trade-off than IVFFlat, but slower builds and more memory. One cloud vendor benchmark reported ~6× gain over IVFFlat at 1M vectors.
- Practical ceilings cited range from ~10–20M vectors to ~100M (vendor claims, not verified).
- Bulk-load first, then build the index. Filtered queries need tuning (`hnsw.ef_search`).
- **Fit:** At 512-dim CLAP embeddings, 10M assets ≈ 20 GB raw float32 (≈10 GB with `halfvec`) plus index [A calc]. That is comfortably inside one Postgres instance for the MVP and early growth.
- **Multi-tenant filtering risk:** HNSW plus a strict `org_id` filter can reduce recall for small tenants in a big shared index. Mitigations: iterative index scans (pgvector ≥0.8 [K]), partial indexes per large tenant, or exact search for small tenants (cheap below ~50k vectors [A]).
- **Exit path:** If scale exceeds pgvector comfort, move vectors to Qdrant / OpenSearch / Vespa behind the `SearchIndex` interface (ADR-002).

## 4. Audio processing libraries

| Library | Licence | Capabilities used | Commercial-use notes | Verdict |
|---|---|---|---|---|
| **FFmpeg / ffprobe** | LGPL-2.1+ by default; **GPL if built with `--enable-gpl` components** (e.g. libx264) [V] S46 | Decode/convert any format, resample, previews (AAC/MP3/Opus), `ebur128`/`loudnorm` loudness, `silencedetect`, spectrogram images (`showspectrumpic`), metadata via ffprobe | Run as a **subprocess on our servers** (not distributed) → LGPL/GPL distribution obligations are generally not triggered by SaaS use [K], but **use an LGPL build without nonfree codecs anyway**, and legal-review it. The `f_ebur128` filter's licence status was flagged by one mirror → verify (TQ-1) | ✅ **Core** |
| **audiowaveform** (BBC) | GPL-3.0 [K] | Waveform peak data for WaveSurfer/peaks.js | Server-side CLI only, not distributed [K] | ✅ |
| **librosa** | ISC [K] | Features, onset/tempo estimates, spectrograms, `effects.split` silence detection | Permissive | ✅ (analysis) |
| **SoundFile** (libsndfile) | BSD-3 wrapper; libsndfile LGPL-2.1 [K] | Fast WAV/FLAC/AIFF I/O to NumPy | Permissive / LGPL dynamic | ✅ |
| **PyDub** | MIT [K] | Convenience wrapper over FFmpeg | Adds little over calling FFmpeg directly; slow for large files [K] | ❌ Not needed |
| **Essentia** | **AGPL-3.0** for non-commercial; commercial licence from UPF MTG; **pre-trained models CC BY-NC-ND 4.0** [V] S44 | Excellent MIR features (key, BPM, loudness, descriptors) | **AGPL network clause applies to SaaS**; models are **non-commercial**. Needs a paid licence | ⚠️ **Avoid unless licensed** |
| **Rubber Band Library** | **GPL** or commercial licence [V] S45 | High-quality time-stretch / pitch-shift (tempo-matched previews) | GPL; buy a commercial licence if it is ever distributed (e.g. desktop companion) | ⏸ P2+ only |
| **pyloudnorm** | MIT [K] | ITU-R BS.1770 integrated loudness in Python | Permissive; alternative to FFmpeg ebur128 | ✅ (cross-check) |
| **Chromaprint** | Library **LGPL-2.1+**; `fpcalc` tool may be GPL-2.0+ in some distros [T] S47 | Acoustic fingerprinting for near-duplicate detection | Server-side use OK [K]; AcoustID **service** terms not checked | ◐ P1 (duplicates) |
| **wavinfo** (Python) | MIT [K] | Read BWF `bext`, iXML, ADM chunks | Small, verify maintenance | ✅ candidate |
| **mutagen** | GPL-2.0+ [K] | ID3/MP4/FLAC tag read/write | Server-side only; verify | ◐ |
| **ExifTool** | Perl Artistic/GPL [K] | Broad metadata read/write incl. RIFF/BWF | Server-side CLI | ◐ fallback |

### Capability coverage
| Capability | Primary tool | Backup |
|---|---|---|
| Conversion / previews | FFmpeg | — |
| Waveform generation | audiowaveform | FFmpeg + NumPy peaks |
| Duration / SR / channels / bit depth | ffprobe | SoundFile |
| Loudness (LUFS, true peak, LRA) | FFmpeg `ebur128` | pyloudnorm |
| Normalisation (preview only; never mutate originals) | FFmpeg `loudnorm` (two-pass) | — |
| Spectrogram | FFmpeg `showspectrumpic` or librosa + image render | — |
| Silence detection | FFmpeg `silencedetect` | librosa `effects.split` |
| Fingerprinting / duplicates | SHA-256 (exact) + Chromaprint (acoustic) + embedding cosine (near) | — |
| Embedded metadata | ffprobe + wavinfo (BWF/iXML) + mutagen (ID3) | ExifTool |
| BPM / key (music) | librosa (basic accuracy) | Essentia (licence needed) |

## 5. Open technical questions
| ID | Question |
|---|---|
| TQ-1 | Full dependency licence audit (pip/npm) including peaks.js, Uppy, wavinfo, FFmpeg filter licences |
| TQ-2 | Current Safari support for Opus in WebM/Ogg/MP4 containers; pick the default preview codec |
| TQ-3 | Can a browser drag-out deliver a file into Pro Tools / Reaper timelines? (Chrome `DownloadURL` drag is non-standard) → desktop companion requirement |
| TQ-4 | CLAP CPU inference throughput on our target instance type (benchmark) |
| TQ-5 | pgvector recall with `org_id` filters at 1M-vector tenants (benchmark) |
