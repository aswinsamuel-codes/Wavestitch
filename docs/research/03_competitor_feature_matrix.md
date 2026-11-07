# 03 — Competitor Feature Matrix (Phase 0.3)

Research date: 2026-11-07. Legend: **●** documented core capability · **◐** partial / limited / add-on · **○** not offered or not found · **?** not verified this session.
Cells are based on [02_competitor_analysis.md](02_competitor_analysis.md) sources. "○" means *not found in this research*, **not** proof of absence. Re-verify before external use.

## 1. Matrix: AUDIO OS candidate capabilities × key competitors

| Capability | Soundly | Soundminer | BaseHead | Splice | DISCO | Frame.io | Notetracks | Descript | Auphonic | Audiomovers |
|---|---|---|---|---|---|---|---|---|---|---|
| Index the **user's own** audio library | ● | ● | ● | ○ | ● (music) | ◐ (generic files) | ◐ | ◐ (projects) | ○ | ○ |
| Cloud storage of user audio | ◐ (10 GB collab; private cloud on multi-user) | ○ | ◐ (CloudPacks playback) | ○ | ● | ● (2–3 TB+) | ● | ● | ◐ (processing only) | ○ |
| Bring-your-own cloud storage | ● (Drive/S3) | ○ | ? | ○ | ? | ◐ (Enterprise Storage Connect) | ? | ○ | ◐ (FTP/Dropbox outputs, [K]) | ○ |
| Browser-based access | ○ (desktop) [K] | ○ | ○ | ◐ | ● | ● | ● | ● | ● | ◐ (receiver) |
| Waveform preview | ● | ● | ● | ● | ● | ◐ (video-first) | ● | ● | ◐ | ○ |
| Embedded metadata (BWF/iXML) read/write | ● [K] | ● (deep) | ● [K] | ○ | ◐ (ID3/CSV) | ○ | ○ | ○ | ◐ (ID3 output) | ○ |
| UCS category support | ● | ● [K] | ● [K] | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Keyword / faceted search | ● | ● | ● | ● | ● | ◐ | ◐ | ◐ | ○ | ○ |
| **AI auto-tagging / classification** | ? | ? | ? | ● (own catalog) | ● | ○ | ○ | ○ | ○ | ○ |
| **Text-to-audio semantic search** | ? | ? | ? | ◐ ("Describe a sound" beta) | ? | ○ | ○ | ◐ (transcript text) | ○ | ○ |
| **Audio-to-audio similarity search** | ? | ? | ? | ● (own catalog only) | ● | ○ | ○ | ○ | ○ | ○ |
| Speech transcription | ? | ? | ? | ○ | ? | ● | ? | ● | ● | ○ |
| Loudness analysis / normalisation | ◐ [K] | ◐ [K] | ? | ○ | ○ | ○ | ○ | ● | ● | ○ |
| DAW drag / spot integration | ● | ● (Pro Tools spot) | ● | ● (plugins) | ○ | ◐ (NLE panels) | ○ | ○ | ○ | ● (plugin) |
| Share links (external) | ◐ | ○ | ○ | ○ | ● (branded) | ● | ● | ● | ○ | ● (session links) |
| Time-coded comments / review | ○ | ○ | ○ | ○ | ◐ | ● | ● | ● | ○ | ○ (real-time only) |
| Version management | ○ | ○ | ○ | ○ | ◐ | ● | ◐ | ● | ○ | ○ |
| Approval workflow | ○ | ○ | ○ | ○ | ○ | ● | ◐ | ◐ | ○ | ○ |
| Licence / rights metadata | ◐ (library source) | ◐ (metadata fields) | ◐ | ● (royalty-free terms) | ● | ○ | ○ | ○ | ○ | ○ |
| Multi-user / team admin | ● (multi-user plan) | ◐ (network DB) | ◐ | ○ | ● | ● | ● | ● | ◐ (team accounts) | ◐ |
| SSO / enterprise | ? | ○ | ? | ○ | ● (Enterprise) | ● | ? | ● | ◐ (Business) | ? |
| Public API | ? | ○ | ? | ○ | ● (Enterprise) | ● [K] | ? | ◐ [K] | ● | ○ |
| Marketplace (sell audio) | ○ | ○ | ○ | ● (catalog, not peer) | ○ | ○ | ○ | ○ | ○ | ○ |
| Analytics (usage of assets) | ? | ○ | ? | ○ | ● (link analytics) [K] | ◐ | ? | ○ | ○ | ○ |

## 2. Observations from the matrix

**Widely available (table stakes, no differentiation):**
waveform preview · keyword search · share links · time-coded comments (in review tools) · transcription (in spoken-word tools) · loudness normalisation (Auphonic, Descript).

**Available only in specialised apps (fragmented):**
- Deep embedded-metadata management and UCS → only desktop SFX librarians.
- Audio-to-audio similarity search → Splice (own catalog), DISCO (music catalogs), Sononym (local, desktop).
- Audio-first review → Notetracks (small), partially Frame.io.

**Poor integration between products (multiple tools needed for one job):**
- A sound designer uses Soundminer/Soundly to *find*, the DAW to *edit*, Frame.io/Dropbox/WeTransfer to *deliver*, and email/Slack to *approve*. Metadata and licence information are lost at every handoff. [A, to validate in interviews]
- A game-audio team keeps a source library (librarian), engine-ready exports (Wwise/FMOD/engine folders) and review in separate systems. [A]

**Expensive barriers:**
- Pro SFX librarian: Soundminer Pro $899 perpetual; Basic $199 still lacks full metadata management [V] S04.
- Real-time review rooms: Evercast ~$549+/month [T] S14.
- Source-Connect Studio ~$105/month [V] S13.

**Where AI could measurably improve outcomes (testable hypotheses):**
| Hypothesis | Metric to measure |
|---|---|
| Zero-shot tagging cuts manual tagging time for un-tagged or badly-tagged libraries | Minutes of manual tagging per 100 files; tag acceptance rate |
| Text-to-audio semantic search finds relevant SFX faster than keyword search in libraries with poor metadata | Time-to-first-acceptable-result; search abandonment rate |
| Similarity search ("more like this") finds alternates and variations faster | Number of auditioned files before selection |
| Automated loudness and technical QC removes delivery rejections | % of deliveries failing spec |

## 3. Underserved for independents and small studios
1. Cloud, cross-device access to *their own* library at prosumer prices (Soundly's cloud is the closest; real usage limits are not verified).
2. AI search over *their own* library (Splice's AI does not cover user files).
3. Audio-first client review that is cheaper and simpler than Frame.io/Evercast and keeps audio metadata attached.
