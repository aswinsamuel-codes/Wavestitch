# Architecture Decision Records

Format: Context → Decision → Consequences → Status. Status values: **Proposed** (needs founder approval), Accepted, Superseded.
Date of all records: 2026-11-07.

---

## ADR-001 — Modular monolith with separate worker process types
- **Context:** Small team (≈4 engineers); strongly coupled domain transactions (assets, quotas, audit); heavy media and ML workloads that need isolation and independent scaling.
- **Decision:** One Python backend codebase with enforced module boundaries (import-linter), deployed as `api`, `worker-cpu`, `worker-gpu` (+ `scheduler`). Next.js `web` is a separate deployable. Microservices are extracted only on measured need.
- **Consequences:** + Simple ops, local ACID, fast iteration. − Discipline needed to keep boundaries; a single DB is a shared dependency.
- **Status:** Proposed

## ADR-002 — PostgreSQL + pgvector for metadata and vectors (no separate vector DB at MVP)
- **Context:** Need hybrid keyword + vector search with strict tenant filters; expected ≤ 10M vectors in year one [A]. pgvector HNSW is competitive at ~1M+ scale [T] S55.
- **Decision:** Store embeddings in Postgres (`halfvec(512)`, HNSW). Hide search behind a `SearchIndex` interface so it can move to Qdrant/OpenSearch/Vespa later.
- **Consequences:** + One datastore, transactional consistency, RLS applies to vectors. − Filtered-ANN recall and memory pressure must be benchmarked (TQ-5); a migration may be needed at scale.
- **Status:** Proposed

## ADR-003 — Cloudflare R2 as primary object storage; Backblaze B2 as DR replica
- **Context:** Audition-heavy, egress-heavy workload; S3 egress ~$0.09/GB vs R2 $0 egress [T] S40, S42; B2 cheapest for cold copies [T] S41.
- **Decision:** R2 for originals, previews and peaks; nightly replication of originals to B2 in another provider; S3-compatible `ObjectStore` adapter only.
- **Consequences:** + Predictable bandwidth cost; provider exit path. − R2 S3-API gaps must be checked; two providers to manage; region and jurisdiction options to verify (IQ-2).
- **Status:** Proposed

## ADR-004 — Celery with Valkey broker; transactional outbox
- **Context:** Long-running, multi-step media and ML jobs; need routing to CPU/GPU queues, retries and scheduling.
- **Decision:** Celery 5 with Valkey (Redis-compatible, BSD) as broker; `acks_late`; per-queue workers; outbox table for reliable dispatch. Re-evaluate Temporal in P2.
- **Consequences:** + Mature, well known. − Celery config complexity; visibility-timeout tuning for long tasks.
- **Status:** Proposed

## ADR-005 — Next.js as UI layer only; all business logic in FastAPI
- **Context:** Next.js server features could become a second backend.
- **Decision:** Next.js handles rendering, routing and auth session handling; it calls FastAPI through a generated TS client. No domain logic or DB access in Next.js.
- **Consequences:** + Single source of business rules, and the public API = internal API. − Some latency from the extra hop for SSR pages (acceptable).
- **Status:** Proposed

## ADR-006 — Managed identity provider; authorization in our DB
- **Context:** Security-sensitive; B2B SSO needed later; small team.
- **Decision:** Use a managed OIDC IdP (vendor = founder decision D-04). Validate JWTs in the API. Roles and memberships live in Postgres.
- **Consequences:** + No password storage; MFA/SSO available. − Vendor cost and lock-in; user-sync edge cases.
- **Status:** Proposed

## ADR-007 — Shared-schema multi-tenancy with Row-Level Security
- **Context:** Many small tenants; isolation is critical (licensed libraries).
- **Decision:** `org_id` on all tenant tables; RLS policies with `SET LOCAL app.current_org`; repository-layer scoping; CI cross-tenant tests. Dedicated DB per tenant only for Enterprise (P3).
- **Consequences:** + Cheap, simple ops, defence in depth. − Pooling and RLS interplay must be tested (DQ-3); noisy-neighbour risk.
- **Status:** Proposed

## ADR-008 — Server-side waveform peaks and compressed previews; never decode originals in the browser
- **Context:** WaveSurfer docs warn that large files can fail to decode in the browser and recommend pre-decoded peaks (audiowaveform) [V] S48.
- **Decision:** Generate `peaks.dat` (8-bit) and an AAC preview at ingest; browsers stream previews with range requests.
- **Consequences:** + Fast, memory-safe UI on any file size. − Extra processing and storage (~11% overhead [calc]).
- **Status:** Proposed

## ADR-009 — Licence gate: no AGPL or non-commercial components in the SaaS core without a commercial licence
- **Context:** Essentia is AGPL with CC BY-NC-ND models [V] S44; Rubber Band is GPL/commercial [V] S45; FFmpeg is LGPL/GPL depending on build [V] S46.
- **Decision:** CI licence scanning with an allow-list (MIT, BSD, Apache-2.0, ISC, PostgreSQL, MPL-2.0, LGPL as a separate process or dynamically linked). AGPL/NC/GPL-in-distributed-software need explicit ADR approval. FFmpeg built LGPL-only, without `--enable-gpl`/`--enable-nonfree`.
- **Consequences:** + Avoids future relicensing crises. − Some best-in-class MIR features (key/BPM via Essentia) are delayed or need budget.
- **Status:** Proposed

## ADR-010 — No training on customer audio by default
- **Context:** Pros hold licensed libraries; trust is a differentiator; legal exposure.
- **Decision:** Pre-trained models only; per-org opt-in for fine-tuning on confirmed labels; documented in ToS and the privacy policy.
- **Consequences:** + Trust and sales enablement. − Slower model improvement.
- **Status:** Proposed

