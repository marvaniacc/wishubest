# WishUBest documentation and implementation contract

WishUBest is a multilingual, international **doctor discovery, appointment booking, and medical consultation platform**. It supports video, online chat, and in-person consultations. It is not a generic marketplace, social network, creator platform, generic video platform, or an EHR/medical-record system.

This repository has completed Phase 0 documentation and is **ready for implementation**. Keep the documentation structure below stable and update affected canonical documents in place.

## Canonical documentation

| Document | Purpose |
| --- | --- |
| [Product blueprint](docs/PRODUCT-BLUEPRINT.md) | Product intent, MVP scope, workflows, and UI rules. |
| [Technical specification](docs/TECHNICAL-SPECIFICATION.md) | Implementable requirements and MVP acceptance thresholds. |
| [Architecture](docs/ARCHITECTURE.md) | Accepted application shape, boundaries, and readiness gate. |
| [Domain model](docs/DOMAIN-MODEL.md) | Canonical entities, ownership, data classes, and state rules. |
| [Roadmap](docs/ROADMAP.md) | Practical implementation sequence and Post-MVP boundaries. |
| [Project state](docs/PROJECT-STATE.md) | Snapshot of the last commit; update after every commit. |
| [Decision records](docs/decisions/) | Durable records of material decisions. |
| [Development history](docs/DEVELOPMENT-HISTORY.md) | Completed milestones and rationale. |
| [Agent handoff](docs/AGENT-HANDOFF.md) | Starting instructions for the next implementation agent. |

## Working rules

1. Use doctor/patient/consultation vocabulary consistently.
2. Implement the accepted MVP decisions; do not reopen them without evidence and an ADR where material.
3. Keep provider integrations behind application-owned adapters. Provider selection is Post-MVP unless a specific implementation task accepts one through an ADR.
4. Do not expand the MVP into KYC, credential verification, recordings, attachments, external calendar synchronization, reviews, payouts, or EHR/clinical-record scope.
5. Update all affected canonical documents, development history, and `docs/PROJECT-STATE.md` in the same commit when possible.
6. Create a sequential ADR for a material architecture, security, data, provider, or product decision; retain historical ADRs and supersede rather than rewrite an accepted decision without a new record.

See the [final implementation readiness gate](docs/ARCHITECTURE.md#final-implementation-readiness-gate) and the mandatory [MVP Acceptance Thresholds](docs/TECHNICAL-SPECIFICATION.md#mvp-acceptance-thresholds) before changing implementation scope.
