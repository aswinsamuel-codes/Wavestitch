# AUDIO OS — Phase 0 R&D Documentation

**Status:** Phase 0 (Market Research, Competitive Intelligence, Technical Feasibility). Complete, waiting for founder review.
**Research date:** 2026-11-07 (all "accessed" dates refer to this date unless stated)
**Rule:** No application code is written until the founder approves [EXECUTIVE_REPORT.md](EXECUTIVE_REPORT.md).

## Start here
1. [EXECUTIVE_REPORT.md](EXECUTIVE_REPORT.md): answers to the 12 founder questions, the recommendation, and the decisions you need to make.
2. [research/14_mvp_recommendation.md](research/14_mvp_recommendation.md): the MVP scope.
3. [project/risk_register.md](project/risk_register.md): the risks.

## Evidence labels used in every document
| Label | Meaning |
|---|---|
| **[V]** | Verified on an official vendor page or official documentation during this research session |
| **[T]** | Third-party source (review site, aggregator, press, forum), not confirmed on an official page |
| **[K]** | Researcher's prior knowledge, **not re-verified this session**. Verify before you rely on it |
| **[A]** | Assumption or hypothesis made by the research team. Not a fact |

Source IDs (`S01`…) point to [research/source_register.md](research/source_register.md).

## Important limitations of this research
- This is **desk research only**. No customer interviews, surveys or usability tests have taken place. Every willingness-to-pay figure and persona pain point is a **hypothesis** to validate in Phase 0.5 (customer discovery).
- Many competitor prices came from third-party aggregators because official pricing pages were blocked, not rendered, or not reached. Each one is labelled. **Prices change often, so re-check them before any external use.**
- No market-size (TAM/SAM/SOM) figures are given. No credible primary source was gathered for them, and the brief forbids unsupported claims.
- Nothing here is legal advice. The security and compliance material identifies obligations to take to qualified counsel.

## Directory
```
docs/
├── EXECUTIVE_REPORT.md
├── research/
│   ├── 01_industry_overview.md
│   ├── 02_competitor_analysis.md
│   ├── 03_competitor_feature_matrix.md
│   ├── 04_pricing_analysis.md
│   ├── 05_customer_personas.md
│   ├── 06_customer_workflows.md
│   ├── 07_market_gap_analysis.md
│   ├── 08_technical_stack_evaluation.md
│   ├── 09_ai_model_evaluation.md
│   ├── 10_storage_and_infrastructure_analysis.md
│   ├── 11_business_model_analysis.md
│   ├── 12_unit_economics.md
│   ├── 13_security_and_compliance.md
│   ├── 14_mvp_recommendation.md
│   └── source_register.md
├── architecture/
│   ├── system_architecture.md
│   ├── module_architecture.md
│   ├── database_design.md
│   ├── api_design.md
│   ├── audio_processing_pipeline.md
│   ├── ai_pipeline.md
│   ├── deployment_architecture.md
│   └── desktop_app_architecture.md   ← current plan (desktop alpha, ADR-013)
├── decisions/
│   ├── architecture_decision_records.md
│   └── technology_decision_records.md
└── project/
    ├── product_vision.md
    ├── project_charter.md
    ├── development_roadmap.md
    └── risk_register.md
```
