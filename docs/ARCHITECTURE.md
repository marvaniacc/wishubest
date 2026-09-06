# Architecture

## Accepted MVP architecture

WishUBest will be a **Laravel/PHP + Livewire modular monolith** with server-rendered public and authenticated web pages, PostgreSQL, first-party browser sessions, background queue workers, a scheduler, and application-owned adapters for external services. This is accepted in [ADR-0001](decisions/ADR-0001-technology-and-provider-direction.md); it avoids an MVP SPA/API split, microservices, Kubernetes, and separate realtime infrastructure while meeting SSR/SEO, localization, authorization, dashboard, scheduling, accessibility, maintainability, and operating-cost needs.

Modules separate identity/access, doctor directory/publication, scheduling/appointments, consultations/communications, localization/translation, notifications, administration/audit, and external adapters. Domain services and policies own business rules; UI components do not authorize access or contain provider-specific logic.

## Persistence and infrastructure

PostgreSQL is the accepted MVP relational database under [ADR-0002](decisions/ADR-0002-database-recommendation.md). It provides the transactional constraints and indexing needed for appointment concurrency and public directory filtering. Use Laravel migrations, relational constraints, transactions, and portable repository/query boundaries; do not add a dedicated search store or cache cluster for MVP.

Minimum deployment: one HTTPS application service, managed PostgreSQL with tested backup/restore, a durable queue worker, scheduler, application logs/metrics/alerts, and private/public object-storage abstraction only when images are introduced. A small measured application cache is permitted; it is not a correctness dependency. Email is required for confirmations and reminders through an adapter; SMS is Post-MVP. Hosting, storage, email, video, and translation vendors are intentionally unselected adapter implementations, not architecture blockers.

## Security and access baseline

Use secure first-party sessions, CSRF protection, session rotation/invalidation, credential recovery/verification controls, rate limiting on authentication and sensitive actions, server-side authorization policies, input validation, mass-assignment protection, secrets management, redacted logs, and least-privilege administrative roles. Every protected resource is checked by relationship and purpose; route visibility is never authorization. Public profile publication state governs public visibility.

Private files/attachments are not part of MVP. If public doctor photos are introduced, only approved assets may be public/cacheable. Production operations require encrypted transport, least-privilege database access, encrypted/protected backups, restore tests, restricted administration, audit evidence, and monitoring/alerting.

## Scheduling and booking implementation

Availability expansion, hold creation, conflict re-check, hold consumption, and appointment insert occur under a database transaction. Doctor-local recurring rules and exceptions are expanded only for the queried range. Store UTC instants and doctor timezone; render the patient-facing time in the patient display timezone. PostgreSQL’s active-interval conflict guarantee plus an idempotency key makes “one winner” enforceable under concurrency. See the canonical state machine in the [domain model](DOMAIN-MODEL.md#scheduling-and-appointment-state-machine).

## Consultation and integration boundaries

Video, online chat, and in-person appointments share the Appointment authority. Video uses an appointment-scoped short-lived access-grant adapter. Chat persists private ordered messages and starts with polling/refresh plus notification intents; no websocket fleet is required. In-person uses an authorized appointment location and attendance workflow. All provider callbacks are verified, idempotent integration evidence.

Translation is application-owned data with a provider adapter. UI catalog localization and approved public doctor/discovery translation are MVP; protected patient/doctor communication and chat translation are excluded. Never send protected information to an external translation provider in MVP. Providers may be selected only by a later ADR when an implementation task requires one.

Payments are not required for the first vertical slice. No payment provider, merchant-of-record, tax, refund, currency, or payout decision blocks the MVP foundation; all are Post-MVP.

## SEO and internationalization

Public approved doctor, specialty, and location pages are server rendered. The canonical public URL form is locale-prefixed: `/{locale}/doctors/{slug}`, `/{locale}/specialties/{slug}`, and `/{locale}/locations/{slug}`. The default locale `en` is canonical without a duplicate unprefixed route; `es` is supported. Render canonical URLs, reciprocal `hreflang` alternatives only where a published translation exists, XML sitemaps for approved public pages, pagination/canonical controls, and accurate structured data only for supported public claims. Do not index or expose patient/doctor dashboards, appointments, consultations, conversations, payment flows, administration, or protected assets.

## FINAL IMPLEMENTATION READINESS GATE

**DOCUMENTATION COMPLETE — READY FOR IMPLEMENTATION.** The following classifications replace the prior open-ended gate. Full release acceptance is defined in [MVP Acceptance Thresholds](TECHNICAL-SPECIFICATION.md#mvp-acceptance-thresholds).

| Item | Classification | Final boundary |
| --- | --- | --- |
| Laravel/PHP + Livewire modular monolith; SSR; PostgreSQL; sessions/policies; queues/scheduler; email adapter | ACCEPTED | Implement the foundation without an SPA/API split, microservices, or Kubernetes. |
| `en`/`es` localization; public SSR SEO URL/canonical/hreflang/sitemap strategy; no-payment first slice | ACCEPTED | Implement public localized content and protected private areas. |
| Appointment availability/holds/timezones/concurrency/state machine; all three consultation representations | ACCEPTED | Implement exactly as documented and test concurrent conflicts. |
| KYC, verification, recordings, attachments, calendar sync, waitlists, capacity, reviews, payments, payouts, SMS, native apps, advanced search/realtime | POST-MVP | Do not add to MVP without a new decision. |
| Jurisdiction-specific medical practice, advertising, privacy, retention, consent, and production launch review | REQUIRES LEGAL/COMPLIANCE REVIEW BUT DOES NOT BLOCK TECHNICAL FOUNDATION | Keep MVP as non-EHR, minimize data, do not translate protected content, and obtain review before public production launch in a jurisdiction. |
| Discovery hard gate | ACCEPTED | Public approved doctors are discoverable with the four-field card rule. |
| Booking hard gate | ACCEPTED | Patient can book genuinely available slot with confirmation and idempotency. |
| Concurrency hard gate | ACCEPTED | Automated test must demonstrate zero successful double bookings for a contested slot. |
| Consultation hard gate | ACCEPTED | Video, chat, and in-person entry/actions are appointment-scoped and authorized. |
| Authorization/privacy hard gate | ACCEPTED | Automated security tests must demonstrate zero known boundary violations. |
| SEO/public-private hard gate | ACCEPTED | Public pages are crawlable SSR; private resources are access-controlled/non-indexable. |
| Documentation/technical blocker | BLOCKER: NONE | Implementation may begin. |
