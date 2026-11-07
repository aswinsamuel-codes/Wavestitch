# 07 — Market Gap Analysis (Phase 0.5)

Research date: 2026-11-07

> **Method.** A capability counts as a *gap candidate* only if (1) a **customer problem** is plausible from evidence, not just a missing feature in one product, and (2) the existing solutions have a **specific, explainable shortcoming**. Evidence strength is rated **Strong / Moderate / Weak**. Weak means "hypothesis worth testing", not "proven".
> Scores (1 = low, 5 = high) are researcher judgement [A].

## Summary scorecard

| ID | Gap candidate | Evidence | Tech complexity | Commercial opportunity | Competitive difficulty | Verdict |
|---|---|---|---|---|---|---|
| **G1** | AI semantic + similarity search over the user's **own** multi-vendor library | Moderate | 3 | 4 | 3 | **Pursue (MVP core)** |
| **G2** | AI-assisted ingest: auto-tagging, UCS categorisation, duplicate detection | Moderate | 3 | 4 | 3 | **Pursue (MVP core)** |
| **G3** | Browser-based, cross-device **team** audio library with permissions | Moderate | 3 | 4 | 3 (Soundly multi-user) | **Pursue (MVP)**, blocked on EULA question |
| **G4** | Audio-first async review: waveform comments, versions, loudness report | Weak-Moderate | 2 | 3 | 3 (Frame.io, Notetracks) | **P1 add-on**, not lead |
| G5 | Licence and provenance tracking attached to each asset through delivery | Weak | 2 | 3 (B2B) | 2 | P1–P2 (differentiator for teams) |
| G6 | Affordable alternative to $899 pro librarians for freelancers | Moderate (price evidence) | — | 3 | 4 (Soundly, BaseHead free) | Positioning, not a feature |
| G7 | Unified "audio OS" across all ten segments | Weak | 5 | ? | 5 | **Reject for MVP** (too broad) |
| G8 | Peer audio marketplace | Weak | 4 | 3 | 5 (Splice, Epidemic, ASoundEffect) | P3 |

---

## G1 — AI search over the user's own library
1. **Problem:** Search fails when files are badly named or untagged. Users audition many files or browse folders to find a sound.
2. **Who:** Sound designers, game-audio developers, film editors, producers with large sample collections.
3. **Existing solutions:** Keyword search in Soundly/Soundminer/BaseHead; Splice ML search (**own catalog only**) [V] S06; Sononym similarity (local desktop, music samples) [T] S34; DISCO similarity (music catalogs) [V] S23.
4. **Evidence:**
   - Splice invests in ML discovery and reports ~10% search-conversion uplift (vendor-reported) [T] S07, so ML search changes behaviour **in catalogs**.
   - Community advice on metadata cleanup and UCS shows metadata quality is a known burden [T] S37.
   - Old but enduring practitioner commentary on metadata in library apps [T] S38.
   - **Missing:** direct evidence that users would *pay* for AI search over their own files. → Validate.
5. **Why current solutions fall short:** AI search is tied to vendor catalogs. Desktop librarians focus on metadata search, and whether they offer AI semantic search is **unverified** (marked "?" in [03](03_competitor_feature_matrix.md)). Competitors may already ship or plan this. Check Soundly/Soundminer V7 release notes in Phase 0.5.
6. **Proposed solution:** Hybrid search: Postgres full-text + CLAP text–audio embeddings + audio–audio nearest neighbour (pgvector), with filters (UCS cat, duration, SR, channels, library, licence).
7. **Complexity (3):** Embedding pipeline and vector index are well understood. Hard parts are relevance tuning for pro SFX vocabulary, and latency at 1M+ files per tenant.
8. **Opportunity (4):** Core repeated daily task. Easy to demo ("type 'distant thunder rumble' and hear it").
9. **Competitive difficulty (3):** Incumbents can add CLAP-style search. The moat must come from **workflow + team + cross-library + cloud**, not the model.

