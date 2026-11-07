# Technology Decision Records

Date: 2026-11-07 · Licence column: [V] verified this session, [T] third-party, [K] prior knowledge, **must be verified in the licence audit (TQ-1) before adoption**.

| ID | Area | Choice | Alternatives considered | Why | Licence | Status |
|---|---|---|---|---|---|---|
| TDR-01 | Frontend framework | Next.js (App Router) + React + TypeScript | Vite SPA, SvelteKit, Remix | Ecosystem, SSR for public/share pages, hiring | MIT [K] | Proposed |
| TDR-02 | Styling/UI kit | Tailwind CSS + shadcn/ui (Radix primitives) | MUI, Chakra, Mantine | Owned components, accessible primitives | MIT [K] | Proposed |
| TDR-03 | Waveform | WaveSurfer.js v7 with server peaks; peaks.js for zoomable views if needed | Custom canvas | Mature; officially recommends pre-computed peaks | BSD-3 [V] S48; peaks.js licence to verify | Proposed |
| TDR-04 | Upload client | Uppy + S3 multipart (or thin custom) | tus | Resumable, direct-to-storage | MIT [K] | Proposed |
| TDR-05 | Data fetching | TanStack Query; TanStack Virtual for lists | SWR | Caching, virtualization | MIT [K] | Proposed |
| TDR-06 | Backend | Python 3.12 + FastAPI + Pydantic v2 | Django/DRF, NestJS, Go | Shared language with ML workers; OpenAPI | MIT [K] | Proposed |
| TDR-07 | ORM / migrations | SQLAlchemy 2.0 + Alembic | SQLModel, Django ORM | Mature, async support | MIT [K] | Proposed |
| TDR-08 | Database | PostgreSQL 16+ (managed) | MySQL, MongoDB | Relational integrity, FTS, RLS, extensions | PostgreSQL [K] | Proposed |
| TDR-09 | Vectors | pgvector (HNSW, halfvec) | Qdrant, Weaviate, OpenSearch | One datastore (ADR-002) | PostgreSQL licence [T] S55 | Proposed |
| TDR-10 | Task queue | Celery 5 | Dramatiq, ARQ, Procrastinate, Temporal | Routing, retries, maturity (ADR-004) | BSD [K] | Proposed |
| TDR-11 | Broker / cache | Valkey (managed Redis-compatible) | Redis, RabbitMQ | Clear BSD licence after Redis's 2024–2025 licence changes [K, verify] | BSD-3 [K] | Proposed |
| TDR-12 | Object storage | Cloudflare R2 (+ B2 DR) | AWS S3, B2 primary, self-hosted MinIO | Zero egress (ADR-003); MinIO community archived [T] S43 | n/a (service) | Proposed |
| TDR-13 | Media toolkit | FFmpeg/ffprobe (LGPL build) | GStreamer | Universal format support | LGPL-2.1+ [V] S46 | Proposed |
| TDR-14 | Waveform peaks | BBC audiowaveform | Custom NumPy | Officially referenced by WaveSurfer | GPL-3 [K] (server-side CLI) | Proposed |
| TDR-15 | Audio analysis | librosa, SoundFile, pyloudnorm | Essentia (AGPL), PyDub | Permissive licences | ISC / BSD-3 (libsndfile LGPL) / MIT [K] | Proposed |
| TDR-16 | Embedded metadata | wavinfo (BWF/iXML) + mutagen (ID3) + ffprobe | ExifTool | Coverage of pro WAV chunks | MIT [K] / GPL-2+ [K] | Proposed (verify mutagen use) |
| TDR-17 | Text-audio embeddings | LAION CLAP (HTSAT) | MS-CLAP, OpenL3 | Apache-2.0 weights, zero-shot quality | Apache-2.0 [V] S50 | Proposed (pending eval) |
| TDR-18 | Event tagging | PANNs CNN14 (P1) | YAMNet, EfficientAT, BEATs | Strong AudioSet tagging | Code MIT / weights CC BY 4.0 [T] S53 | Proposed P1 |
| TDR-19 | Transcription | Whisper large-v3-turbo via faster-whisper (P1) | Cloud ASR APIs | Accuracy, MIT, self-host | MIT [V] S54 | Proposed P1 |
| TDR-20 | Time-stretch | Rubber Band (P2, commercial licence if distributed) | SoundTouch (LGPL) | Quality | GPL / commercial [V] S45 | Deferred |
| TDR-21 | Fingerprint | Chromaprint library (P1) | Embedding near-dup only | Robust to re-encodes | LGPL-2.1+ [T] S47 | Proposed P1 |
| TDR-22 | Malware scan | ClamAV (isolated service) | Commercial AV API | Free, mature | GPL-2 [K] | Proposed |
| TDR-23 | Auth | Managed OIDC IdP (Clerk / WorkOS / Auth0 / Supabase Auth) | Keycloak, Ory, Zitadel | Speed, SSO path | Commercial | **Founder decision D-04** |
| TDR-24 | Billing | Paddle (MoR) at launch | Stripe Billing + Tax; Razorpay (India) | Tax compliance offload | Commercial | **Founder decision D-05** |
| TDR-25 | Hosting | Managed containers (Fly.io / Render / Cloud Run / ECS Fargate) | Kubernetes | Low ops | Commercial | **Founder decision D-06** (region + vendor) |
| TDR-26 | Serverless GPU | Modal or RunPod serverless | Reserved GPU VM | Scale-to-zero | Commercial | Proposed (DPA check IQ-5) |
| TDR-27 | Observability | OpenTelemetry + Grafana Cloud (or Datadog) + Sentry | ELK self-host | Vendor-neutral instrumentation | Apache-2.0 (OTel) [K] | Proposed |
| TDR-28 | CI/CD | GitHub Actions + Terraform/OpenTofu | GitLab CI, Pulumi | Standard | MPL-2.0 (OpenTofu) [K] | Proposed |
| TDR-29 | Containers | Docker / OCI images | — | Standard | Apache-2.0 [K] | Proposed |
| TDR-30 | Licence scanning | pip-licenses + license-checker (npm) + SBOM (Syft) | FOSSA | Enforce ADR-009 | MIT/Apache [K] | Proposed |

