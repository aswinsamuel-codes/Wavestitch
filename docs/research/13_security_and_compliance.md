# 13 — Security, Privacy and Copyright

Research date: 2026-11-07
> ⚖️ **Not legal advice.** This document identifies likely obligations and proposed controls. **No compliance claim (GDPR, DPDP, SOC 2, etc.) may be made publicly until qualified counsel and, where relevant, an auditor confirm it.** Items marked [K] are prior knowledge and must be checked against primary legal texts.

## 1. Security architecture controls

| Area | Proposed control | MVP? |
|---|---|---|
| **Multi-tenant isolation** | `org_id` on every tenant row; repository layer enforces scoping; **PostgreSQL RLS** policies keyed on a per-request `app.current_org` setting; object keys prefixed `org/{org_id}/`; automated cross-tenant access tests in CI | ✅ |
| **RBAC** | Roles per org: Owner, Admin, Editor, Contributor, Viewer, Guest (share-link). Per-library permissions (e.g. restrict a licensed vendor library to licensed seats) | ✅ (basic) |
| **Authentication** | Managed OIDC provider; MFA available; passkeys where supported; short-lived access JWTs + refresh rotation; SSO/SAML on Business+ | ✅ |
| **Signed download URLs** | Presigned GET with **short TTL (e.g. 5–15 min)**, issued only after an authz check; `Content-Disposition` set; separate preview vs original permissions; optional watermarking of previews (P2) | ✅ |
| **Share links** | Random 128-bit tokens; optional passphrase, expiry, download disable, revocation; rate-limited | ✅ |
| **Encryption in transit** | TLS 1.2+ everywhere; HSTS; internal service TLS where the platform supports it | ✅ |
| **Encryption at rest** | Provider-managed encryption on R2/B2/Postgres [K: verify each provider's default]; secrets in a managed secret store; consider per-tenant envelope encryption for Enterprise | ✅ / P3 |
| **Upload validation** | Allow-list of extensions **and** magic-byte sniffing; max size per plan; **decode test via ffprobe in a sandboxed worker** (no network, resource limits, timeouts) to defend against malformed-media exploits; reject archives in MVP | ✅ |
| **Malware scanning** | ClamAV in an isolated service on non-audio and suspicious files; quarantine bucket | ✅ |
| **Audit logs** | Append-only `audit_event` table (actor, org, action, target, IP, UA, timestamp); covers auth events, permission changes, share-link creation, downloads of originals, deletions, exports; retention per plan; export on Business+ | ✅ |
| **App security** | OWASP ASVS L2 as target [K]; CSRF protection for cookie flows; strict CSP; dependency scanning; SAST; secret scanning; rate limiting | ✅ |
| **Infra** | Least-privilege IAM; separate prod and staging accounts; no direct prod DB access without break-glass + audit | ✅ |

## 2. Privacy and data-protection obligations (to confirm with counsel)

### 2.1 EU/UK GDPR [K]
- Lawful basis per processing purpose (contract for service delivery; consent for marketing; legitimate interest for security logs).
- Data-subject rights: access (Art. 15), rectification, erasure (Art. 17), portability (Art. 20), objection.
- **Processors** (cloud, auth, email, payments, GPU inference) need DPAs; international transfers need SCCs / adequacy.
- Records of processing; DPIA if large-scale processing of voice data is planned (voice can be personal data; biometric processing is special-category data only if used for identification [K]).
- Breach notification to the supervisory authority within 72 hours where required.

### 2.2 India — Digital Personal Data Protection Act 2023 + DPDP Rules 2025
- Rules notified **13 November 2025** with a phased rollout: some rules immediately, **Consent Manager provisions after 12 months (~13 Nov 2026)**, and **core Data Fiduciary obligations (notice, consent, security safeguards, breach intimation, data-principal rights, retention) after 18 months (~13 May 2027)** [T] S58. Verify against the official Gazette.
- Plan for: itemised notice in clear language (and in Indian languages where required [K]); consent records; grievance redressal; breach intimation to the Data Protection Board and affected users; reasonable security safeguards; erasure when purpose ends; special rules for children's data (verifiable parental consent) [K].
- **Design implication:** Build consent records, retention policies and data-principal request workflows into the MVP data model. Retrofitting is costly.

### 2.3 Other regimes (later)
US state privacy laws (CCPA/CPRA etc.) and sector requirements for enterprise customers (SOC 2 Type II, ISO 27001) at Business/Enterprise stage.

## 3. Copyright and content obligations

| Topic | Proposed approach |
|---|---|
| **Ownership declaration** | On upload, users confirm they own the content or are licensed to store and use it in AUDIO OS (ToS + per-library "source/licence" field). For team libraries, admins declare the licence scope (e.g. "Vendor X, 5 seats") |
| **Licence metadata** | `licence` entity: licensor, licence type (owned / commercial EULA / CC0 / CC BY / CC BY-NC / royalty-free subscription / custom), seats, territory, term, attribution text, restrictions, evidence document. Attached to library or asset; inherited by derived assets |
| **Commercial SFX EULAs** | ⚠️ **Open risk:** many vendor EULAs are per-user licences and may restrict shared network/cloud storage [A]. Mitigations: per-library access limited to licensed seats; "previews-only" or BYO-bucket mode; vendor partnerships. **Requires EULA review of the top 10 vendors (Phase 0.5)** |
| **Creative Commons content** | Preserve licence + attribution fields; warn when NC-licensed assets are added to commercial projects |
| **Freesound** | API is **non-commercial only** without a licence agreement with MTG-UPF [V] S10. No commercial Freesound integration without a deal |
| **Notice-and-takedown** | Implement a takedown process. US: DMCA §512 safe harbour needs a **registered designated agent** and a repeat-infringer policy [K]. India: intermediary due diligence under IT Act s.79 and IT Rules 2021 (grievance officer, timelines) [K]. EU: DSA notice-and-action for hosting services [K] |
| **AI and training data** | Default: **no training on customer content**; opt-in only. Disclose third-party model use. Monitor EU AI Act transparency duties for any generative features (P3) [K] |
| **Marketplace (P3)** | Seller warranties, licence templates, royalty accounting, tax: separate legal workstream |

## 4. User deletion and data export
- **Self-serve export:** ZIP/manifest of originals (or bucket-to-bucket copy), metadata as JSON/CSV, licence records, comments, audit history (Business+).
- **Account/org deletion:** soft-delete with a 30-day grace period [A] → hard delete of DB rows, embeddings and objects (including previews/peaks), then purge from backups as they age out (document the backup retention window in the privacy policy).
- **Data-principal / data-subject requests:** tracked workflow with SLA timers; identity verification.

## 5. Backup and disaster recovery

| Asset | Mechanism | Target |
|---|---|---|
| Postgres | Managed PITR + daily snapshots, cross-region copy | **RPO ≤ 15 min, RTO ≤ 4 h** [A] |
| Originals | R2 primary + **B2 replica in a different provider** (nightly/continuous) | RPO ≤ 24 h [A] |
| Previews/peaks/embeddings | Regenerable from originals; no separate backup | Rebuild via pipeline |
| Config/IaC | Git + Terraform state backups | — |
| Restore drills | Quarterly restore test (documented) | — |
| Deletion consistency | Deletion events replicated to the backup store (tombstones) | — |

## 6. Compliance roadmap (proposed)
| Stage | Items |
|---|---|
| Before beta | ToS, Privacy Policy, Acceptable Use, Cookie notice, DPA template, sub-processor list, takedown policy, DMCA agent registration (if serving US users) |
| Before GA | External pen test, incident-response plan, DPDP readiness for the 13 May 2027 obligations, GDPR records of processing |
| Business tier | SSO, audit export, data-residency option, security questionnaire pack |
| Enterprise | SOC 2 Type II (≈ 6–12 months of evidence) [K] |
