# 02 — Competitor Analysis (Phase 0.2)

Research date: 2026-11-07 · Labels: [V] official, [T] third-party, [K] prior knowledge (unverified), [A] assumption · Source IDs → [source_register.md](source_register.md)

> **Scope note.** Each product is profiled on the 12 requested dimensions in compact form. Where a dimension is missing, nothing credible was found in this session. **None of the competitors publicly documents its internal technical architecture in enough detail to report**, apart from the ML-search descriptions noted. AUDIO OS makes no claims about proprietary internals.
> Pricing detail and conflicts are consolidated in [04_pricing_analysis.md](04_pricing_analysis.md).

---

## A. Music production (DAWs)

All six are **desktop applications** for real-time recording, editing and mixing. They are *not* AUDIO OS's competitors for the MVP. They are **integration targets**: assets must flow into them. Profiles are brief.

| Product | Overview & target | Model / price signal | Platforms | Strengths | Complaints / limits | Collab & storage |
|---|---|---|---|---|---|---|
| **Avid Pro Tools** | Industry standard for post-production and pro studios | Subscription: Artist ~$99/yr, Studio ~$299/yr, Ultimate ~$599/yr (conflicting) [T] S27, S68 | macOS, Windows [K] | Post-production standard, hardware ecosystem (HDX) | Subscription cost, Ultimate pricing confusion (sources conflict) [T] | Avid Cloud Collaboration [K]. Bundle offer with Audiomovers [T] S12 |
| **Ableton Live 12** | Electronic music production and live performance | Perpetual: Intro $99, Standard $439, Suite $749 at launch [T] S28 | macOS, Windows [K] | Session view, Max for Live | Price of Suite [A] | Integrates Splice "Search with Sound" (12.3 beta) [V] S06 |
| **FL Studio** | Beat-making and hip-hop/EDM producers | Perpetual editions ~$99–$499 with **lifetime free updates** [T]/[V] S29 | Windows, macOS [K] | Lifetime free updates is a strong loyalty driver | n/a | FL Cloud (samples/mastering) [K] |
| **Adobe Audition** | Editing and restoration for video and podcast users in Creative Cloud | Single app ~$20.99/mo annual, ~$33.99 month-to-month [T] S31 | macOS, Windows [K] | Creative Cloud integration with Premiere | Subscription-only [T] | Creative Cloud storage [K] |
| **Logic Pro** | Mac music production | Mac $199.99 one-time; iPad $4.99/mo; Creator Studio bundle $12.99/mo [T] S32, S67 | macOS, iPadOS | Price-to-value, bundled content | Apple-only | iCloud project sharing [K] |
| **REAPER** | Power users, game audio, budget-conscious pros | $60 discounted licence (≤$20k revenue), $225 commercial, 60-day full evaluation [V] S30 | Windows, macOS, Linux [K] | Price, customisation, scripting | Steep learning curve [K] | None native [K] |

**Implication for AUDIO OS:** DAWs are fragmented across user segments, so any asset product must integrate with all of them. The common denominator is **files on disk, dragged or "spotted" into the timeline**. A web app cannot spot into Pro Tools without a desktop companion. This is a key risk (R-03 in [risk_register](../project/risk_register.md)).

---

## B. Audio libraries and sound-effects management

### B1. Soundly — **closest competitor to the recommended MVP**
1. **Overview:** Desktop sound-effects librarian, with a cloud SFX library and cloud collaboration storage. Norway-based [K].
2. **Target:** Sound editors and designers in film/TV/games, from individuals to multi-user facilities [V] S01, S02.
3. **Core features:** Local library indexing (unlimited local samples on Pro), search, audition, spot/drag to DAW, Soundly cloud library [V] S01.
4. **Advanced:** UCS compliance (2022) [V] S03; Freesound integration [V]; connect third-party cloud storage such as Google Drive or S3 ("Cloud Storage Freedom", 2022) [T] S60; multi-user admin and private cloud storage [V] S02.
5. **Pricing:** Pro monthly subscription; multi-user is "contact us" [V] S02. Current public price **not verified**: the official pricing URL returned 404 on 2026-11-07, and older reviews cite $14.99/mo (2016, outdated) [T] S60.
6. **Free tier:** Limited free library (figures range from ~300 clips in older reviews to "3000+"); local indexing limits apply [T] S01, S60.
7. **Advantages:** Combines a local librarian with cloud library and storage, modern UI, UCS.
8. **Complaints:** Few specific complaints found. Cost for amateurs is raised for the category in general [T] S39. More sentiment research needed.
9. **Platforms:** macOS, Windows desktop [K].
10. **Integrations:** DAWs via drag and spot [K]; Freesound [V].
11. **Storage/collab:** 10 GB collaboration space mentioned for subscribers [T] S60; private cloud for multi-user [V] S02.
12. **Architecture:** Not publicly documented.

