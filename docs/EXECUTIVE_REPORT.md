# AUDIO OS — Phase 0 Executive R&D Report

**Prepared:** 2026-11-07 · **For:** Founder review and approval · **Status:** Recommendation. **No code has been written.**
**Evidence basis:** desk research (official vendor pages, documentation, academic papers, third-party reviews, community discussions). **No customer interviews yet.** Labels: [V] verified official · [T] third-party · [K] prior knowledge (unverified) · [A] assumption. Sources: [source_register](research/source_register.md).

> ## ▶ Revision 1 (2026-11-07): desktop-first alpha
> After founder review, the first release is a **local desktop app for macOS and Windows** (ADR-013) instead of a web app. The product direction (A: AI-powered audio asset management) is unchanged.
> - **Why:** native drag into DAWs (testers use **Logic Pro** on Mac, plus Windows DAWs), no cloud storage cost, no uploading of large libraries, and licensed SFX never leave the user's machine.
> - **Stack:** Electron + React/TypeScript · CLAP running locally via Transformers.js/ONNX on CPU · SQLite + FTS5 + sqlite-vec · bundled LGPL FFmpeg · notarized Mac build and Windows installer from GitHub Actions. → [desktop_app_architecture](architecture/desktop_app_architecture.md)
> - **Plan:** 2-week technical spikes (AI speed and quality, drag into Logic, signing), then a ~6-week alpha build, then tester rounds (3 testers now, growing to 10–15). → [development_roadmap](project/development_roadmap.md)
> - Sections below about cloud hosting, billing and web architecture now describe the **follow-on cloud/team product**.

---

## 1. What does the existing audio software market look like?
It is **six adjacent markets with weak links between them**: creation (DAWs, repair/mastering), content (sample/music/SFX catalogs), asset management (SFX librarians, music catalogs), collaboration (real-time streaming, async review), spoken-word production, and rights/royalties. Each is served by **specialised point tools**, and people move files between them by hand.
Visible trends: subscriptions replacing perpetual licences (with resistance among pros), usage-metered AI (Descript, Auphonic, ElevenLabs), ML discovery *inside catalogs* (Splice, DISCO), UCS as the SFX metadata standard, and consolidation in rights tech (BMI agreed to acquire Soundmouse, May 2026 [T]). → [01_industry_overview](research/01_industry_overview.md)

## 2. Who are the most important competitors?
For the recommended direction:
- **Soundly** (hybrid desktop + cloud SFX librarian, multi-user private cloud) is the closest competitor.
- **Soundminer** (pro metadata standard, perpetual: V7 $199 / $399 / $899 [V]) and **BaseHead** (free edition, CloudPacks).
- **Splice** (ML search, but on its own catalog only [V]).
- **DISCO** (AI tagging + similarity for music catalogs [V]).
- **Frame.io** (async review; $15–$25/member with 2–3 TB+ [V]). It sets the storage-per-dollar anchor.

DAWs (Pro Tools, Ableton, FL, Logic, Reaper, Audition) are **integration targets, not competitors**. → [02](research/02_competitor_analysis.md)

## 3. Which products have the strongest feature sets?
Each leads in its own lane: Pro Tools (post-production), iZotope RX (repair), Splice (ML sample discovery + DAW integration), Soundminer (pro SFX metadata), Frame.io (review/approval), Descript (text-based spoken-word editing), DISCO (music catalog + AI tagging). **None combines own-library AI search + cloud team library + audio-first review.** → [03](research/03_competitor_feature_matrix.md)