## ADR-011 — Web-first; desktop companion deferred to P2
- **Context:** Brief requires a web application first. DAW spotting and drag-in need native integration (TQ-3).
- **Decision:** MVP delivers download / batch download / (where supported) browser drag-out. Build a desktop companion in P2 for local indexing, previews-only mode and DAW spotting.
- **Consequences:** + Faster MVP, wider reach (reviewers, producers). − **Weaker than incumbents in the core "spot to timeline" workflow** (risk R-03); some pros may not adopt until P2.
- **Status:** **Superseded by ADR-013** (2026-11-07)

## ADR-012 — Merchant-of-Record billing for launch (pending)
- **Context:** Global B2C self-serve needs VAT/GST/sales-tax compliance; Paddle MoR ~5% + $0.50 vs Stripe ~2.9% + $0.30 + 0.7% Billing (+ own tax compliance) [T] S57.
- **Decision (proposed):** Paddle for launch; keep billing behind an adapter for Stripe/Razorpay later.
- **Status:** **Pending founder decision D-05.** Not needed for the free desktop alpha (ADR-013)

## ADR-013 — Desktop-first, local-first alpha (supersedes ADR-011)
- **Context:** The founder proposed a desktop app given out as an installer, and has ready testers: 1 macOS (Logic Pro) + 2 Windows, with more to come. The R&D report's top risks were DAW drag-in (R-03), storage margin (R-06) and SFX EULAs restricting cloud hosting (R-02). All three are much smaller when files stay on the user's machine.
- **Decision:** The first release is a **cross-platform desktop app (macOS + Windows) built with Electron + React/TypeScript**. It indexes libraries **in place**, runs **CLAP locally via Transformers.js/ONNX Runtime on CPU**, stores the index in **SQLite (FTS5 + sqlite-vec)**, and supports **native drag-out to DAWs**. No accounts, cloud or payments in the alpha. Cloud/team features come later and reuse the UI. Details: [desktop_app_architecture.md](../architecture/desktop_app_architecture.md).
- **Consequences:**
  - \+ Solves DAW drag-in; near-zero hosting cost; no upload of TB libraries; privacy-friendly; fast feedback loop with real testers.
  - − Competes head-on with desktop librarians (Soundly, Soundminer, BaseHead, Sononym), so **AI search quality must be clearly better**.
  - − Requires Mac notarization (Apple Developer Program) and, before public release, Windows code signing.
  - − Distribution triggers stricter licence rules (see ADR-009 amendment).
  - − Team sharing and recurring revenue are postponed.
- **Status:** Proposed. Recommended for founder approval

## ADR-014 — Own codebase built from permissive components; no fork of an existing app
- **Context:** The founder asked whether to fork an open-source app from GitHub. Candidates (S73): SoundBot is closest in features but **GPL-3.0**; Auracle's licence file is missing and it has only 14 commits; Pulp has **no licence**; choralith is MIT but minimal.
- **Decision:** Write our own application code from a clean scaffold (Electron + Vite + React + TypeScript). Assemble it from permissively licensed libraries (WaveSurfer.js, Transformers.js/ONNX Runtime, better-sqlite3, sqlite-vec, LGPL FFmpeg binary). Use the open-source projects **only as references for ideas**, and do not copy their code. Install SoundBot as a **benchmark competitor** in the spikes.
- **Why not fork:** Forking SoundBot would make AUDIO OS GPL-3.0 (source must be published, and anyone may redistribute it for free), and it brings a heavy Python/PyTorch stack. Unlicensed code (Pulp, possibly Auracle) cannot legally be reused. A small MIT base saves little time.
- **Consequences:** + Full ownership; free to sell closed-source; licence-clean; an architecture designed for our roadmap. − About 1–2 weeks more initial work than a fork.
- **Status:** Proposed (founder asked; recommended)

## ADR-015 — Dedicated Raspberry Pi 5 hardware device: deferred; test "physical knobs" through MIDI controllers first
- **Context:** The founder proposed a pocket device: a Raspberry Pi 5 running AUDIO OS as its operating system, with physical knobs. Users would plug in their own drive and view the screen by mirroring or a cable.
- **Assessment:**
  - **It doesn't fit the core workflow.** Sounds must end up in the DAW running on the user's computer. A separate box can't drag a file into Logic's timeline, so it would still need a companion app or network share on the computer. That makes R-03 worse, not better.
  - **Audio quality for auditioning:** the Pi 5 has no analog audio jack [K], so pros would need a USB audio interface or DAC add-on.
  - **AI on the Pi 5's CPU** is possible but slow for indexing large libraries [A].
  - **Size and power:** with cooling, a screen or cable, and a 27 W supply [K], it isn't truly pocket-sized.
  - **Business:** hardware brings manufacturing, certification (e.g. CE/FCC/BIS), inventory, returns and much more capital, before the software is proven.
- **Decision:** No hardware in the alpha. Test demand for physical control cheaply:
  1. **MIDI controller support in the desktop app** (any knob/pad controller: browse results, audition, favourite, tag), using MIDI learn.
  2. If testers love it, prototype a small **USB controller** (e.g. RP2040 microcontroller with encoders) that plugs into the computer.
  3. Reconsider a **standalone Pi-based device** only if research shows demand for computer-free use, such as field recording, live sampling or a portable library. That would be a separate product competing with standalone samplers and grooveboxes.
- **Status:** Proposed

## ADR-009 amendment — distribution licence rules (2026-11-07)
- Because the desktop app is **distributed**, GPL components may not be bundled in a closed-source app: BBC audiowaveform and mutagen are excluded (compute peaks ourselves; use a permissively licensed metadata reader). FFmpeg ships as a separate, unmodified **LGPL** binary with licence notice and source offer (confirm with counsel). The app includes a generated "Third-party licences" screen.