## Desktop alpha additions (ADR-013, 2026-11-07)
| ID | Area | Choice | Alternatives considered | Why | Licence | Status |
|---|---|---|---|---|---|---|
| TDR-31 | Desktop shell | Electron + electron-builder | Tauri, JUCE, Qt | Same Chromium audio engine on Mac and Windows; official native file drag-out (`startDrag`) [V] S69 | MIT [K] | Proposed |
| TDR-32 | Local AI runtime | Transformers.js + onnxruntime-node running `Xenova/clap-htsat-unfused` (ONNX, 512-dim) | Python sidecar + PyTorch | No Python runtime to bundle; same model family as the web plan [V] S70 | Apache-2.0 / MIT [K] | Proposed (benchmark DQ-D2) |
| TDR-33 | Local database | SQLite (better-sqlite3) + FTS5 + sqlite-vec | LanceDB, DuckDB | Single file, zero setup; sqlite-vec MIT/Apache, **pre-v1** [V] S71 | Public domain / MIT / MIT-Apache | Proposed |
| TDR-34 | Waveform peaks (desktop) | Own peak generator from FFmpeg-decoded PCM | BBC audiowaveform | audiowaveform is GPL-3, not bundleable in closed source [K] | — | Proposed |
| TDR-35 | Metadata (desktop) | Own RIFF chunk reader (bext/iXML) + music-metadata | mutagen (GPL) | Permissive licensing for distribution | music-metadata licence to verify | Proposed |
| TDR-36 | Auto-update | electron-updater + private GitHub Releases | Squirrel, custom | Simple for alpha | MIT [K] | Proposed |
| TDR-38 | Stem separation | HT-Demucs 4-stem ONNX (`StemSplitio/htdemucs-onnx`, `htdemucs_fp16weights.onnx`, 166 MB, SHA-256 checked) via onnxruntime-node in a worker; 7.8 s chunks, 25% overlap-add; 32-bit float WAV stems with a bext description | Spleeter (MIT, lower quality), cloud APIs (LALAL.AI, etc.) | Founder choice for quality (2026-11-07) | Code MIT [V]; port labelled MIT; **weights' commercial status unresolved** (trained on MUSDB18, which is non-commercial) [T] S75 | **Alpha/testing only until the licence is cleared** |
| TDR-37 | Signing | Apple Developer Program (notarization) now; Windows signing before public beta (cert or Microsoft Artifact Signing) | Unsigned | Avoid Gatekeeper blocks for the Logic tester [K]; SmartScreen acceptable for 2 known Windows testers | — | Proposed (cost ~$99/yr Apple [K]; ~$10/mo Microsoft [T] S72) |
