# 05 — Customer Personas (Phase 0.4)

Research date: 2026-11-07

> **Status: HYPOTHESES.** These personas come from desk research: public product positioning, forum and Reddit discussions, industry practice and the researcher's domain knowledge. **No interviews have been done.** Every pain point and willingness-to-pay (WTP) figure is labelled [A] unless a source is cited. Phase 0.5 must validate them with **at least 5 interviews per priority persona** (see [development_roadmap](../project/development_roadmap.md)).
>
> Software names under "Currently uses" are typical tool sets, not survey data.

Priority for the recommended MVP (AI asset management): **P1 = primary target**, P2 = secondary, P3 = later.

---

## 1. Independent music producer — "Riya" (P2)
| Dimension | Detail |
|---|---|
| Responsibilities | Writes and produces tracks; makes beats for artists; sometimes sells sample packs |
| Daily workflow | Browse samples → build loops in DAW → arrange → mix → bounce → share demo with artist or collaborator |
| Currently uses | FL Studio / Ableton / Logic; Splice; Google Drive / WeTransfer; WhatsApp or Discord for feedback [A] |
| Pain points | Tens of thousands of samples spread across packs and drives; can't remember where "that snare" is; duplicate packs; Splice AI search doesn't cover purchased non-Splice packs [A] (Splice limit [V] S06) |
| File-management challenges | Inconsistent vendor folder naming; no metadata on many samples; multiple machines |
| Collaboration | Send stems to collaborators; get timestamped feedback on demos |
| Budget behaviour | Very price-sensitive; already pays for Splice ($12.99–$19.99) [V] S05; prefers perpetual (FL lifetime updates) [T] S29 |
| WTP hypothesis | $0–$8/month [A] |
| Switch triggers | "Search all my samples by sound or description"; similarity "find more like this" across all packs; free tier usable |
| Risk | Desktop sample browsers with similarity (Sononym) already exist at ~$99 one-time [T] S34 |

## 2. Professional sound designer (freelance / small team) — "Arjun" (**P1**)
| Dimension | Detail |
|---|---|
| Responsibilities | Designs SFX for film, trailers, ads and games; records field audio; delivers to editors and directors |
| Daily workflow | Brief → search library → audition → layer and design in DAW → render variations → deliver → revisions |
| Currently uses | Soundly or Soundminer or BaseHead; Pro Tools / Reaper; iZotope RX; Frame.io or Dropbox for delivery [K] S38 |
| Pain points | Library sprawl across commercial vendors (multi-TB) and own recordings; inconsistent metadata; first-pass cleanup and tagging of new libraries is tedious [T] (S37 Reddit cleanup thread); search fails when metadata is poor [A] |
| File-management challenges | UCS renaming; keeping BWF/iXML metadata intact (S37); syncing library across laptop and studio |
| Collaboration | Share selections or "pulls" with editor or director; get approvals; hand off to mixer |
| Budget behaviour | Invests in tools that save hours; has paid $199–$899 for Soundminer-class tools [V] S04 |
| WTP hypothesis | $15–$30/month for a tool that saves ≥2 hours/week [A] |
| Switch triggers | AI tagging of untagged libraries; semantic + similarity search over *own* library; cloud access from anywhere; **must not break DAW drag/spot** |
| Risk | Loyal to established librarians; licence restrictions on putting commercial libraries in cloud (Q3 in [01](01_industry_overview.md)) |

## 3. Game-audio developer — "Mei" (**P1**)
| Dimension | Detail |
|---|---|
| Responsibilities | Creates and implements SFX, VO and music in game engines via middleware |
| Daily workflow | Asset list from design → source / design sounds → export variations with naming conventions → implement in Wwise/FMOD/engine → test in game → iterate |
| Currently uses | Reaper (common in game audio [K]); Wwise/FMOD; Soundly/BaseHead; Perforce/Git LFS; Jira [K] |
| Pain points | Thousands of variations; strict naming rules; tracking which source files and licences went into which shipped asset; review by non-audio leads [A] |
| File-management challenges | Source library vs engine-ready exports; version history; per-project licence tracking |
| Collaboration | With designers, producers and outsourcing vendors; async review of sound candidates |
| Budget behaviour | Studio pays; per-seat tools are fine if IT approves; indie devs very price-sensitive |
| WTP hypothesis | Studio: $15–$30/seat/month; indie: $0–$10 [A] |
| Switch triggers | Shared team library with AI search; licence provenance per asset; review links; API for pipeline automation |