## 4. Which business models are successful?
These models are durable and widely adopted (no revenue data was collected): per-seat SaaS with pooled storage (Frame.io, Descript), subscription + credits (Splice), licence-scope tiers (Epidemic, Artlist), credit-hours for compute (Auphonic), perpetual licences for pro desktop tools (Soundminer, REAPER, FL Studio's lifetime updates), and commission (Songtrust 15–20%). The prosumer price band is **$10–$20 per user/month**. → [04](research/04_pricing_analysis.md), [11](research/11_business_model_analysis.md)

## 5. What problems remain underserved?
Evidence ranges from moderate to weak and still needs validation:
1. **AI semantic and similarity search over a user's *own* multi-vendor library.** Catalog AI does not cover user files.
2. **AI-assisted ingest:** tagging and UCS categorisation of new or self-recorded libraries.
3. **Browser-based team library** with permissions and licence awareness.
4. **Audio-first review and approval** (weaker gap; Frame.io is "good enough" for many).
5. **Licence/provenance tracking** through to delivery (weak evidence, high B2B value).

Rejected for now: "unified OS for everything", the marketplace, studio management, real-time collaboration. → [07](research/07_market_gap_analysis.md)

## 6. What is the most promising product opportunity?
**Option A: AI-powered Audio Asset Management.** Weighted score 3.50 vs B 3.10, C 2.83, D 1.95 → [14](research/14_mvp_recommendation.md).
It addresses a daily task, is useful without network effects, and builds the asset graph that the later modules (review, versions, licensing, API, marketplace) depend on.
**Primary target:** sound designers and small game-audio/post teams (3–25 people).

## 7. What technology stack should we use, and why?
| Layer | Choice | Key reason |
|---|---|---|
| Frontend | Next.js + React + TypeScript + Tailwind + shadcn/ui; WaveSurfer.js with **server-generated peaks** | WaveSurfer officially warns that browsers can't decode large files and recommends pre-computed peaks [V] |
| Backend | Python FastAPI + Pydantic v2 + SQLAlchemy 2 (modular monolith) | One language with the audio/ML workers |
| Jobs | Celery + Valkey; CPU and GPU worker pools; transactional outbox | Long multi-step media pipelines |
| Data | PostgreSQL 16 + **pgvector** (HNSW, halfvec) + FTS + RLS | One store for metadata, vectors and tenant isolation |
| Storage | **Cloudflare R2** (zero egress) + Backblaze B2 DR copy | Audition-heavy workload; S3 egress ~$0.09/GB [T] |
| Audio | FFmpeg (LGPL build), audiowaveform, librosa, pyloudnorm, wavinfo/mutagen | Permissive or server-side licences |
| AI | **LAION CLAP** (Apache-2.0) for search, similarity and zero-shot tags; PANNs and Whisper in P1 | Portfolio: no single model fits all tasks |
| Avoid | Essentia (AGPL, non-commercial models), MinIO community (archived Feb 2026 [T]), PyDub | Licence and maintenance risk |
→ [08](research/08_technical_stack_evaluation.md), [09](research/09_ai_model_evaluation.md), [10](research/10_storage_and_infrastructure_analysis.md), [ADRs](decisions/architecture_decision_records.md)

## 8. What should the MVP contain?
**P0:** orgs and roles · resumable bulk folder upload · ingest pipeline (metadata incl. BWF/iXML, previews, peaks, loudness) · fast browser audition · keyword + filter search · **AI semantic search + "more like this"** · **AI tag/UCS suggestions with bulk review** · duplicate detection · collections · original/batch download · licence fields · billing and quotas · security baseline (RLS, signed URLs, sandboxed decoding, audit log, export/deletion).
**P1:** external share links with waveform comments and approvals · versions + loudness reports · **BYO bucket / previews-only mode** · metadata editor with write-back · PANNs + Whisper.
**P2:** desktop companion (DAW drag/spot) · public API/webhooks · SSO · provenance. **P3:** marketplace. → [14](research/14_mvp_recommendation.md)

## 9. What will it cost to build and operate initially?
*Illustrative; rates are assumptions* → [12](research/12_unit_economics.md)
- **Build to paid launch:** ≈ 34 person-months (≈ 4.25 FTE × 8 months incl. beta).
  - India-based team: **≈ $83k–$202k** all-in (engineering, infra, tools, legal, pen test).
  - US/EU-based team: **≈ $365k–$696k**.
- **Fixed infrastructure at launch:** ≈ **$335–$1,260/month** before storage.
- **Unit economics (base case):** gross margin **56–63%**, rising to **64–73%** with quota tuning and BYO storage. **Storage, not AI, is the dominant cost**; AI inference is roughly cents per 10,000 SFX files [A].

## 10. What are the major technical and business risks?
Top risks (score ≥ 15) → [risk_register](project/risk_register.md):
1. **R-03:** A web-only product is slower than desktop librarians at DAW drag/spot.
2. **R-06:** Storage costs erode margins (heavy users, multi-TB libraries).
3. **R-14:** Scope creep toward "everything for everyone".
4. **R-01:** Unproven willingness to pay for AI search over one's own library.
5. **R-02:** **Commercial SFX EULAs may forbid shared cloud hosting** of licensed libraries. This needs legal review before the build.

Also: incumbents adding AI search (R-04), zero-shot accuracy on fine-grained UCS (R-05), tenant isolation (R-07), licence contamination (R-09), DPDP obligations from 13 May 2027 (R-10).

## 11. What is the realistic development roadmap?
| Phase | Duration [A] | Outcome |
|---|---|---|
| 0.5 Discovery + AI eval spike | 6 weeks | 25+ interviews, EULA review, CLAP benchmark → go/no-go |
| 1 MVP build | ~18 weeks | P0 feature-complete; walking skeleton at week 10 |
| 2 Private beta | ~8 weeks | 10–20 teams; pen test; legal docs |
| 3 Paid launch + P1 | from ~week 32 | Review, versions, BYO storage, metadata write-back |
| 4 P2 | from ~week 44 | Desktop companion, public API, SSO |
→ [development_roadmap](project/development_roadmap.md)

## 12. Why would a customer choose AUDIO OS over existing products?
- **Find any sound in *your* libraries by describing it or by example.** Today, AI search exists only inside vendor catalogs.
- **AI does the tedious first pass** (tags, UCS categories, duplicates) and you approve it in bulk.
- **Your whole team can reach the library from a browser**, with permissions and licence information attached, without installing anything.
- **Built for audio** (BWF/iXML metadata preserved, loudness data, waveform-first UI), unlike generic drives and video-first review tools.
- **Trust:** no training on your audio by default, full export, bring-your-own storage.

*Honest caveat:* until the desktop companion ships (P2), established desktop librarians remain faster at "spot to timeline". Early adopters will be teams that value search, sharing and remote access most.

---

## Recommended product direction
**AI-powered Audio Asset Management** ("a cloud sound library that understands audio") for sound designers and small game-audio/post teams. Review/approval comes next, then licensing, then API, then marketplace.

## Recommended technology stack
Next.js/React/TS/Tailwind/shadcn + WaveSurfer (server peaks) · FastAPI/Pydantic/SQLAlchemy modular monolith · Celery + Valkey · PostgreSQL 16 + pgvector + RLS · Cloudflare R2 + B2 DR · FFmpeg (LGPL) + audiowaveform + librosa · LAION CLAP (P0), PANNs + Whisper (P1) · managed OIDC auth · Paddle (MoR) · Docker on a managed container platform · GitHub Actions + OpenTelemetry + Sentry.

## MVP feature scope
See §8 (P0 list). Out of scope: marketplace, DAW editing, real-time streaming, podcast recording, studio booking, generative audio, mobile and desktop apps.

## Initial architecture
A modular monolith (13 modules with enforced boundaries; M1–M5, M10 and basic M7/M9 in the MVP) deployed as `web`, `api`, `worker-cpu`, `worker-gpu (scale-to-zero)`, `scheduler`, behind Cloudflare, with managed Postgres and Valkey and R2 storage. → [system_architecture](architecture/system_architecture.md), [module_architecture](architecture/module_architecture.md), [deployment_architecture](architecture/deployment_architecture.md)

## Proposed pricing (hypotheses to test, USD)
| Free | Individual Creator | Creator Pro | Studio | Business | Enterprise |
|---|---|---|---|---|---|
| $0 · 5 GB · 1 h AI/mo | $9/mo · 100 GB · 25 h | $19/mo · 500 GB · 100 h · BYO bucket | $18/seat (min 3) · 1 TB + 250 GB/seat | $32/seat (min 10) · SSO · audit · API | Custom |
Annual billing ≈ 2 months free. Test INR/PPP pricing if India is a launch market. → [11](research/11_business_model_analysis.md)

## Development milestones
M0 approval (W0) → M1 discovery go/no-go (W6) → M2 walking skeleton (W10) → M3 MVP feature-complete (W24) → M4 private beta (W24–32) → M5 paid launch (W32) → M6 review + BYO (~W44) → M7 desktop + API (~W56).

## Outstanding decisions requiring founder approval
| ID | Decision | Recommendation |
|---|---|---|
| **D-01** | MVP direction and target personas | Approve A; P1 = sound designers + small game-audio/post teams |
| **D-02** | Run Phase 0.5 (6 weeks) before the build | **Yes**. Interviews, EULA review and the AI eval gate the build |
| **D-03** | Web-first, desktop companion deferred to P2 | Accept, with eyes open on R-03 |
| D-04 | Identity provider vendor | Managed OIDC with a B2B SSO path; compare pricing |
| D-05 | Billing provider | Paddle (MoR) at launch |
| D-06 | Hosting region and platform | Pick by first market (EU or India) |
| D-07 | Launch markets and regional pricing | Decide after interviews |
| D-08 | Team model and budget | See cost scenarios |
| D-09 | Storage policy (quotas, BYO/previews-only priority, backup tier) | Modest quotas; BYO in P1 |
| D-10 | AI data policy; commercial MIR licences | No training by default; defer Essentia |
| D-11 | Engage legal counsel | Yes, before beta (EULA review before build) |
| D-12 | Name: trademark and domain check for "AUDIO OS" | Do it in Phase 0.5 |

**Approval:** ☐ Approve as recommended · ☐ Approve with changes: ______ · ☐ Reject  —  Founder: ________  Date: ________
