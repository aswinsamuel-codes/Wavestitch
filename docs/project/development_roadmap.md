# Development Roadmap

Date: 2026-11-07

## ▶ Revision 1: Desktop alpha track (current plan, ADR-013)
Tester group: **1 macOS (Logic Pro)** and **2 Windows** (including the founder) to start; the founder will recruit more.

| Step | Weeks [A] | What happens | Exit criteria |
|---|---|---|---|
| **D0 — Technical spikes** | 1–2 | (1) CLAP ONNX on CPU: speed + search quality on a real library, on an M-series Mac and a Windows laptop. (2) **Drag a file from an Electron window into Logic Pro** and the Windows testers' DAWs. (3) Build, sign and notarize a "hello world" installer for both OSs through GitHub Actions | All three work, or a documented workaround |
| **D1 — Build alpha v0.1** | 3–8 | Features A1–A12 ([desktop_app_architecture §6](../architecture/desktop_app_architecture.md)) | Founder uses it daily for 1 week without blockers |
| **D2 — Tester round 1** | 9–12 | Ship to all testers; in-app feedback; 15-min call per tester every 2 weeks; opt-in crash reports | ≥ 2 of 3 initial testers use it in real sessions in weeks 3–4 |
| **D3 — v0.2 + wider testers** | 13–16 | Fix top issues; add the most-requested feature; invite new testers (target 10–15 incl. sound designers and game-audio people) | Clear signal on what to build next and whether people would pay |
| **D4 — Decide next** | 17 | Options: paid desktop release (licence keys), device sync, team library, web review links | Founder decision based on data |

### What we measure with testers (opt-in, anonymous counters, no audio leaves the machine)
- Searches per session; share of **AI searches** vs keyword searches; "more like this" usage.
- Time from search to drag-out; how often results are dragged to a DAW.
- Do they still open their old tool (Logic browser, Soundly, folders)? (Ask in calls.)
- Crashes, indexing failures, unsupported files.
- End of round: "How disappointed would you be if this app disappeared?" and "Would you pay $X?"
- Hardware idea check (ADR-015): "Do you own a MIDI controller? Would you browse and audition sounds with knobs? Would you ever want this without a computer (field, live)?"

### Feedback hygiene (friends are polite)
Ask about **what they did**, not what they think ("Show me the last sound you looked for"). Watch one live session per tester if possible.

---

*The original web-first roadmap below remains the plan for the cloud/team product after the desktop alpha.* · Durations assume the ≈4.25-FTE team in [12 §5](../research/12_unit_economics.md) [A]. Calendar dates are relative ("Week 0" = founder approval).

> Chart dates are **illustrative**, assuming approval on 2026-11-30 (Week 0). Shift them by the actual approval date.

```mermaid
gantt
    title AUDIO OS — indicative roadmap (Week 0 = 2026-11-30, illustrative)
    dateFormat  YYYY-MM-DD
    axisFormat  %b %y
    section Phase 0.5 Discovery
    Customer interviews (25+), EULA review     :d1, 2026-11-30, 42d
    AI eval spike (CLAP on UCS eval set)       :d2, 2026-11-30, 42d
    Landing page + waitlist + pricing survey   :d3, 2026-12-07, 35d
    section Phase 1 MVP build
    Foundations: repo, CI, auth, tenancy, IaC  :b1, 2027-01-11, 28d
    Upload + ingest pipeline                   :b2, 2027-01-25, 42d
    Audition UI + keyword search               :b3, 2027-02-08, 42d
    AI embeddings + semantic/similar search    :b4, 2027-02-22, 42d
    AI suggestions + bulk review               :b5, 2027-03-22, 28d
    Collections, downloads, licence fields     :b6, 2027-03-22, 28d
    Billing + quotas                           :b7, 2027-04-05, 21d
    Security hardening, export/deletion, audit :b8, 2027-04-19, 28d
    section Phase 2 Private beta
    Beta (10–20 teams), iterate                :p1, 2027-05-17, 56d
    Pen test + legal docs final                :p2, 2027-05-31, 28d
    section Phase 3 Launch & P1
    Paid launch                                :milestone, l1, 2027-07-12, 0d
    Share links + comments + approvals         :q1, 2027-07-12, 42d
    Versions + loudness reports                :q2, 2027-07-26, 35d
    BYO bucket + previews-only mode            :q3, 2027-08-09, 42d
    Metadata editor + write-back               :q4, 2027-08-23, 35d
    section Phase 4 P2
    Desktop companion (index, drag/spot)       :r1, 2027-10-04, 84d
    Public API + webhooks                      :r2, 2027-10-18, 56d
    SSO + audit export (Business plan)         :r3, 2027-11-01, 42d
```

## Milestones and exit criteria
| Milestone | Week [A] | Exit criteria |
|---|---|---|
| **M0 — R&D approved** | 0 | Founder signs the charter; decisions D-01…D-03 made |
| **M1 — Discovery complete** | 6 | O1 and O2 met **or** a documented pivot (re-rank options using [07](../research/07_market_gap_analysis.md) "what would change") |
| **M2 — Walking skeleton** | 10 | Login → create org → upload 1 file → preview plays → keyword search finds it, deployed to staging with CI/CD |
| **M3 — Feature-complete MVP** | 24 | All P0 features; ingest of 50k files tested; cross-tenant tests green |
| **M4 — Private beta** | 24–32 | Beta success metrics tracked; pen test fixed (critical/high) |
| **M5 — Paid launch** | 32 | Billing live; ToS/Privacy/DPA published; status page; on-call |
| **M6 — Review & BYO** | ~44 | P1 core shipped |
| **M7 — Desktop + API** | ~56 | P2 core shipped |

## Phase 0.5 work plan (immediately after approval)
1. **Interviews:** 10 sound designers, 8 game-audio developers, 4 post-production editors, 3 library operators. Script: current tools, last painful search, library size, cloud usage, budget, licence constraints.
2. **EULA review:** top 10 SFX vendors' licence terms on cloud/network storage and seat sharing.
3. **Incumbent check:** current Soundly / Soundminer V7 / BaseHead release notes for AI semantic search.
4. **AI spike (1 engineer):** build the eval set, benchmark CLAP variants, CPU throughput (TQ-4), pgvector filtered recall (TQ-5).
5. **Fake-door landing page** with plan selection; target ≥ 300 sign-ups from community posts [A].
6. **Update** [07](../research/07_market_gap_analysis.md), [11](../research/11_business_model_analysis.md) and [14](../research/14_mvp_recommendation.md) with the findings → go/no-go for build.
