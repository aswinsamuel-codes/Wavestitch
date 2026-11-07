# 12 — Illustrative Unit Economics

Research date: 2026-11-07
> ⚠️ **Illustrative model, not a forecast.** Every input marked [A] is an assumption to replace with beta data. Price inputs marked [T] are third-party list prices ([10](10_storage_and_infrastructure_analysis.md)). Nothing here guarantees revenue or margin.

> **Revision 1 (2026-11-07), desktop alpha:** The desktop app has **almost no per-user running cost** (no storage, no server inference). Alpha costs are mainly **developer time**, plus **Apple Developer Program ~$99/year [K]**, **Windows code signing ~$10/month or a certificate [T] S72** (needed before a public release), opt-in crash reporting (free tier likely enough), and GitHub Actions minutes (macOS runners cost more [K]). The cloud model below applies once team/cloud features are added.

## 1. Cost inputs

| Input | Value | Label |
|---|---|---|
| R2 storage | $0.015 / GB-month; $0 egress | [T] S40 |
| B2 backup (originals only) | $0.00695 / GB-month | [T] S41 |
| Preview + peaks overhead | +11% of original size (AAC 256 kbps vs 24-bit/48 kHz stereo WAV ≈ 2,304 kbps) | [calc] |
| Processing + AI per audio-hour | ~$0.01 (CPU FFmpeg + CLAP), Whisper only on speech (~$0.02/h GPU) | [A] from [09](09_ai_model_evaluation.md) §3 |
| Audio density | 24-bit/48 kHz stereo WAV ≈ 17.3 MB/min ≈ 1.04 GB/hour | [calc] |
| Payment fees | Paddle ~5% + $0.50/transaction [T] S57 (blended monthly/annual) | [T]/[A] |
| Fixed platform cost | ~$800/month at ~1,000 paying accounts → $0.80/account | [A] from [10](10_storage_and_infrastructure_analysis.md) §3 |
| Support cost | $0.50–$4 per account-month by plan | [A] |
| Average storage utilisation of quota | 35–40% (base case) | [A], **largest uncertainty** |

## 2. Per-account monthly model, base case

| Line | Individual Creator | Creator Pro | Studio (5 seats) |
|---|---|---|---|
| List price | $9 | $19 | 5 × $18 = $90 |
| **Effective revenue** (mix of annual discount) [A] | **$8.25** | **$17.50** | **$80.00** |
| Stored originals | 35 GB (35% of 100 GB) | 200 GB (40% of 500 GB) | 900 GB (40% of 2.25 TB) |
| R2 (originals + 11% previews) | $0.58 | $3.33 | $14.99 |
| B2 backup | $0.24 | $1.39 | $6.26 |
| Processing + AI (new uploads/month) | $0.10 (5 GB) | $0.30 (20 GB) | $1.00 (80 GB) |
| Ops / CDN / requests | $0.05 | $0.10 | $0.50 |
| Payment processing | $0.75 | $1.10 | $4.50 |
| Allocated platform cost | $0.80 | $0.80 | $3.00 |
| Support | $0.50 | $0.75 | $4.00 |
| **Total cost to serve** | **$3.02** | **$7.77** | **$34.25** |
| **Gross margin** | **63%** | **56%** | **57%** |
| Gross margin excl. payment fees | 72% | 62% | 63% |

**Finding:** Under these assumptions **storage is the dominant cost** and margins sit below typical SaaS targets (~75–80% [K]). AI inference is not the problem.

## 3. Optimised case (levers available in the plan design)

Changes: utilisation 30% (quota tuning + archive tier), B2 backup only on Studio+ and as an add-on, 30% of Creator Pro users on BYO storage.

| Line | Creator | Creator Pro | Studio |
|---|---|---|---|
| Storage cost | $0.50 | $1.75 (blended with BYO) | $11.24 + $4.69 backup |
| Total cost | $2.70 | $4.80 | $28.93 |
| Gross margin | **67%** | **73%** | **64%** |

**Implications for plan design [A]:**
1. Keep included storage modest (or decouple it). **Sell AI search, not GB.**
2. Push heavy users to **BYO bucket** (P1 priority, not P2).
3. Offer **"previews-only" mode**: originals stay on the user's drive or bucket, and AUDIO OS keeps previews, peaks and embeddings (~11% of the size). This changes the economics for multi-TB libraries.
4. Hard quotas and fair-use terms to protect against heavy-tail users.

## 4. Customer acquisition and lifetime value (hypotheses)

| Metric | Creator | Creator Pro | Studio |
|---|---|---|---|
| CAC assumption [A] | $20–$60 (community, content, referrals) | $40–$100 | $300–$1,500 (founder-led sales) |
| Monthly churn assumption [A] | 6% | 5% | 2.5% |
| LTV = ARPA × GM / churn (base case) | ≈ $87 | ≈ $196 | ≈ $1,824 |
| LTV : CAC | 1.4–4.3 | 2.0–4.9 | 1.2–6.1 |
| CAC payback (months) | 4–12 | 4–10 | 7–33 |

**Reading:** Individual Creator is marginal unless CAC is very low (organic). **Studio/team accounts carry the model.** This supports the P1 personas (sound-design and game-audio teams).

## 5. Initial build and operating cost (order of magnitude)

### Team for MVP (≈ 6 months build + 2 months beta)
| Role | FTE |
|---|---|
| Tech lead / full-stack | 1.0 |
| Backend + audio pipeline engineer | 1.0 |
| Frontend engineer | 1.0 |
| ML engineer (search/tagging eval) | 0.5 |
| Product designer | 0.5 |
| DevOps / security (fractional) | 0.25 |
| Founder as PM / customer discovery | — |
| **Total** | **≈ 4.25 FTE × 8 months ≈ 34 person-months** |

### Cost scenarios [A, rates are assumptions; replace with real quotes]
| Item | India-based team | US/EU-based team |
|---|---|---|
| Fully loaded cost per FTE-month | $2,000–$4,500 | $10,000–$18,000 |
| MVP engineering (34 PM) | **$68k–$153k** | **$340k–$612k** |
| Infrastructure during build + beta (8 months) | $2k–$6k | $2k–$6k |
| SaaS tooling (auth, observability, design, CI) | $3k–$8k | $3k–$8k |
| Legal: ToS, privacy policy, DPA, EULA review, IP | $5k–$20k | $10k–$40k |
| Security review / pen test before GA | $5k–$15k | $10k–$30k |
| **Total to GA (approx.)** | **≈ $83k–$202k** | **≈ $365k–$696k** |

### Steady-state monthly operating cost after launch (pre-scale) [A]
- Infra fixed: $335–$1,260 ([10](10_storage_and_infrastructure_analysis.md) §3) + variable storage.
- Team: dominant cost (as above).
- **Break-even (team of ~4 in India at ~$13k/month)** ≈ 1,400–1,500 Creator-Pro-equivalent paying accounts (≈ $9.80 gross profit each), or ≈ 300 five-seat studios (≈ $45.75 gross profit each), at the base-case margin [calc, A].