### B2. Soundminer
1. **Overview:** Long-established pro SFX search engine, metadata manager and "spotter" for post-production.
2. **Target:** Professional post-production facilities and senior sound editors.
3. **Core:** Search engine, tabs, monitor plugin, spot to Pro Tools, metadata management (limited in Basic) [V] S04.
4. **Advanced:** Plus and Pro tiers add more metadata and workflow features (ProPack add-on, $699 bundle with V6 Plus) [V] S04; deep embedded-metadata editing [K].
5. **Pricing:** **Perpetual** V7 Basic $199 / Plus $399 / Pro $899 per platform; +$100 for a dual-platform (Universal) licence; new purchases from 2026-04-01 get a free upgrade to V7 [V] S04.
6. **Free tier:** None found.
7. **Advantages:** Depth of metadata workflow, trusted in post, perpetual licence.
8. **Complaints:** "Expensive for amateurs" [T] S39. Hardware-key (iLok) confusion in an older forum post [T].
9. **Platforms:** macOS, Windows [V] (single/dual platform licences) S04.
10. **Integrations:** Pro Tools spotting [V]; Soundflow scripting kits exist (third party) [T].
11. **Storage/collab:** Local or network database; no cloud collaboration found [A].
12. **Architecture:** Not publicly documented.

### B3. BaseHead (additional competitor)
- Describes itself as an "Enterprise class Sound Effects Search Engine and Library Manager designed by Hollywood Sound Designers" [V] S33. Free edition (2024) with unlimited local files and bundled free sounds [T] S33. HTTP playback of online "CloudPacks" since v2020.7 [V] S33. Current paid prices not found. Desktop (macOS/Windows) [K].

### B4. Sononym (additional competitor)
- Desktop sample browser with **similarity search** that analyses each sample on Overall, Spectrum, Timbre, Pitch and Amplitude [T] S34. Launch price €89 / $99 [T]. Shows that ML similarity search on a *local* library is already productised for music producers.

### B5. Splice
1. **Overview:** Subscription sample marketplace (3M+ sounds) with desktop app and DAW plugins [V] S05.
2. **Target:** Music producers, beat-makers, songwriters.
3. **Core:** Credits-based sample downloads (1 credit/sample; MIDI and presets up to 3), royalty-free use [V] S05.
4. **Advanced:** ML "Similar Sounds" (2019); **"Search with Sound"** finds compatible samples from audio or MIDI in the DAW session (Ableton 12.3 beta, Pro Tools, Studio One Pro 7, Splice plugin); "Describe a sound" beta (natural-language search) [V] S06, S07.
5. **Pricing:** Sounds $12.99/mo billed yearly (~100 downloads/mo); Creator $19.99/mo (~200/mo), $4.99 first-month offer [V] S05.
6. **Free tier:** None listed [V] S05.
7. **Advantages:** Catalog size, DAW integration, ML discovery. A near-10% search-conversion uplift reported for ML search [T] S07.
8. **Complaints:** Credit expiry after cancellation (credits expire 28 days after final billing period [V]); Trustpilot disputes over the $4.99 offer [T] S05.
9. **Platforms:** Desktop, mobile, DAW plugins [V].
10. **Integrations:** Ableton, Pro Tools, Studio One [V].
11. **Storage/collab:** Not a user-file storage product.
12. **Architecture:** Public ML case study on AWS [T] S07. Details not reportable.
- **Relevance:** Splice's AI discovery works **only on Splice's own catalog**. It does not index the user's own libraries. That gap is the core of the AUDIO OS hypothesis.

### B6. Epidemic Sound
- Royalty-free music and SFX subscription for video creators and businesses. Pricing restructured into individual (Creator / Pro / Pro Plus) and business (Business / Business Plus / Enterprise) plans; Creator ~$9.99/mo annual or $17.99 monthly; no free plan [T] S08 (conflicting older "Personal/Commercial" naming). The main complaint theme is licence scope (personal vs client/commercial use) [T] S08. Web, mobile and NLE plugins [K].

### B7. Artlist
- Music, SFX, footage and AI suite subscription for video creators. Entry "Music & SFX Social" ~$9.99/mo annual / $14.99 monthly; higher tiers inconsistent across sources; Teams and Enterprise custom [T] S09. The official page could not be verified.

### B8. Freesound
- Open collaborative database run by UPF's Music Technology Group. Sounds carry per-clip Creative Commons licences (CC0, CC BY, CC BY-NC) [T] S59. **The API is free only for non-commercial use; commercial API use requires a licensing agreement** with MTG [V] S10. → AUDIO OS cannot simply integrate Freesound search commercially without a deal.

---

## C. Audio collaboration

