# Architecture

## Evaluated direction (not implementation)

Laravel/PHP with Livewire is a preferred direction to evaluate for a server-rendered, web-first WishUBest application. It is not selected or implemented. Evaluation must test security, authorization, localization, server-rendered SEO, scheduling/time-zone behavior, background jobs, realtime/video integration boundaries, accessibility, observability, team fit, and operational model.

Do not impose WordPress, split frontend/backend, microservices, subdomains, directories, a URL scheme, SPA architecture, or another structural pattern without documented analysis.

## Intended system shape

A modular application should separate public discovery rendering, patient/doctor workflows, administration, application services, domain rules, persistence, and external adapters. Bounded contexts likely include identity/access; doctor directory and verification; scheduling/appointments; consultations/communications; translation/localization; commerce; notifications; moderation/operations; and audit/privacy. Their exact boundaries remain subject to analysis.

Server-side policies own authorization for protected doctor, patient, appointment, consultation, payment, and administrative data. Background jobs handle notifications, translation work, provider callbacks, availability processing, exports, and retry-safe integrations. Application-owned interfaces/adapters isolate video, realtime, translation, payment, storage, messaging, email/SMS, hosting, and cloud vendor protocols.

## Architecture questions requiring analysis

- How should appointment availability, holds, booking concurrency, cancellation/reschedule policy, waitlists, time zones, and calendar synchronization work?
- What is the clinical and legal boundary for video/chat consultation, consultation notes, attachments, recording, emergency guidance, consent, retention, and access?
- What realtime delivery, presence, ordering, latency, moderation, and persistence guarantees are necessary for chat and video workflows?
- Which translation surfaces may process protected data, what consent/provenance/review rules apply, and which translations may persist or cache?
- How should public doctor/search content be rendered and localized for crawlability without exposing private data or committing to a URL scheme?
- What payment/refund/tax/currency/payout obligations apply, and who is merchant of record?
- What international data residency, privacy, credential, medical advertising, age, and accessibility requirements apply?

## Data-store evaluation: PostgreSQL vs MySQL

| Criterion | PostgreSQL | MySQL | Evaluation need |
| --- | --- | --- | --- |
| Appointment correctness | Strong constraints and expressive transactional features. | Mature relational guarantees and broad operational familiarity. | Model booking holds, overlap prevention, and concurrency. |
| Directory/search/reporting | Rich query, indexing, JSON, and search-adjacent capabilities. | Strong conventional relational performance and ecosystem support. | Benchmark doctor discovery, availability, moderation, and reporting queries. |
| Laravel operations | First-class support. | First-class support and broad hosting availability. | Compare migrations, backups, monitoring, recovery, and team familiarity. |
| Scaling/cost | Depends on workload and managed offering. | Depends on workload and managed offering. | Price realistic international, recovery, and compliance needs. |

No database is selected. Select only after recorded comparison of correctness, operations, recovery, performance, compliance/region needs, and total cost.

## Explicitly open provider decisions

Video, realtime, translation, payments, hosting, cloud, storage, messaging, and email/SMS providers are open. Each evaluation must cover functional fit, patient-data/privacy and residency, reliability/SLA, security, accessibility/localization, observability, portability/exit strategy, cost, contracts/compliance, and operational burden.
