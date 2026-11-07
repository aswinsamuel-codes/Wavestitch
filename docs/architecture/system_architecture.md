# System Architecture (Phase 0.7)

Status: **Proposed**, pending founder approval · Date: 2026-11-07 · Related: [ADRs](../decisions/architecture_decision_records.md)

## 1. Architectural style: modular monolith + asynchronous workers

### Modular monolith vs microservices
| Criterion | Modular monolith | Microservices |
|---|---|---|
| Team size fit (≈4 engineers) | ✅ One deployable API; simple local dev | ❌ Ops overhead per service |
| Transactions across modules (assets ↔ billing quotas ↔ audit) | ✅ Local ACID transactions | ❌ Sagas / eventual consistency everywhere |
| Independent scaling | ◐ **Solved by splitting only the workload that needs it**: CPU and GPU workers are separate processes from the same codebase | ✅ |
| Fault isolation | ◐ Worker isolation covers the riskiest code (media decoding, ML) | ✅ |
| Future extraction | ✅ If module boundaries are enforced (import rules, own tables, internal interfaces) | n/a |

**Decision (ADR-001):** One Python codebase with **enforced module boundaries**, deployed as three process types: `api`, `worker-cpu`, `worker-gpu`. Plus the Next.js `web` app. Extract a module into a service only when there is a measured need (team or scaling).

## 2. Context diagram

```mermaid
flowchart LR
    User["Creators / teams<br/>(browser)"] --> CF["Cloudflare<br/>CDN · WAF · DNS"]
    Guest["External reviewers<br/>(share links, P1)"] --> CF
    CF --> WEB["web: Next.js<br/>(UI, SSR for public pages)"]
    CF --> API["api: FastAPI<br/>modular monolith"]
    WEB --> API
    User -- "multipart upload / preview stream<br/>(presigned URLs)" --> R2[("Cloudflare R2<br/>originals · previews · peaks")]
    API --> PG[("PostgreSQL 16<br/>+ pgvector")]
    API --> VK[("Valkey<br/>broker · cache · rate limits")]
    VK --> WC["worker-cpu<br/>FFmpeg · audiowaveform · metadata · loudness"]
    VK --> WG["worker-gpu (scale-to-zero)<br/>CLAP · PANNs · Whisper"]
    WC --> R2
    WG --> R2
    WC --> PG
    WG --> PG
    R2 -. replication .-> B2[("Backblaze B2<br/>DR copy of originals")]
    API --> IDP["Managed IdP<br/>(OIDC / SAML)"]
    API --> PAY["Billing provider<br/>(Paddle / Stripe)"]
    PAY -- webhooks --> API
    API --> MAIL["Transactional email"]
    API --> OBS["Observability<br/>OTel · logs · Sentry"]
```

## 3. Key runtime flows

### 3.1 Upload & ingest
```mermaid
sequenceDiagram
    participant B as Browser
    participant A as API
    participant S as R2
    participant Q as Queue
    participant W as worker-cpu
    participant G as worker-gpu
    B->>A: POST /v1/uploads (file manifest, sizes, sha256?)
    A->>A: AuthZ, quota check, dedupe by hash
    A-->>B: upload_id + presigned part URLs
    B->>S: PUT parts (parallel, resumable)
    B->>A: POST /v1/uploads/{id}/complete
    A->>S: CompleteMultipartUpload
    A->>A: Create asset (status=processing) + outbox job (same TX)
    A->>Q: dispatch ingest(asset_id)
    Q->>W: validate → probe → metadata → preview → peaks → loudness
    W->>S: write preview.m4a, peaks.dat
    W->>Q: dispatch analyze(asset_id)
    Q->>G: CLAP embedding, tag suggestions, (PANNs, Whisper P1)
    G->>A: persist embeddings + suggestions (status=ready)
    A-->>B: SSE: asset ready
```

### 3.2 Search
```mermaid
sequenceDiagram
    participant B as Browser
    participant A as API (search module)
    participant G as Text encoder (CPU in api or gpu svc)
    participant P as Postgres
    B->>A: GET /v1/search?q="distant thunder"&filters
    A->>G: embed text (cached by query string)
    A->>P: hybrid query: FTS rank ∪ vector kNN (org-scoped, filtered)
    P-->>A: candidates
    A->>A: Reciprocal Rank Fusion + business rules
    A-->>B: results + presigned preview URLs + peaks URLs
```

## 4. Cross-cutting concerns
| Concern | Approach |
|---|---|
| Tenancy | `org_id` + RLS; per-request DB session variable; storage key prefixes |
| Idempotency | `Idempotency-Key` header on billable POSTs; idempotent workers keyed by `(asset_id, pipeline_version, step)` |
| Pipeline versioning | Each processing step records `pipeline_version` and model version → enables back-fills when models change |
| Reliability | Transactional outbox → queue; retries with exponential backoff; dead-letter queue + admin re-run |
| Observability | OpenTelemetry traces API → queue → worker; per-step durations; per-tenant cost metering |
| Config | 12-factor env config; feature flags per plan |
| Security | See [13_security_and_compliance.md](../research/13_security_and_compliance.md) |

## 5. Quality attribute targets [A]
| Attribute | Target (MVP) |
|---|---|
| Search p95 latency (≤1M assets/tenant) | < 500 ms end-to-end API |
| Preview start after click | < 1 s (p95) on broadband |
| Ingest throughput | ≥ 5,000 short SFX files/hour per CPU worker [A, benchmark] |
| Availability | 99.5% monthly (MVP), 99.9% (Business SLA later) |
| RPO / RTO | 15 min / 4 h (DB) |
