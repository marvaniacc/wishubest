# Architecture

## Evaluated direction (not implementation)

Laravel/PHP with Livewire is the leading evaluated direction for a server-rendered, web-first application. It is **not selected or implemented**: no application code, framework scaffold, or provider integration is implied by this record. Its evaluation should test team fit, security posture, localization ergonomics, background jobs, realtime/video integration boundaries, testability, operational model, and accessibility-friendly rendering.

## Intended system shape

A modular web application should separate presentation, application workflows, domain rules, persistence, and external adapters. Public localized rendering, authenticated member/host workflows, and privileged operational workflows should share domain policies while maintaining distinct authorization and indexing boundaries. Background processing should handle non-interactive work such as notifications, translation jobs, media/provider callbacks, exports, and audit-safe retries.

External capabilities must be represented behind application-owned interfaces/adapters so domain logic does not become dependent on a vendor SDK or payload shape.

## Data-store evaluation: PostgreSQL vs MySQL

| Criterion | PostgreSQL | MySQL | Evaluation need |
| --- | --- | --- | --- |
| Relational integrity | Strong constraints and expressive relational features. | Mature relational constraints and broad operational familiarity. | Model expected transactional invariants. |
| Querying/reporting | Rich query, indexing, JSON, and search-adjacent capabilities. | Strong conventional relational performance and ecosystem support. | Benchmark representative discovery, moderation, and reporting queries. |
| Laravel operations | First-class support. | First-class support and common hosting availability. | Compare migration, backup, monitoring, and team experience. |
| Scaling/cost | Depends on managed service and workload. | Depends on managed service and workload. | Price realistic environments and recovery objectives. |

No database is selected. Choose only after recorded evaluation against correctness, operations, recovery, performance, compliance/region needs, and total cost—not familiarity alone.

## Explicitly open provider decisions

Provider choices for **video, realtime, translation, payments, hosting, and cloud** are open. Each requires a documented evaluation covering functional fit, security/privacy and data residency, reliability/SLA, accessibility/localization support, observability, portability/exit strategy, cost, contract/compliance, and operational burden.

## Material open questions

1. What experience formats, concurrency, recording, and moderation controls does video require?
2. Which realtime interactions are essential, and what latency/order/delivery guarantees are needed?
3. Which locales launch first, what translation quality threshold applies to each surface, and where is human review required?
4. Which jurisdictions, age/identity constraints, retention schedules, consent rules, and data-residency requirements apply?
5. What payment models, tax responsibilities, refunds, payouts, and marketplace obligations exist?
6. What availability, disaster-recovery, audit, analytics, and support-response targets are required?
7. What content governance rules define eligibility, reports, appeals, and enforcement?

Answers must update this architecture, the technical specification, domain model, roadmap, and an ADR when materially consequential.