## G2 — AI-assisted ingest and tagging
1. **Problem:** Tagging and UCS-categorising new or self-recorded libraries is slow and manual.
2. **Who:** Sound designers (own field recordings), library operators, game-audio teams.
3. **Existing:** Manual metadata editing (Soundminer, Soundly); UCS spreadsheets and namers (S36); DISCO auto-tagging for music [V] S23.
4. **Evidence:** Reddit cleanup thread [T] S37; UCS adoption by vendors [V]/[T] S03, S36; academic work on dataset unification with UCS (DAFx 2026) [T] S66 shows the classification problem is active.
5. **Gap:** Few SFX-oriented auto-taggers that output **UCS CatIDs** were found. Accuracy on fine-grained UCS subcategories is **unknown** (see [09](09_ai_model_evaluation.md)).
6. **Solution:** Zero-shot CLAP tagging against the UCS vocabulary + AudioSet tagger (PANNs/YAMNet) + learned classifier later; human-in-the-loop bulk review.
7. **Complexity (3):** Getting usable accuracy on 700+ subcategories is the main risk.
8. **Opportunity (4):** Clear time-saving ROI; measurable.
9. **Difficulty (3).**

## G3 — Cloud team library
1. **Problem:** Libraries live on local drives or facility servers. Remote and hybrid teams can't access or share them with permissions.
2. **Who:** Small post houses, game-audio teams, distributed freelancers.
3. **Existing:** Soundly multi-user with private cloud storage [V] S02; BaseHead HTTP CloudPacks [V] S33; generic cloud drives (no audio search).
4. **Evidence:** Soundly sells exactly this to multi-user customers [V] S02, which shows demand exists. Weakly, incumbents' desktop-first design suggests browser access is underserved.
5. **Gap:** A browser-first product needs no install for reviewers, producers and non-audio staff. **Blocking question:** commercial SFX EULAs may forbid shared cloud hosting (open question Q3).
6. **Solution:** Organisation workspaces, roles, shared libraries, per-library licence rules (e.g. restrict a vendor library to licensed seats).
7. **Complexity (3).** **Opportunity (4)** (B2B seats). **Difficulty (3).**

## G4 — Audio-first review and approval
1. **Problem:** Feedback on mixes and sounds is un-timestamped, scattered and unversioned.
2. **Who:** Mix engineers, sound designers delivering to clients, podcast teams.
3. **Existing:** Frame.io (video-first) [V] S11; Notetracks (audio-first, small) [T] S35; Audiomovers (real-time only) [V] S12; Descript (spoken-word).
4. **Evidence:** Claims that Frame.io lacks deep audio review come from **competitors (biased)** [T] S61. The Audio Design Desk ↔ Frame.io integration shows sound people already use video review tools [T] S62.
5. **Gap:** Moderate at best, because Frame.io is "good enough" for many. Value rises when review is **attached to the library and versions** already in AUDIO OS.
6. **Solution:** Share link with waveform comments, A/B versions, loudness report, approve button.
7. **Complexity (2).** **Opportunity (3).** **Difficulty (3).**

## G5 — Licence and provenance tracking
- **Problem:** Teams can't easily answer "which licensed source files are in this shipped asset, and under which licence?" [A]
- **Existing:** Licence metadata fields in librarians; spreadsheets. No integrated provenance found in this research (weak evidence).
- **Solution:** Licence records linked to library or vendor; derived-asset links ("made from"); exportable report.
- **Verdict:** Valuable to studios and enterprise. Build the **data model** in the MVP (cheap), and the UI in P1–P2.

## Rejected or deferred
- **G7 Unified OS for all segments:** No evidence that any single buyer wants all ten capabilities; extremely broad. Kept as **vision**, not MVP.
- **G8 Marketplace:** Needs supply, licensing law and payouts; incumbents are strong. Only after a user base exists.
- **Studio management (Option B):** Competes with generic booking, CRM and invoicing tools; weak audio-specific moat.
- **Real-time collaboration (Option C):** Audiomovers / Source-Connect / Evercast are entrenched, and real-time low-latency audio is a hard specialist problem.

## What would change this analysis
| Finding in Phase 0.5 | Effect |
|---|---|
| Soundly or Soundminer already ships good AI semantic search | G1 moat shrinks → lead with team/cloud + review (G3 + G4) |
| Major SFX EULAs forbid cloud hosting | G3 needs a "metadata + proxy only" or bring-your-own-storage design (see [10](10_storage_and_infrastructure_analysis.md)) |
| Interviewees rank review pain above search pain | Re-sequence: G4 to P0 |
| CLAP tagging accuracy on UCS < ~60% top-5 [A threshold] | Position as "suggestions", invest in a fine-tuned classifier earlier |
