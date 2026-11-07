# 04 — Pricing Analysis (Phase 0.3)

Research date: 2026-11-07. All prices in USD unless stated, excluding tax. **These are researched market prices, not AUDIO OS prices.** AUDIO OS proposals are in [11_business_model_analysis.md](11_business_model_analysis.md).
Label meaning: [V] official page (fetched or official snippet) · [T] third-party · conflicting figures are listed explicitly.

## 1. Consolidated price table

| Product | Model | Entry paid | Mid / pro | Team / business | Free tier | Label / Source | Conflicts noted |
|---|---|---|---|---|---|---|---|
| Soundminer V7 | Perpetual | Basic $199 | Plus $399 | Pro $899 (+$100 dual-platform) | None | [V] S04 | — |
| Soundly | Subscription | Pro monthly (price not verified) | — | Multi-user: contact sales | Limited free library | [V] S01–S02 / [T] S60 | Official pricing URL 404; old $14.99/mo (2016) |
| BaseHead | Free + paid tiers | Free edition (unlimited local files) | ? | ? | Yes | [T] S33 | Paid prices not found |
| Sononym | Perpetual | €89 / $99 (launch) | — | — | Trial [K] | [T] S34 | Current price not verified |
| Splice | Subscription + credits | Sounds $12.99/mo (billed yearly, ~100 dl/mo) | Creator $19.99/mo (~200 dl/mo; $4.99 first month) | — | None | [V] S05 | Older Sounds+/Creator+ tiers ($12.99/$19.99/$39.99) |
| Epidemic Sound | Subscription by licence scope | Creator $9.99/mo annual ($17.99 monthly) | Pro (price conflicting) | Business / Business Plus (~$100/mo) / Enterprise | None | [T] S08 | Personal/Commercial naming in other sources |
| Artlist | Subscription by licence scope | Music & SFX Social $9.99/mo annual ($14.99 monthly) | Pro / Max ($33–$39.99 conflicting) | Teams / Enterprise custom | None | [T] S09 | Plan names differ by source |
| Frame.io | Per member + storage | Pro $15/member/mo (≤5 members, 2 TB + 2 TB/member) | Team $25/member/mo (≤15, 3 TB + 2 TB/member) | Enterprise custom | 2 members, 2 GB, 2 projects | [V] S11 | ~13% annual saving |
| Audiomovers | Subscription | Standard $9.99/mo | From $12.99/mo (site) | Business (older $275/yr) | Trial/voucher | [V]/[T] S12 | Several pricing generations |
| Source-Connect 4 | Subscription + $75 setup | Talent $35/mo | Studio ~$105/mo | Facility (quote) | — | [V] S13 | Old Standard/Pro naming |
| Evercast | Per room / month | Studio ~$549–$849/mo | Premium Suite ~$1,249/mo | Custom | None | [T] S14 | Large variance |
| Notetracks | Subscription / lifetime | Pro from ~$9/mo | $60/mo (review service) | — | Free plan | [T] S35 | Inconsistent |
| Descript | Per person + quotas | Hobbyist $16 (annual) / $24 | Creator $24 / $35 | Business $50 / $65; Enterprise | 60 media min/mo, watermark | [V] S15 | Allowances changed 2025 |
| Riverside | Subscription | Pro ~$24 annual / $29 monthly | Grow / Webinar | Business custom | Yes (limited) | [T] S16 | "Standard" may be retired |
| Auphonic | Credit hours | S 9 h/mo | M 21 h, L 45 h, XL 100 h, XXL 250 h | Business (custom contracts) | 2 h/month, jingle | [V] S17 | $ amounts not rendered; third party S≈$11, M≈$24 |
| Alitu | Subscription | $38/mo or $380/yr | Hosting add-on $10/mo | — | 7-day trial | [T] S18 | — |
| Hindenburg | Sub or perpetual | PRO ~$12/mo or ~$95 | Narrator ~$15/mo | — | 30-day trial | [T] S19, S63 | PRO $12/mo vs $95/yr conflict |
| LANDR Studio | Subscription | Essentials $99/yr | Standard $143.88/yr | Pro $191.88/yr | Free tier [K] | [V] S20 | Monthly figures conflict |
| iZotope RX 11 | Perpetual | Elements ~$99 | Standard $399 | Advanced ~$1,199–$1,349 | Trial [K] | [V]/[T] S21 | RX 12 may supersede |
| ElevenLabs | Subscription + credits | Starter ~$5–6 | Creator ~$22; Pro ~$99 | Scale / Business / Enterprise | Yes | [T] S22 | Credit counts differ |
| DISCO | Base plan + add-ons | Base (1 user, 1K files) | Discovery Suite from $10/mo (≤250 tracks) | Enterprise (API, SSO) | 30-day trial [T] | [V] S23 | "A-la-carte" complaint |
| Songtrust | Setup + commission | $100 setup | 15% performance / 20% mechanical | — | — | [V]/[T] S24 | Mechanical rate raised from 15% in 2025 [T] |
| Curve | SaaS tiers | Publishing Lite from £20/mo | Professional ~£2,500/yr | Enterprise quote | — | [V] S26 | — |
| Pro Tools | Subscription | Artist $99/yr ($9.99/mo) | Studio $299/yr | Ultimate ~$599/yr (or Flex $999/yr) | Pro Tools Intro [K] | [T] S27 | Ultimate vs Flex |
| Ableton Live 12 | Perpetual | Intro $99 | Standard $439 | Suite $749 | Trial | [T] S28 | Sale prices |
| FL Studio | Perpetual + lifetime updates | Fruity ~$99 | Producer ~$199 / Signature ~$299 | All Plugins ~$499 | Trial | [T] S29 | One outlier $899 |
| REAPER | Perpetual | $60 discounted | — | $225 commercial | 60-day full evaluation | [V] S30 | — |
| Adobe Audition | Subscription | ~$20.99/mo annual | ~$33.99 month-to-month | CC All Apps | Trial | [T] S31 | — |
| Logic Pro | One-time (Mac) / sub (iPad) | $199.99 (Mac) | iPad $4.99/mo | Creator Studio $12.99/mo | Trial [K] | [T] S32 | — |