| Product | Overview & target | Pricing signal | Strengths | Limits | Platform |
|---|---|---|---|---|---|
| **Audiomovers LISTENTO** | Plugin that streams hi-res, low-latency audio from a DAW to remote listeners (mix approval sessions) | From ~$9.99–$12.99/mo; ~20% off annual; Standard Plus raises the limit to 150 listeners [V]/[T] S12; subscription-only since a policy change [V] S64 | Real-time, lossless, widely adopted, Pro Tools bundle [T] | Real-time only. No async comments, versions or asset library [A] | DAW plugin + browser/mobile receiver [K] |
| **Source-Connect 4** | Remote recording and ADR / voice-over sessions | Licences renamed Talent / Studio / Facility; Talent ~$35/mo + $75 initiation fee; Studio ~$105/mo [V] store S13 | Broadcast and ADR standard | Price, setup complexity [A] | Desktop [K] |
| **Sessionwire** | Remote music-collaboration app | **Not verified this session.** Product status unknown. Do not cite | n/a | n/a | n/a |
| **Evercast** | Real-time review rooms (video + audio) for film/TV post | ~$549–$1,249/mo per room per a third-party snapshot; no free plan [T] S14 | Studio-grade real-time review | Very expensive for small teams [T] | Web + app [K] |
| **Frame.io** (Adobe) | Async media review and approval, video-first | Free (2 members, 2 GB); Pro $15/member/mo (2 TB + 2 TB per extra member); Team $25 (3 TB + 2 TB/member); Enterprise custom [V] S11 | Time-coded comments are well regarded [T] S61; Camera-to-Cloud; generous storage | Competitors say it is video-focused, with **weaker audio-specific review** (waveform, loudness) [T, biased] S61. Not independently confirmed | Web, iOS, NLE panels [K] |
| **Notetracks** (additional) | Audio and video collaboration with timestamped notes on waveforms | Inconsistent: free tier; Pro from ~$9/mo; lifetime deal $97 seen [T] S35 | Audio-first review | Small vendor, unclear traction [A] | Web [T] |
| **Audio Design Desk** (additional) | Sound-design tool integrated with Frame.io for review uploads [T] S62 | n/a | Shows demand for audio↔review integration | n/a | macOS [K] |

---

## D. Podcasting and spoken-word production

| Product | Overview | Pricing [source] | Distinctive features | Limits / complaints |
|---|---|---|---|---|
| **Descript** | Text-based audio/video editing | Free; Hobbyist $16/$24; Creator $24/$35; Business $50/$65 per person/mo (annual/monthly); media minutes 60 / 600 / 1800 / 2400 per month; AI credits 400 / 800 / 1500 [V] S15 | Transcript editing, Studio Sound, "Underlord" AI, remote recording | Usage quotas (media minutes, AI credits) confuse buyers; allowances changed in 2025 [T] |
| **Riverside** | Remote recording studio (local recording per participant) | Pro ~$24/mo annual / $29 monthly; Standard tier possibly retired (Aug 2026 source); Business custom [T] S16 | Local high-quality recording, AI editing | Plan structure changes; sources conflict |
| **Hindenburg** | Desktop editor for journalists and radio/podcast storytelling | PRO ~$12/mo or ~$95 perpetual (conflicting); Narrator ~$15/mo [T] S19, S63 | Broadcast-oriented loudness and workflow [K] | Pricing unclear |
| **Auphonic** | Cloud audio post-production (leveling, loudness, noise reduction, multitrack) | Free 2 h/month (with jingle); recurring S 9 h, M 21 h, L 45 h, XL 100 h, XXL 250 h; one-time credits never expire; yearly saves 20%; billed by processed duration, 3-min minimum [V] S17. Dollar amounts not rendered on the official page | API, watch folders, batch, loudness targets | Monthly credits don't roll over [V] |
| **Alitu** | All-in-one podcast maker for beginners | $38/mo or $380/yr; hosting add-on $10/mo; 7-day trial [T]/[V] S18 | Simplicity | Price for hobbyists [A] |

**Implication:** Podcasting is **crowded and AI-saturated**. AUDIO OS should not enter it as a primary segment. Podcast teams are still valid secondary users of review/approval and asset features.

---

## E. AI audio and mastering

| Product | Overview | Pricing | Notes |
|---|---|---|---|
| **LANDR** | AI mastering, distribution, samples, plugins (LANDR Studio) | Studio Essentials $99/yr, Standard $143.88/yr, Pro $191.88/yr per the LANDR site snippet; monthly figures conflict [V]/[T] S20 | Essentials reportedly MP3-only masters [T] |
| **iZotope RX** | Industry-standard audio repair suite | RX 11 Standard $399 (official), Elements ~$99, Advanced ~$1,199–$1,349 [V]/[T] S21. **Possibly superseded by RX 12** (one source; unverified) | Desktop plugins + standalone editor |
| **CloudBounce** | Online AI mastering | **Not verified this session** | Do not cite |
| **ElevenLabs** | Generative voice (TTS, cloning), sound-effects generation, API | Free / Starter ~$5–6 / Creator ~$22 / Pro ~$99 / Scale / Business; credit-based; separate API tiers [T] S22 | **Potential integration partner** (SFX generation into the library) rather than a competitor |

