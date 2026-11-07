# 14 — MVP Recommendation (Phase 0.8)

Research date: 2026-11-07

> ## Revision 1 (2026-11-07): desktop-first alpha
> After founder review, the **first release becomes a local desktop app for macOS and Windows** (ADR-013). The *direction* stays the same: A, AI-powered audio asset management. Only the *delivery* changes.
> - **Why:** native drag into DAWs (the testers use **Logic Pro** on Mac, plus Windows DAWs), no cloud storage cost, no upload of large libraries, and commercial SFX licences are not stressed because files never leave the machine.
> - **Alpha scope:** see [desktop_app_architecture.md §6](../architecture/desktop_app_architecture.md). In short: index folders in place, instant audition, keyword + **AI text search** + **more like this**, **drag to DAW**, embedded metadata, AI tag/UCS suggestions.
> - **Moved later:** accounts, billing, cloud libraries, team sharing, review links (former P0-1, P0-2 upload, P0-12, cloud parts of P0-13) become post-alpha options decided by tester feedback.
> - The P0–P3 list below remains the **cloud/team roadmap** that follows the desktop alpha.

## 1. Options evaluated

Scores 1–5 (5 = best for AUDIO OS). Judgement based on [02](02_competitor_analysis.md)–[13](13_security_and_compliance.md) [A].

| Criterion (weight) | A. AI Audio Asset Management | B. Studio Management | C. Audio Collaboration | D. Unified Audio Workspace |
|---|---|---|---|---|
| Customer demand evidence (25%) | 3: moderate (Splice ML adoption, metadata burden, Soundly multi-user exists) | 2: weak audio-specific evidence | 3: real need, but served by Frame.io/Audiomovers | 2: no buyer for "everything" |
| Competitive intensity, inverse (20%) | 3: Soundly/Soundminer/BaseHead are desktop-first; AI over own library unverified at incumbents | 3: generic booking/CRM tools | 2: entrenched real-time and video-review players | 1: competes with everyone |
| Development complexity, inverse (15%) | 3 | 4 | 2.5 (2 real-time / 3 async) | 1 |
| Monetisation potential (15%) | 4: seats + storage + AI | 3 | 3 | 2: unclear buyer |
| Technical feasibility (15%) | 4: proven components (FFmpeg, CLAP, pgvector) | 5 | 3 | 2 |
| Expansion opportunities (10%) | 5: → review, versions, licensing, API, marketplace | 2 | 4 | 5 |
| **Weighted score** | **3.50** | **3.10** | **2.83** | **1.95** |

## 2. Recommendation

**Start with A, AI-powered Audio Asset Management**, positioned as:

> **"A cloud sound library that understands audio."** Upload or connect your sound libraries, find any sound by describing it or by example, and share curated collections with your team and clients from the browser.

**Primary target:** professional **sound designers** and **small game-audio / post-production teams (3–25 people)**. **Secondary:** producers with large sample collections, and mix engineers (through review in P1).

**Why A wins:**
1. It is a **daily, repeated task** (searching and auditioning sounds), so the value is felt every session.
2. AI search **over the user's own multi-vendor library** is the clearest differentiator found. Splice's ML search covers only its own catalog [V] S06, and incumbents' AI capabilities on user libraries were **not verified** (must be checked).
3. It is **useful on day one without network effects** (unlike a marketplace).
4. It creates the **asset graph** (assets, versions, licences, projects) that review, licensing, API and marketplace modules later build on.

**Conditions that could overturn this (check in Phase 0.5):** see [07 §"What would change this analysis"](07_market_gap_analysis.md).

## 3. Prioritised feature list