## 2. Pricing patterns that matter for AUDIO OS

1. **The prosumer asset/library price band is $10–$20 per user per month** (Splice $12.99–$19.99, Epidemic/Artlist ~$9.99 entry, Frame.io Pro $15/member). Pricing above ~$25/user/month for individuals needs clear professional value. [V]/[T]
2. **Frame.io sets a high storage anchor:** 2 TB at $15/member/month [V] S11. AUDIO OS **cannot compete on raw storage per dollar** at small scale (see [12_unit_economics.md](12_unit_economics.md)). It should compete on audio intelligence and offer bring-your-own storage.
3. **Pro SFX tools are perpetual** (Soundminer $199–$899). Pro sound editors are used to paying once. A subscription has to deliver *ongoing* value (cloud sync, AI, sharing, updates) or it will face resistance. [V] S04, [A]
4. **Usage-metered AI is now normal** (Descript AI credits and media minutes, Auphonic credit hours, ElevenLabs credits). Customers accept quotas but complain about complexity and expiry. **AUDIO OS should keep AI quotas simple** (e.g. "hours of audio analysed per month") and include enough that most users never hit them. [V]/[T]
5. **Annual discounts cluster at 13–35%**, often marketed as "~2 months free" or "save 20%". [V] S11, S15, S17
6. **Team pricing is per seat with pooled storage** (Frame.io), or **contact-sales** for multi-user (Soundly, Soundminer facility, DISCO enterprise).
7. **Licence scope drives price in content businesses** (Epidemic/Artlist: personal vs commercial vs business). Relevant later for the marketplace.

## 3. Free-tier benchmarks
| Product | Free limit |
|---|---|
| Frame.io | 2 members, 2 GB, 2 projects [V] |
| Descript | 60 media minutes/month, watermarked export [V] |
| Auphonic | 2 hours processed/month, jingle added [V] |
| BaseHead | Free edition, unlimited local files [T] |
| REAPER | 60-day full evaluation, not enforced [V] |
| Splice, Epidemic, Evercast | No free tier [V]/[T] |

## 4. Open pricing questions
- Soundly's current Pro price and real cloud-storage allowance (official page 404 on 2026-11-07).
- Whether Frame.io's per-member storage is truly usable for audio-heavy teams, or limited by fair-use terms (not checked).
- Regional pricing (India INR/PPP) of competitors: not researched. Needed if India is a launch market.
