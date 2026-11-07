# 10 — Storage and Infrastructure Analysis (Phase 0.6)

Research date: 2026-11-07 · Labels: [V] official, [T] third-party, [K] prior knowledge (verify), [A] assumption
> **Price caveat:** Object-storage prices below come from 2026 third-party write-ups [T]. Official pricing pages (aws.amazon.com/s3/pricing, developers.cloudflare.com/r2/pricing, backblaze.com/cloud-storage/pricing) **must be checked before budgeting.**

## 1. Object storage comparison

| Criterion | AWS S3 Standard | Cloudflare R2 Standard | Backblaze B2 | MinIO (self-host) |
|---|---|---|---|---|
| Storage $/GB-month | ~$0.023 (first 50 TB, us-east-1) [T] S42 | ~$0.015 [T] S40 | ~$0.00695 (≈$6.95/TB; raised from $6/TB, reportedly May 2026) [T] S41 | Hardware + ops cost |
| Egress to internet | First 100 GB/mo free, then ~$0.09/GB (first 10 TB) [T] S42 | **$0 egress** [T] S40 | Free up to 3× average stored data, then ~$0.01/GB; free via Cloudflare (Bandwidth Alliance) [T] S41 | Your bandwidth |
| Requests | ~$0.005/1k PUT, ~$0.0004/1k GET [T] S42 | Class A ~$4.50/M, Class B lower (verify) [T] S40 | Transactions reportedly free (2026) [T] S41 | — |
| Regions | Many global regions [K] | Automatic placement + location hints / jurisdictions (EU) [K] | US, EU regions (limited) [K] | Anywhere |
| Scalability | Effectively unlimited | Effectively unlimited | High | You operate it |
| Signed URLs | ✅ presigned (SigV4) | ✅ S3-compatible presigned [K] | ✅ S3-compatible presigned [K] | ✅ |
| CDN | CloudFront | Native Cloudflare CDN / custom domains | Via Cloudflare/Fastly | Any |
| S3 API compatibility | Reference | High (some features missing, e.g. some lifecycle/ACL features) [K] | High [K] | High |
| **Project health** | — | — | — | ⚠️ **Community edition: admin console removed (2025), source-only distribution (Oct 2025), repository archived Feb 2026** [T] S43. **Not recommended**; consider forks or alternatives (Garage, SeaweedFS, Ceph RGW) only for on-prem enterprise |

### Workload character of AUDIO OS
- **Read-heavy, preview-dominated:** each audition streams a compressed preview (~0.25–2 MB for SFX [A]). Original downloads are rarer but large (24-bit/96 kHz WAV ≈ 33 MB per stereo minute [calc]).
- **Storage grows with libraries:** pro libraries reach multi-TB [A, to validate].
- **Egress is unpredictable** (share links, team auditions). **Zero-egress pricing removes a major margin risk.**

### Recommendation (ADR-003)
- **Primary: Cloudflare R2** for originals + previews + peaks. Zero egress suits the audition-heavy workload. S3 API keeps the exit path open.
- **Backup / DR copy: Backblaze B2** (cheapest $/TB) via scheduled replication of originals, in a different provider and region (see [13](13_security_and_compliance.md) §DR).
- **Abstraction:** All storage access goes through an S3-compatible `ObjectStore` interface. Never use provider-specific SDK features in domain code.
- **Bring-your-own bucket (P1):** customers connect their own S3/R2/B2 bucket. AUDIO OS stores only previews, peaks and embeddings. This addresses (a) storage cost for multi-TB libraries and (b) EULA/data-residency concerns (open question Q3). Precedent: Soundly "Cloud Storage Freedom" [T] S60.

### Monthly storage cost sensitivity (list prices, [T])
| Stored | S3 (storage + 1 TB egress) | R2 (storage, 0 egress) | B2 (storage; egress within 3× free) |
|---|---|---|---|
| 1 TB | ~$24 + ~$83 ≈ $107 | ~$15 | ~$7 |
| 10 TB | ~$230 + egress | ~$150 | ~$70 |
| 100 TB | ~$2,250 + egress | ~$1,500 | ~$695 |
Request charges excluded. S3 egress: (1,024 − 100 free) GB × $0.09 ≈ $83.

