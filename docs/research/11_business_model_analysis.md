# 11 — Business Model Analysis (Phase 0.7 input)

Research date: 2026-11-07
> **Separation rule:** §1 is **researched market practice** (see [04_pricing_analysis.md](04_pricing_analysis.md)). §2 onward are **AUDIO OS proposals [A]**. They are hypotheses for pricing tests, not validated prices.

## 1. Business models observed in the market

| Model | Who uses it | Works when | Evidence |
|---|---|---|---|
| Perpetual licence + paid upgrades | Soundminer, Ableton, REAPER, iZotope, Logic (Mac) | Desktop tools with long life; pro users dislike rent | [V] S04, S30; [T] S28 |
| Perpetual + lifetime free updates | FL Studio | Loyalty and word of mouth | [T] S29 |
| Per-seat SaaS + pooled storage | Frame.io, Descript | Collaborative cloud products | [V] S11, S15 |
| Subscription + download credits | Splice | Content catalogs | [V] S05 |
| Subscription tiered by licence scope | Epidemic Sound, Artlist | Licensing content for publishing | [T] S08, S09 |
| Usage credits (hours/minutes/characters) | Auphonic, Descript AI credits, ElevenLabs | Compute-heavy AI and processing | [V] S15, S17; [T] S22 |
| Per-room / per-session premium | Evercast, Source-Connect | High-value real-time pro workflows | [T] S14; [V] S13 |
| Commission on royalties | Songtrust (15–20%) | Rights administration | [V]/[T] S24 |
| Enterprise contracts | Soundmouse, Curve, DISCO Enterprise | B2B data, compliance, SSO | [V] S23, S26 |

**What looks successful [A, inferred from longevity and market presence, not revenue data]:** per-seat SaaS for collaboration (Frame.io); credits for catalogs (Splice); perpetual for pro desktop tools (Soundminer). No revenue figures were collected, so "successful" here means durable and widely adopted, not proven profitable.

## 2. Proposed AUDIO OS monetisation levers [A]

| Lever | Use? | Rationale |
|---|---|---|
| Monthly + annual subscriptions | ✅ | Annual at ~2 months free (≈17%), in line with the 13–35% market range |
| Per-seat pricing | ✅ Studio and up | Team value scales with seats |
| Storage-based tiers | ✅ (included quota) + add-ons | Storage is the main COGS driver |
| AI usage credits | ◐ **Simple "audio hours analysed / month"** with generous inclusion; no per-feature credits | Avoids Descript-style quota confusion |
| API usage pricing | ◐ Business+ (included calls, then metered) | Pipeline automation for game studios |
| Marketplace commissions | ⏸ P3 (e.g. 20–30% take rate; to research) | No marketplace in MVP |
| Additional storage purchases | ✅ | Must stay margin-positive |
| Bring-your-own storage | ✅ Creator Pro+ | Removes storage COGS; key for multi-TB libraries |

## 3. Proposed plans (illustrative, USD, for testing) [A]

| Plan | Price (monthly / annual-per-month) | Seats | Included storage | AI analysis | Key features |
|---|---|---|---|---|---|
| **Free** | $0 | 1 | 5 GB | 5 audio-hours (one-time) then 1 h/mo | Upload, waveform preview, keyword search, AI tags on included hours, 3 active share links |
| **Individual Creator** | $9 / $7.50 | 1 | 100 GB | 25 h/mo | Semantic + similarity search, collections, UCS suggestions, 25 share links |
| **Creator Pro** | $19 / $15.83 | 1 | 500 GB | 100 h/mo | + BYO bucket (P1), bulk metadata editor, metadata write-back on export, review links with comments (P1), loudness reports |
| **Studio** | $18/seat ($15 annual), min 3 seats | 3–25 | 1 TB pooled + 250 GB/seat | 100 h/seat/mo pooled | Shared libraries, roles, licence records, project workspaces, review/approval |
| **Business** | $32/seat ($27 annual), min 10 | 10–250 | 5 TB pooled + 500 GB/seat | 200 h/seat/mo | SSO (SAML/OIDC), audit log export, API access, priority support, data residency choice |
| **Enterprise** | Custom | 50+ | Custom / BYO | Custom | Dedicated tenancy options, DPA, SLA, on-prem connector, custom contracts |

**Add-ons [A]:** +1 TB storage $20/mo (R2 list cost ~$15 → thin margin, so steer heavy users to BYO); +100 AI audio-hours $5.

### Positioning vs researched prices
- Creator ($9) sits below Splice Sounds ($12.99) and near Epidemic/Artlist entry (~$9.99) [V]/[T].
- Creator Pro ($19) is close to Splice Creator ($19.99) and Frame.io Pro ($15/member, 2 TB) [V]. **Frame.io gives far more storage per dollar.** AUDIO OS must win on audio search and intelligence, not GB.
- Studio ($15–18/seat) is below Frame.io Team ($25/member) [V].
- Versus Soundminer V7 Plus $399 one-time [V]: 2 years of Creator Pro ≈ $380–$456. Competitive only if cloud + AI + sharing are valued. **Consider an annual "Pro Perpetual Fallback" licence (keep the last version of a future desktop companion) to answer anti-subscription sentiment** [A].

## 4. Regional pricing (India)
- If India is a launch market, test **PPP pricing in INR** (e.g. Creator ₹299–₹499/mo [A]) and a local payment gateway (Razorpay/Cashfree support UPI and Indian cards; Stripe India has restrictions [K, verify]). Founder decision D-07.

## 5. Payments provider
| Option | Fee signal | Pros | Cons |
|---|---|---|---|
| Stripe Payments + Billing | ~2.9% + $0.30 per card + 0.7% Billing (US) [T] S57 | Flexible, best API | You are merchant of record: **you handle global sales tax/VAT/GST** (Stripe Tax +0.5% calculates but doesn't file) [T] |
| Paddle (Merchant of Record) | ~5% + $0.50 per transaction [T] S57 | Handles global tax compliance and invoicing | Higher fee; less flexible |
| Razorpay (India) | [K] verify | UPI, INR, local cards | India-focused |
**Recommendation [A]:** **Paddle (MoR) for global B2C self-serve at launch** to avoid VAT/GST registration across countries with a small team. Add Stripe or Razorpay later for enterprise invoicing or India. Founder decision D-05.

## 6. Experiments to run before fixing prices
1. Van Westendorp price-sensitivity survey within interviews (n ≥ 30 across P1 personas).
2. Landing-page plan-selection test (fake-door, waitlist intent by plan).
3. Beta with real usage data: storage per user distribution (the biggest unknown for margins).