### P0 — Essential (MVP, independently useful)
| # | Feature | Notes |
|---|---|---|
| P0-1 | Accounts, organisations (personal + team), invitations, roles (Owner/Admin/Editor/Viewer) | Managed OIDC auth |
| P0-2 | Libraries and folders; bulk **folder upload** (resumable, multipart, direct to storage) | WAV/BWF, AIFF, FLAC, MP3, OGG; size limits per plan |
| P0-3 | Ingest pipeline: validation, technical metadata, **embedded metadata read (BWF bext/iXML/ID3)**, previews (AAC), waveform peaks, loudness (LUFS/true peak) | Originals never modified |
| P0-4 | **Browser audition**: instant preview, waveform, scrub, loop, keyboard navigation | Pre-computed peaks (WaveSurfer guidance) |
| P0-5 | **Search**: keyword/full-text + filters (duration, SR, bit depth, channels, library, UCS category, tags) | Postgres FTS + trigram |
| P0-6 | **AI semantic search** (text → audio) and **"more like this"** (audio → audio) | CLAP + pgvector |
| P0-7 | **AI tag + UCS category suggestions** with bulk accept/reject | Human-in-the-loop |
| P0-8 | Exact duplicate detection (content hash) | Saves storage |
| P0-9 | Collections (playlists of sounds) shareable inside the org | Core team workflow |
| P0-10 | Download originals (single + batch ZIP) with metadata intact | Getting sounds into the DAW |
| P0-11 | Licence/source field per library and asset (data model + simple UI) | Foundation for G5 |
| P0-12 | Billing: Free, Creator, Creator Pro, Studio; quotas (storage, AI hours) | MoR provider |
| P0-13 | Security baseline: RLS tenancy, presigned URLs, upload sandbox, audit log, account deletion/export | Non-negotiable |

### P1 — Important (first 3–6 months after MVP)
- External **share links** with **waveform-anchored comments**, passphrase and expiry; **approval** status.
- **Version stacks** per asset (v1, v2…), A/B compare, loudness report per version.
- **Bring-your-own bucket** (S3/R2/B2) and **previews-only mode** (originals stay with the customer).
- **Metadata editor**: bulk edit, UCS rename, **write-back of BWF/iXML on export**.
- AudioSet tagger (PANNs) fused with CLAP; near-duplicate (acoustic) detection.
- Whisper transcription for dialogue/VO assets (searchable transcripts).
- Projects/workspaces linking collections, deliverables and licences.
- SSE progress notifications; activity feed.

### P2 — Later
- **Desktop companion** (macOS/Windows): local-folder indexing without upload, drag-to-DAW, Pro Tools spotting, offline cache.
- Fine-tuned UCS classifier (opt-in training on confirmed tags).
- Licence provenance graph ("made from") and licence compliance reports.
- Public REST API + webhooks; CLI for game pipelines (Wwise/FMOD/engine export rules).
- SSO/SAML, audit export, data residency (Business plan).
- Tempo/key-matched previews (Rubber Band, commercial licence) for music users.
- Analytics: library usage, most-used sounds, team activity.
- **Stem splitting (founder request, 2026-11-07):** split a track in the library into vocals/drums/bass/other WAV stems, saved next to the original, indexed and searchable, and draggable into a DAW as multiple tracks at once. **Before building:** (1) Logic Pro (Stem Splitter, Apple silicon), FL Studio 21.2+ and Ableton Live 12.3 Suite already include stem separation [T] S74, so the value for AUDIO OS is *library-side* and batch splitting, not the feature itself. (2) Licence: HT-Demucs ONNX ports are labelled MIT, but at least one says the v3/v4 checkpoints are **CC BY-NC 4.0 (non-commercial)** [T] S75. Resolve this before shipping, or use a model with a clear commercial licence. (3) Ask testers whether they want it outside their DAW.

### P3 — Long-term
- Audio marketplace (catalog vendors and creators selling libraries, with licence issuance).
- Real-time co-listening / review rooms.
- Studio management (bookings, client portal, invoicing).
- Generative SFX integrations (e.g. ElevenLabs API) saved with provenance.
- Enterprise: dedicated tenancy, on-prem connector, SOC 2.

## 4. Explicitly out of MVP scope
Marketplace · DAW-style editing · real-time streaming · podcast recording · studio booking · generative audio · mobile apps.

## 5. MVP success criteria (beta, 8 weeks) [A targets]
| Metric | Target |
|---|---|
| Activated beta users (uploaded ≥ 500 files) | ≥ 60% of invited |
| Weekly active searchers (week 4+) | ≥ 40% of activated |
| Semantic/similarity share of successful searches | ≥ 30% |
| Tag suggestion acceptance rate | ≥ 50% |
| Median time-to-acceptable-result vs user's current tool (usability test) | ≥ 30% faster |
| "Very disappointed if it disappeared" (Sean Ellis test) | ≥ 30% |
| Willingness to pay at the proposed Creator Pro/Studio price | ≥ 25% of activated users convert or pre-commit |