## 4. Recording studio owner — "Vikram" (P3)
| Dimension | Detail |
|---|---|
| Responsibilities | Runs rooms, books sessions, manages engineers, client relations, billing |
| Daily workflow | Bookings → sessions → backups → deliver mixes/stems → invoice → follow up |
| Currently uses | Pro Tools; booking/calendar tools; accounting software; Dropbox/Drive; WhatsApp/email [A] |
| Pain points | Session backups and client file archives; delivering versions to clients; chasing approvals and payments [A] |
| WTP hypothesis | $30–$100/month for the studio if it replaces several tools [A] |
| Switch triggers | Client portal with review and approval + project archive + invoicing. **That is studio management (Option B), not the MVP** |

## 5. Audio engineer (mix/master, freelance) — "Sam" (P2)
| Dimension | Detail |
|---|---|
| Responsibilities | Mixes and masters for artists, labels and podcasts |
| Daily workflow | Receive stems → mix → print versions → send for review → revisions → final masters + loudness spec |
| Currently uses | Pro Tools / Logic / Reaper; Audiomovers for live sessions [V] S12; WeTransfer/Dropbox; email for notes |
| Pain points | Feedback arrives as vague, un-timestamped messages; version confusion ("mix_v7_final_FINAL2"); loudness spec compliance [A] |
| WTP hypothesis | $10–$20/month for audio-first review + versions [A] |
| Switch triggers | Waveform-anchored comments; A/B versions; loudness report per version; client needs no account |

## 6. Film sound editor (post-production) — "Daniel" (P2)
| Dimension | Detail |
|---|---|
| Responsibilities | Dialogue/SFX/ambience editing to picture; conform; deliver stems to re-recording mixer |
| Currently uses | Pro Tools (standard) [K]; Soundminer/Soundly/BaseHead; facility server; Frame.io for picture review |
| Pain points | Facility libraries on local servers are unavailable remotely; spotting speed matters more than anything [A] |
| Budget behaviour | Facility buys site licences; freelancers buy their own tools |
| WTP hypothesis | Facility: enterprise contract; freelancer: $15–$30/month [A] |
| Switch triggers | Remote access to facility library with permissions; fast audition; Pro Tools spotting (needs desktop companion) |

## 7. Podcast production team — "Studio Mic & Co." (P3)
| Dimension | Detail |
|---|---|
| Responsibilities | Produce shows for clients: record, edit, master, publish, report |
| Currently uses | Riverside, Descript, Auphonic, Hindenburg, Alitu (S15–S19); Google Drive; Slack |
| Pain points | Client review loops, asset reuse (intros, beds, ads), loudness compliance across shows [A] |
| WTP hypothesis | $20–$60/month per team [A] |
| Assessment | Crowded segment with strong AI incumbents. Serve only through generic review and library features |

## 8. Audio library operator (SFX/music library vendor) — "SoundForge Ltd." (P3, partner)
| Dimension | Detail |
|---|---|
| Responsibilities | Record, edit, metadata-tag and sell SFX/music libraries; manage customer licences |
| Currently uses | Soundminer for metadata [K]; own store or marketplaces (A Sound Effect, etc.); UCS [V] S36 |
| Pain points | Metadata authoring at scale; UCS compliance; distribution to many librarian apps; licence enforcement [A] |
| WTP hypothesis | B2B: per-catalog fees or revenue share [A] |
| Assessment | Important **partner** (licensing terms for cloud libraries; catalog supply for a future marketplace) |

---

## Persona prioritisation rationale
| Persona | Pain severity [A] | WTP [A] | Reachability [A] | Fit with AI asset mgmt | Priority |
|---|---|---|---|---|---|
| Professional sound designer | High | Medium-high | Communities (r/sounddesign, r/AudioPost, Discords) | Very high | **P1** |
| Game-audio developer (small studios) | High | Medium-high (studio budget) | Game-audio communities, GDC | Very high | **P1** |
| Film sound editor | High | High (facility) | Harder (facility sales) | High (needs DAW spotting) | P2 |
| Audio engineer | Medium | Medium | Easy | Medium (review) | P2 |
| Independent producer | Medium | Low | Easy, large | Medium | P2 |
| Studio owner, podcast team, library operator | Medium | Medium | Medium | Low (different product) | P3 |
