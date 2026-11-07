# Risk Register

Date: 2026-11-07 · Likelihood (L) and Impact (I): 1 = low … 5 = high · Score = L × I · Owner roles per [charter](project_charter.md)

| ID | Risk | Category | L | I | Score | Mitigation | Owner | Trigger / early signal |
|---|---|---|---|---|---|---|---|---|
| R-01 | Customers don't value AI search over own library enough to pay | Market | 3 | 5 | **15** | Phase 0.5 interviews + fake-door pricing; beta conversion metrics; pivot options documented | Founder | < 40% rank search in top-3 pains |
| R-02 | Commercial SFX EULAs forbid cloud/team hosting of licensed libraries | Legal / Market | 3 | 5 | **15** | EULA review; seat-restricted libraries; previews-only + BYO modes; vendor partnerships | Founder + counsel | Top vendors prohibit network storage |
| R-03 | Web-only product loses to desktop librarians on DAW drag/spot speed | Product | 4 | 4 | **16** | Optimise download/drag-out; position for team/browser use; desktop companion in P2; usability tests vs incumbents | Tech lead | Beta users keep using the old tool for spotting |
| R-04 | Incumbents (Soundly, Soundminer, Splice) ship equivalent AI search | Competitive | 4 | 3 | 12 | Compete on cross-library + team + review + licensing; speed of iteration; pricing | Founder | Incumbent release notes |
| R-05 | Zero-shot AI accuracy too low on pro UCS vocabulary | Technical | 3 | 4 | 12 | Eval gate before build; hybrid keyword fallback; "suggestions" UX; supervised head (opt-in data) | ML engineer | UCS top-5 < 0.6 |
| R-06 | Storage costs erode margins (heavy-tail users, multi-TB) | Financial | 4 | 4 | **16** | Quotas, fair use, BYO bucket, previews-only, archive tier; monitor per-tenant COGS | Founder + tech lead | Gross margin < 60% in beta |
| R-07 | Cross-tenant data leak (licensed libraries exposed) | Security | 2 | 5 | 10 | RLS + repository scoping + CI isolation tests + pen test; presigned URL authz | Tech lead | Any isolation test failure |
| R-08 | Malicious or malformed media exploits decoders | Security | 2 | 5 | 10 | Sandboxed workers, no egress, resource limits, patched FFmpeg, AV scan | Tech lead | CVE in FFmpeg |
| R-09 | Licence contamination (AGPL/NC/GPL dependencies) | Legal | 3 | 4 | 12 | ADR-009 licence gate in CI; SBOM; counsel review | Tech lead | Scan failure |
| R-10 | Privacy non-compliance (DPDP obligations from 13 May 2027; GDPR) | Legal | 2 | 4 | 8 | Privacy-by-design data model (consent, requests, retention); counsel review before beta | Founder + counsel | Launch in a new jurisdiction |
| R-11 | Platform used to host or distribute pirated audio via share links | Legal / Trust | 3 | 4 | 12 | Takedown process, repeat-infringer policy, link limits, DMCA agent, abuse monitoring | Founder | Abuse reports |
| R-12 | pgvector performance/recall with tenant filters at scale | Technical | 2 | 3 | 6 | Benchmark (TQ-5); iterative scans; partial indexes; SearchIndex abstraction for migration | Tech lead | p95 > 500 ms |
| R-13 | Vendor dependency changes (pricing/licences, e.g. MinIO archive, Redis licence) | Technical / Financial | 3 | 3 | 9 | S3-compatible abstraction; Valkey; multi-provider DR; annual vendor review | Tech lead | Vendor announcements |
| R-14 | Scope creep toward "unified OS for everything" before PMF | Execution | 4 | 4 | **16** | Charter scope; P0 freeze; roadmap gates tied to metrics | Founder | New modules started before M5 |
| R-15 | Team capacity / hiring shortfall (audio + ML skills are niche) | Execution | 3 | 4 | 12 | Hire tech lead with media experience; ML part-time contractor; reduce P0 if needed | Founder | Unfilled roles at week 6 |
| R-16 | Upload UX fails for TB-scale libraries (browser limits, connectivity) | Product / Technical | 3 | 3 | 9 | Multipart resumable; background-upload guidance; previews-only via desktop companion (P2) | Tech lead | Upload failure rate > 2% |
| R-17 | Pricing mismatch with perpetual-licence culture of pros | Market | 3 | 3 | 9 | Annual plans; fallback licence idea for the desktop companion; clear ongoing value | Founder | Price objections in interviews |
| R-18 | Payment/tax compliance in multiple countries | Financial / Legal | 2 | 3 | 6 | MoR provider (ADR-012) | Founder | — |
| R-19 | Brand/trademark conflict with "AUDIO OS" | Legal | 3 | 3 | 9 | Trademark search (D-12) before public launch | Founder | Search results |
| R-20 | Open-model training-data provenance challenged (CLAP etc.) | Legal / Reputation | 2 | 3 | 6 | Counsel review; model documentation; ability to switch models | Founder + counsel | Industry litigation news |
| R-21 | GPU provider outage or cost spike | Operational | 2 | 2 | 4 | CPU fallback path for CLAP; multi-provider image | Tech lead | Queue backlog |
| R-22 | Research data out of date (prices and features change) | Research | 4 | 2 | 8 | Re-verify the source register before external use; quarterly competitor review | Founder | — |

