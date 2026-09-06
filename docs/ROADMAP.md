# Roadmap

Phase 0 documentation is complete. This is a short implementation sequence, not a multi-year plan; each phase validates the applicable [MVP Acceptance Thresholds](TECHNICAL-SPECIFICATION.md#mvp-acceptance-thresholds).

| Phase | Deliverable | Exit condition |
| --- | --- | --- |
| 1 — Foundation | Laravel/Livewire modular monolith, PostgreSQL, session/auth baseline, roles/policies, migrations, test harness, queue/scheduler, locale catalogs, logging/backups. | Secure deployable foundation with role tests and operational health checks. |
| 2 — Directory and publication | Doctor profile authoring, moderation/publication, specialties/locations/services, approved public SSR discovery/profile pages, SEO routes/sitemap. | Public approved profiles meet discovery/card/SEO gates. |
| 3 — Scheduling and booking | Availability rules/exceptions, timezone rendering, holds, PostgreSQL conflict protection, appointment lifecycle, confirmation notifications. | Booking/timezone/data-integrity/concurrency gates pass, including zero successful double bookings. |
| 4 — Patient and doctor workflows | Patient/doctor dashboards, appointment management, cancellation/reschedule, audit evidence, responsive/accessibility completion. | Ownership/authorization and core responsive/accessibility gates pass. |
| 5 — Consultation workflows | Appointment-scoped video adapter interface, private chat persistence/polling, in-person attendance/location flows. | All three consultation-mode and privacy gates pass. |
| 6 — Public-content translation and notifications | `en`/`es` UI catalogs, public translation provenance/review/staleness, reminders, notification retries. | Translation and notification thresholds pass. |
| 7 — Production hardening | Security review, performance measurement, restore testing, monitoring/alerts, full acceptance run, jurisdiction launch review. | No known Critical/High implemented-scope security issue; hard gates pass; legal/compliance launch review complete for selected jurisdiction. |

## First coding slice

Implement the smallest complete journey across Phases 1–5: public approved doctor discovery → profile → consultation type → valid availability → authenticated booking → confirmation → protected mode entry. It requires the entities, pages, permissions, services, data requirements, notifications, security/SEO boundaries, and exclusions defined in the [Product blueprint](PRODUCT-BLUEPRINT.md#first-vertical-slice). Do not substitute isolated CRUD work for this vertically testable flow.

## Post-MVP

KYC/identity/professional/organization verification, payments/refunds/payouts, SMS, recordings, attachments, clinical notes/EHR scope, calendar sync, waitlists, capacity scheduling, reviews, advanced search, websocket infrastructure, native clients, and vendor-specific integrations are Post-MVP. Add only after evidence, policy, and an ADR where material.
