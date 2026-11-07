# Project Charter — AUDIO OS

Date: 2026-11-07 · Version 0.1 (draft for founder approval)

## 1. Purpose
Build and launch a web-based, AI-powered audio asset management SaaS (MVP) for sound designers and small game-audio/post-production teams, as the first module of the AUDIO OS platform.

## 2. Objectives (measurable)
| # | Objective | Measure | Target date [A] |
|---|---|---|---|
| O1 | Validate problem and willingness to pay | ≥ 25 interviews across P1 personas; ≥ 40% rank library search/organisation in their top-3 pains; ≥ 30 waitlist sign-ups with role data | End of Phase 0.5 (+6 weeks) |
| O2 | Prove AI search quality | Eval set built; Recall@10 ≥ 0.6, UCS top-5 ≥ 0.6 (or documented fallback) | Phase 0.5 / early build |
| O3 | Ship MVP to private beta | All P0 features ([14](../research/14_mvp_recommendation.md)) live; security baseline complete | ~6 months after build start |
| O4 | Beta product-market signals | Success criteria in [14 §5](../research/14_mvp_recommendation.md) | +8 weeks after beta start |
| O5 | Paid launch | ≥ 100 paying accounts or ≥ 10 paying studios [A] | ~3 months after beta |

## 3. Scope
**In:** P0 features; infrastructure for one region; ToS/Privacy/DPA; billing; documentation; customer discovery.
**Out:** P1–P3 features (see MVP doc), mobile apps, desktop companion, marketplace, on-prem.

## 4. Stakeholders and roles
| Role | Responsibility |
|---|---|
| Founder / Product owner | Vision, decisions D-01…D-12, customer discovery, approvals |
| Tech lead | Architecture, code quality, security baseline |
| Engineers (backend/audio, frontend, ML) | Delivery |
| Designer | UX for audition, search and bulk review |
| Legal counsel (external) | ToS, privacy, EULA review, takedown process, DPDP/GDPR |
| Beta customers (10–20 teams) | Feedback, usage data |

## 5. Constraints
- Web application first (brief).
- No implementation until R&D approval (brief).
- Small team; budget per [12 §5](../research/12_unit_economics.md).
- Licence gate on dependencies (ADR-009).

## 6. Assumptions (to validate)
See all [A] items. The most critical ones:
1. P1 personas will pay $15–$30/user/month for AI search plus a cloud team library.
2. Commercial SFX EULAs permit (or can be negotiated to permit) seat-restricted cloud hosting.
3. CLAP-class models deliver useful relevance on pro SFX vocabularies.
4. A web-first product is adoptable before a desktop companion exists.

## 7. Founder decisions required
| ID | Decision |
|---|---|
| D-01 | Approve MVP direction A (AI asset management) and P1 personas |
| D-02 | Approve a 6-week Phase 0.5 (customer discovery + AI eval spike) before the build starts |
| D-03 | Accept web-first with the desktop companion deferred to P2 (ADR-011) |
| D-04 | Identity provider vendor |
| D-05 | Billing: Merchant of Record (Paddle) vs Stripe/Razorpay |
| D-06 | Launch hosting region (EU vs India) and container platform vendor |
| D-07 | Launch markets and regional (INR/PPP) pricing |
| D-08 | Team model and budget (in-house India / US-EU / agency / hybrid) |
| D-09 | Storage policy: included quotas, previews-only/BYO priority, backup tier |
| D-10 | AI data policy (no training by default) and whether to budget commercial MIR licences (e.g. Essentia) |
| D-11 | Engage legal counsel (ToS, privacy, vendor EULA review, DMCA/IT-Rules takedown) |
| D-12 | Product name: run a trademark and domain check for "AUDIO OS" (generic term; likely conflicts) |

## 8. Approval
| Name | Role | Decision | Date |
|---|---|---|---|
| | Founder | ☐ Approve ☐ Approve with changes ☐ Reject | |