## Top risks (score ≥ 15)
R-03 web vs desktop workflow · R-06 storage margin · R-14 scope creep · R-01 willingness to pay · R-02 EULA constraints.

## Revision 1 (2026-11-07): effect of the desktop-first alpha (ADR-013)
| ID | Change |
|---|---|
| R-03 | **Reduced** to L2 × I4 = 8: native drag-out into DAWs (verify in Logic Pro, DQ-D1) |
| R-06 | **Reduced** to L1 × I4 = 4 for the alpha: no cloud storage |
| R-02 | **Reduced** to L2 × I4 = 8: files stay local (team/cloud features later must revisit it) |
| R-04 | **Increased** to L4 × I4 = 16: head-on with desktop librarians; AI search must be clearly better |

| ID | New risk | L | I | Score | Mitigation |
|---|---|---|---|---|---|
| R-23 | Small, friendly tester group gives biased or thin feedback | 4 | 3 | 12 | Recruit to 10–15 testers (founder in progress); behaviour metrics; ask about actions, not opinions |
| R-24 | CLAP on CPU too slow, or installer too large, on testers' machines | 3 | 3 | 9 | Quantized ONNX; throttled background indexing; download model on first launch; spike D0 |
| R-25 | macOS Gatekeeper / Windows SmartScreen / **Smart App Control** blocks installs | **5** | **4** | **20** | **Confirmed 2026-11-07:** Smart App Control (On) on the founder's Windows 11 PC blocks unsigned `electron.exe` and the Vite/rolldown native binding, so it blocks both development and running the app. Windows testers with Smart App Control on **cannot run an unsigned build at all** ("Run anyway" is not offered). Mitigation: Windows code signing **before the first Windows tester build** (Microsoft Artifact Signing, or an OV/EV certificate); Apple notarization for Mac |
| R-26 | Drag-out doesn't land on the DAW timeline (Logic or others) | 2 | 5 | 10 | Spike D0 first; fall back to "Reveal in Finder/Explorer" + copy to a project folder |
| R-27 | Piracy and licence enforcement once the desktop app is paid | 3 | 3 | 9 | Licence keys with online activation (later); keep value in updates and sync |
| R-28 | Bundling a GPL component by mistake | 2 | 4 | 8 | Licence scan in CI; third-party licences screen (ADR-009 amendment) |
| R-30 | HT-Demucs weights may not be licensed for commercial use (trained on MUSDB18; sources conflict) | 3 | 4 | 12 | Keep the stem splitter alpha-only; get counsel's view or written confirmation before any paid release; fallback is Spleeter (MIT) or a licensed commercial model | Founder + counsel | Before pricing launch |
| R-29 | Free open-source tools (e.g. SoundBot, GPL-3.0) already offer local CLAP search, which undercuts willingness to pay | 3 | 4 | 12 | Compete on quality and speed of search, DAW drag-out, BWF/iXML/UCS depth, polish, signed installers and support; benchmark against SoundBot in spike D0 |
