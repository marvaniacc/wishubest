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

## Phase 0 decision analysis

### Application architecture

| Option | Advantages | Disadvantages and implications | Recommendation |
| --- | --- | --- | --- |
| Laravel/PHP with Livewire | Server-rendered public pages support SEO; one application model lowers delivery and hosting complexity; mature auth, policies, queues, localization, testing, and accessibility-friendly HTML patterns. | Interactive surfaces need careful state/access design; realtime/video remain adapters; team must maintain PHP/Laravel competence. | **Preferred, open.** Best current fit for a web-first, SEO-led, low-operational-complexity MVP. |
| Laravel with a separate SPA/API | Rich client interactivity and independently deployable clients. | Duplicates auth/validation/rendering concerns, expands attack surface and localization/SEO coordination, and raises operational complexity. | Rejected for MVP unless a concrete client requirement emerges. |
| WordPress or plugin-led solution | Fast editorial setup. | Weak fit for appointment correctness, role policies, private consultations, integration boundaries, and long-term domain ownership. | Rejected for the application core. |
| Microservices | Independent scaling boundaries. | Distributed transactions, observability, deployment, and cost overhead before demand is known. | Deferred; modular monolith first. |

A modular monolith with server-side rendering is the recommended target shape if Laravel/Livewire is accepted. This is a recommendation, not an accepted framework decision. It supports SSR/SEO, maintainability, accessibility, localization, and low cost; a later exit is possible by keeping domain rules and provider adapters independent of UI and vendor SDKs.

### Database recommendation

**Recommendation: PostgreSQL, pending acceptance.** Both databases are supported by Laravel and can meet MVP needs. PostgreSQL is preferred because scheduling correctness benefits from strong transactional modeling and expressive constraints/indexing, while directory filtering/reporting can use its mature indexing and JSON capabilities without changing stores. MySQL remains a credible operationally simple alternative, particularly where team expertise and managed-service recovery are demonstrably better.

| Criterion | PostgreSQL | MySQL | Decision implication |
| --- | --- | --- | --- |
| Relational transactions/concurrency | Strong fit for appointment holds and overlap checks. | Capable with disciplined transactions/locking. | Benchmark the actual booking contention path. |
| Indexing, JSON, full text | Rich indexes, JSON, and built-in full-text options. | Mature indexes/JSON/full-text. | Neither removes need to evaluate dedicated search later. |
| Laravel/operations | First-class support; broad managed options. | First-class support; common managed options. | Compare backups, observability, availability, cost, and team proficiency. |
| Scale/exit | Scales well for expected relational workload. | Scales well for expected relational workload. | Keep repository/query boundaries portable; do not rely on unneeded database-specific features early. |

This recommendation is **OPEN** until owners validate managed-service, recovery, cost, and team-operability criteria. It does not authorize schema work.

### Scheduling and appointment reliability

For MVP, doctors define recurring availability in their local time zone plus one-off exceptions. The booking service expands availability only for the requested search window, resolves display time to the patient locale, stores the doctor's scheduling time zone and normalized appointment instant, and atomically creates a short booking hold then an appointment. A database transaction and a uniqueness/overlap strategy appropriate to the selected database prevent double booking. Holds expire by scheduled work and are revalidated at confirmation.

Do not add calendar synchronization, waitlists, multi-practitioner capacity, or recurrence engines beyond the selected window until demand exists. Reschedule is a controlled cancellation/rebook operation that retains an audit link. Cancellation, no-show, completion, and refund transitions follow the state machine in the domain model; refund amounts and eligibility remain product/commercial decisions.

### Consultation modes

| Mode | MVP architecture | Security/privacy and future exit |
| --- | --- | --- |
| Video | Appointment-scoped adapter creates/retrieves a short-lived access grant only for authorized participants in the appointment window. | Provider, recording, session metadata retention, and emergency policy remain open; never expose provider credentials in public pages. |
| Online chat | Private conversation bound to an authorized appointment, ordered messages, access checks, audit-safe moderation path, and notification intent. | Realtime transport is open; begin with the simplest reliable delivery path. Translation must not alter source access. Attachments are deferred. |
| In-person | Appointment, reminders, location and attendance workflow; no media provider/session. | Location visibility follows appointment authorization; no consultation content is assumed. |

### Translation, SEO, payments, and operations

Translation is an application-owned workflow with provider adapters. UI catalog translation is separate from translated doctor/public content and protected communications. Every non-UI artifact needs source version, locale, provenance, review state, staleness, terminology/context, consent/access classification, and cache/persistence policy. Machine translation may assist eligible public content; protected chat or consultation content requires a product and legal/privacy decision before external processing. Human review triggers and medical terminology governance remain open.

Public doctor, specialty, and location pages must be server-rendered and publication-safe. Decide canonical and multilingual URL forms only after keyword, locale, and market analysis; then use canonical tags, hreflang, structured data where accurate, sitemaps, pagination controls, and duplicate-content rules. Private dashboards, appointments, consultations, communications, payment flows, and assets are non-indexable/access-controlled.

Payments need internal order/payment/refund records, verified idempotent webhooks, currency/tax/refund policy, and a provider adapter. Merchant-of-record, payouts, and provider choice require product/legal decisions. Object storage, email/SMS, cache, queues, hosting, cloud, video, realtime, and translation providers remain open. MVP needs durable jobs for holds, reminders, callbacks, and translation/publication work; a managed relational database, worker process, scheduler, private/public storage boundary, backups, logs/metrics, and alerts are sufficient. Compare managed single-platform hosting with a managed application/database/storage composition on security, backups, queue/scheduler support, regional needs, cost, and operational simplicity before selection.

## IMPLEMENTATION READINESS GATE

| Decision | Classification | Required resolution before coding |
| --- | --- | --- |
| Product identity, three consultation modes, lightweight UI/card rule, MVP exclusion of KYC | ACCEPTED | Maintain in all implementation plans. |
| Laravel/PHP with Livewire | OPEN | Confirm team fit and operational/deployment evaluation; then record an ADR. |
| PostgreSQL recommendation | OPEN | Validate managed operations/cost/recovery and accept or select MySQL; then record an ADR. |
| Initial market, locale, service scope, doctor onboarding/publication policy, whether payment is required | REQUIRES PRODUCT DECISION | Define first vertical-slice operating assumptions. |
| Appointment lifecycle, scheduling timezone/hold policy, cancellation/refund policy | REQUIRES PRODUCT DECISION | Accept the MVP state machine and transition ownership. |
| Patient-data categories, cross-border care boundary, consent, retention, emergency guidance, medical advertising, credential claims | REQUIRES LEGAL/COMPLIANCE REVIEW | Obtain jurisdiction-specific review; do not infer compliance. |
| Video, realtime, translation, payments, storage, email/SMS, hosting/cloud providers | OPEN | Evaluate only after requirements above; create ADRs for material selections. |
| Recording, attachments, calendar sync, reviews, clinic/organization verification, KYC, payouts, advanced search infrastructure | DEFERRED TO POST-MVP | Revisit after MVP evidence and applicable review. |