## 2. Infrastructure components

| Component | Recommendation | Rationale | Alternatives |
|---|---|---|---|
| Containers | **Docker** images for api, worker-cpu, worker-gpu, web | Reproducible builds; portable | — |
| Orchestration (MVP) | **Managed container platform** (e.g. Fly.io, Render, Railway, AWS ECS Fargate, Google Cloud Run) | No Kubernetes ops at MVP | Kubernetes at P3 if needed |
| GPU workers | **Serverless GPU with scale-to-zero** (e.g. Modal, RunPod serverless) or CPU-only at launch | Avoid idle GPU cost [T] S56 | Reserved GPU when utilisation > ~40% [A] |
| Database | **Managed PostgreSQL 16+ with pgvector** (e.g. AWS RDS/Aurora, Neon, Supabase, Crunchy Bridge) | PITR backups, HA | Self-managed only if forced |
| Cache / broker | **Redis-compatible**: prefer **Valkey** (BSD, Linux Foundation fork) or managed Redis | **Redis licensing changed in 2024 (RSAL/SSPL), then added AGPL as an option in 2025** [K, verify] → Valkey avoids ambiguity | RabbitMQ as Celery broker |
| Task queue | **Celery** (see [08](08_technical_stack_evaluation.md)) | Mature | Dramatiq, Temporal |
| CDN | **Cloudflare** in front of web app + R2 custom domain for previews | Pairs with R2; WAF; DDoS | CloudFront |
| CI/CD | **GitHub Actions**: lint, type-check, tests, licence scan, SBOM, container build, deploy on tag | Standard | GitLab CI |
| IaC | Terraform / OpenTofu for cloud resources | Repeatable environments | Pulumi |
| Logging | Structured JSON logs → managed log store (e.g. Grafana Cloud Loki, Better Stack, Datadog) | — | Self-hosted Loki |
| Metrics / tracing | **OpenTelemetry** SDK → Grafana Cloud / Honeycomb / Datadog | Vendor-neutral | — |
| Errors | Sentry (frontend + backend) | — | — |
| Secrets | Platform secret store / Doppler / AWS Secrets Manager | — | — |
| Malware scanning | ClamAV as an isolated service (GPL-2, server-side) [K] | Upload validation | Commercial AV API |
| Email | Transactional provider (Postmark / SES / Resend) | Share notifications | — |

## 3. Initial production deployment architecture
See [deployment_architecture.md](../architecture/deployment_architecture.md) for the diagram. Summary:
- 1 region at launch (choose by first-market data-residency needs: EU or India; founder decision D-06).
- Web (Next.js) ×2, API (FastAPI) ×2, worker-cpu ×2 (autoscale), worker-gpu (scale-to-zero), managed Postgres (primary + standby), Valkey, R2, B2 replica, Cloudflare in front.

### Indicative fixed infra cost at launch [A, list-price order of magnitude]
| Item | $/month |
|---|---|
| App + API containers (4 small instances) | 60–200 |
| CPU workers (autoscale, 2 baseline) | 50–200 |
| Managed Postgres (HA, ~4 vCPU / 16 GB) | 150–400 |
| Valkey/Redis managed | 15–60 |
| Observability + Sentry + logs | 50–200 |
| Email, DNS, misc. | 10–50 |
| Serverless GPU (usage-based) | 0–150 |
| **Total before storage** | **≈ $335–$1,260/month** |
Storage and bandwidth scale with customers (see [12](12_unit_economics.md)).

## 4. Open infrastructure questions
| ID | Question |
|---|---|
| IQ-1 | Verify official R2, B2 and S3 prices and R2 Class A/B pricing |
| IQ-2 | R2 jurisdiction options for EU and India data residency |
| IQ-3 | Redis/Valkey licence verification; pick the managed provider |
| IQ-4 | Does B2 "free egress up to 3×" also cover replication reads? |
| IQ-5 | GPU provider DPA terms (customer audio leaves our core cloud) |
