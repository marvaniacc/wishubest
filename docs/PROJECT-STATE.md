# Project state

## Last commit

- **Commit:** **HEAD** — documentation completion and implementation-readiness finalization (this commit).
- **Repository state:** Documentation-only repository, now **DOCUMENTATION COMPLETE — READY FOR IMPLEMENTATION**. No application code, dependencies, migrations, or test suite have been added by this documentation milestone.
- **Update rule:** Update this section in the same commit after every commit so it identifies that commit and accurately describes the repository state.

## Accepted implementation baseline

| Area | State |
| --- | --- |
| Application architecture | Accepted: Laravel/PHP + Livewire modular monolith with SSR. |
| Database | Accepted: PostgreSQL. |
| First slice | Public discovery → profile → availability → booking → confirmation → protected consultation entry. |
| Locales | Accepted MVP UI/public content scope: `en` and `es`. |
| Scheduling | Accepted local-time rules/exceptions, UTC appointment instants, holds, transaction/constraint concurrency protection, state machine. |
| Consultation | Accepted appointment-scoped video adapter, private persisted chat/polling, and in-person workflow. |
| SEO | Accepted locale-prefixed public SSR URLs, canonical/hreflang/sitemap strategy, private non-indexable boundary. |
| Payments | Excluded from first slice; Post-MVP. |
| KYC/verification | Excluded from MVP; publication moderation remains required. |
| Providers | Adapter-based and unselected; no provider selection blocks implementation. |
| Legal/compliance | Required before public jurisdiction launch, but does not block technical foundation. |

## Next action

Begin Roadmap Phase 1 implementation and create tests that will enforce the full [MVP Acceptance Thresholds](TECHNICAL-SPECIFICATION.md#mvp-acceptance-thresholds).