---

## F. Music licensing and catalog management

| Product | Overview | Pricing / model | Relevance |
|---|---|---|---|
| **DISCO** | Music catalog management and pitching for labels, publishers, sync teams | Base plans by users and files (e.g. 1 user / 1K files); Discovery Suite add-on from $10/mo up to 250 tracks; watermarking add-on; Enterprise with API and SSO [V] S23 | **Closest analogue for music**: cloud catalog, AI auto-tagging, similarity search, branded share links. A strong incumbent for labels and publishers |
| **Songtrust** | Global publishing administration (royalty collection) | $100 setup; 15% on performance, 20% on mechanical royalties [V]/[T] S24 | Different business (rights admin). Partner or integration, not a competitor |
| **Soundmouse** | Cue-sheet and music-usage reporting for broadcasters and societies | Enterprise, quote-based; BMI agreed to acquire it from Orfium (May 2026) [T] S25 | Out of MVP scope |
| **Curve Royalty Systems** | Royalty accounting for labels and publishers | Publishing Lite from £20/mo; Professional ~£2,500/yr; Enterprise quote [V] S26 | Out of MVP scope |

---

## Additional competitors discovered (to profile in Phase 0.5)
| Product | Why relevant | Status |
|---|---|---|
| BaseHead, Sononym | SFX/sample librarians (above) | Partially profiled |
| Notetracks | Audio-first async review | Partially profiled |
| WAVS AI Sample Finder | Audio-to-audio sample search [T] S65 | Not profiled |
| Pro Sound Effects, Sound Ideas (UCS data upgrades) | Large SFX library vendors; their **EULAs decide cloud-sharing feasibility** | Not profiled. **High priority** |
| Dropbox Replay, Pibox | Generic and alternative media review (S61) | Not profiled |
| Generic DAM (Bynder, Iconik, etc.) | Generic media asset management | [K] Not profiled; generally video- and image-centric |

## Open-source projects found on GitHub (checked 2026-11-07)
| Project | Licence | Activity | Stack | Features | Relevance |
|---|---|---|---|---|---|
| **SoundBot** (Huckrick/SoundBot) | **GPL-3.0-or-later** (LICENSE file) | 309 commits, 18 stars, pre-release v0.2.1-beta.3 with Windows EXE + macOS (Apple Silicon) DMG; not signed/notarized | Electron + Python 3.12 FastAPI sidecar, PyTorch, LAION `larger_clap_general`, Chroma, SQLite, PyInstaller | CLAP semantic search, hybrid score (CLAP 0.55 / text metadata 0.30 / keyword+UCS 0.15), UCS mapping, waveform, tags, optional LLM assistant. No DAW drag or BWF mentioned | **A free open-source competitor** to our desktop alpha: proves local CLAP search is feasible, and raises the bar on what "better" means |
| **Auracle** (ruarim/auracle) | README says MIT, but the **LICENSE file returned 404** (unverified) | 14 commits, 0 stars, no releases | Tauri 2 + React 19, ONNX Runtime CLAP, sqlite-vec, Symphonia | Text + file-based semantic search. No waveform, DAW drag, BWF or UCS | Validates our design (CLAP ONNX + sqlite-vec). Too early to build on |
| **Pulp** (vincehi/pulp) | **No licence** (all rights reserved by default) | 185 commits, 111 stars; v2 "not open source yet" | Tauri + Solid-JS + Prisma/SQLite; Essentia | Folder scan and organisation; no AI search | Not usable |
| **choralith-audio-explorer** (stesproject) | MIT (per repo list) | 5 stars | Electron + React + Vite | Minimal audio library explorer (features not verified) | Too small to be a base |
Source: S73.

## Competitive positioning summary
- **Strongest feature sets in their own lanes:** Pro Tools (post), iZotope RX (repair), Splice (sample discovery with ML), Soundminer (pro SFX metadata), Frame.io (async review), Descript (spoken-word editing), DISCO (music catalog with AI tagging).
- **Nobody found in this research combines:** (a) indexing the *user's own* multi-vendor sound library, (b) AI semantic and similarity search over it, (c) browser-based team sharing, and (d) audio-first review, at prosumer price points. *This is a hypothesis about a combination, not proof of demand* (see [07](07_market_gap_analysis.md)).
