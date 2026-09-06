# Technical specification

## MVP functional requirements

1. Support Account roles: patient, doctor, administrator, and moderator; enforce role/resource policy server-side.
2. Serve `en` and `es` server-rendered public discovery, doctor profile, specialty, and location pages for approved content only.
3. Let doctors create/edit profiles, services, locations, consultation types, recurring availability, and dated exceptions; let administrators/moderators approve or reject publication.
4. Let authenticated patients view valid availability, create an idempotent hold/booking, receive confirmation, and view only their own appointments.
5. Implement the canonical appointment state machine and all three consultation types: appointment-scoped video entry, authorized persisted online chat, and in-person location/attendance workflow.
6. Generate durable email confirmation/reminder and in-app notification intents asynchronously; retry safely and prevent duplicate critical intents.
7. Record auditable publication, appointment-transition, privileged, and sensitive-access events.

## Scheduling, consultation, and data integrity

Availability consists of weekly doctor-local-time intervals and dated exceptions. Expand only the requested range; display in the patient timezone; store UTC start/end instants and doctor timezone. Create/consume holds, re-check conflicts, and insert an appointment transactionally. PostgreSQL must enforce no active overlapping appointment/hold interval for a doctor; duplicate submissions use idempotency keys. The state machine and lifecycle ownership are canonical in the [domain model](DOMAIN-MODEL.md#scheduling-and-appointment-state-machine).

Video access is a short-lived, appointment-scoped adapter grant. Online chat is one authorized appointment conversation with persisted deterministic sequence, idempotent writes, polling/refresh baseline, and notification intents. In-person appointments expose location only to authorized participants. Attachments, recordings, clinical notes, and external calendar sync are excluded.

## Security, privacy, and operations

Use secure first-party sessions, CSRF, password recovery/verification, session rotation/invalidation, rate limiting, server-side policies, validation, mass-assignment protection, redacted logs, audit events, least-privilege administration, encrypted transport, protected backups, and tested restore procedures. Private resources are authorized by relationship/purpose and are not indexable. No protected patient, appointment, or communication content is sent to an external translation provider in MVP. No file upload is required; do not add one without malware, retention, authorization, and legal controls.

MVP infrastructure is Laravel application hosting, PostgreSQL, durable queue worker, scheduler, email adapter, logs/metrics/alerts, and tested backups. Use cache only when measured and never for booking correctness. No SMS, separate broker, websocket fleet, search cluster, or Kubernetes is required.

## Localization, translation, and SEO

Use versioned UI catalogs for `en` and `es`; no user-facing literals are distributed through application code. Localized public content stores source text/version, target locale, provenance (author or machine), review status, and stale state. Source updates mark translations stale. UI localization and approved public doctor/discovery translation are in scope; patient/doctor communication and chat translation are Post-MVP.

Render approved public pages at locale-prefixed URLs, canonicalize to the public localized URL, emit `hreflang` only for available published alternatives, and include approved pages in XML sitemaps. Use semantic accessible HTML and accurate structured data for public doctor/profile claims. Prevent indexing of dashboards, appointments, consultations, chat, payments, administration, and protected assets.

## Payment boundary

Payments are not part of the first implementation vertical slice. Display of pricing is optional public information and has no payment effect. Do not build payment intents, webhooks, refunds, payouts, currencies, or tax handling until a Post-MVP commercial decision and provider ADR are accepted.

## Non-functional baseline

Core flows must be responsive on desktop, tablet, and mobile; keyboard operable; semantically marked up; visibly focused; labeled with useful validation errors; and use usable contrast. Public production-like pages target LCP ≤ 2.5 seconds; this is a performance target rather than an absolute blocker when measurement infrastructure is unreliable, but heavy client architecture and obvious regressions are unacceptable. Deployment must support logs, metrics, alerts, backups, and queue/scheduler health checks.

## MVP Acceptance Thresholds

These are mandatory implementation acceptance criteria, not optional recommendations.

### A. Core journey and discovery

The end-to-end journey **Visitor → discover doctor → view doctor profile → choose consultation type → select valid availability → book → confirmation → protected consultation entry** works without manual database manipulation. A visitor discovers an approved/public doctor and views the profile without authentication. Discovery is direct and cards contain only photo, name, specialty, and location.

### B. Booking, concurrency, timezone, and integrity

A patient selects a genuinely available slot; successful booking creates exactly one valid appointment and confirmation; unavailable slots cannot book; state transitions follow the domain model; duplicate submissions do not duplicate appointments. Under concurrent tests for the same slot there are **0 successful double bookings**—the guarantee is transactional/database/application-enforced, never UI-only. Across defined multi-timezone test cases there are **0 known timezone inconsistencies**. Defined MVP scenarios have **0 known invalid/orphaned core records**.

### C. Consultation modes and chat

Video, online chat, and in-person appointments each have correct booking representation, appointment authorization, and entry/action. Chat messages remain private to authorized participants, have deterministic order, resist duplicate submission, enforce conversation/appointment authorization, and generate required notification intents.

### D. Authorization, privacy, and security

MVP security testing has **0 known authorization boundary violations**: Patient A cannot read Patient B’s appointment or conversation; unauthorized users cannot enter consultations; Doctor A cannot access unrelated patient data; non-admins cannot perform admin actions; predictable URLs do not expose protected resources. Before release there is **no known Critical or High severity vulnerability** in implemented scope, including authentication, session/CSRF, validation, mass assignment, IDOR/access control, secrets, data leakage, rate limiting, and admin boundaries.

### E. Translation and SEO

For `en` and `es`, UI localization works and public doctor/profile content uses the documented source/version/locale/provenance/review/stale model without overwriting the source. Protected information is never sent to external translation without an explicit later policy. Public doctor and intended discovery pages are SSR/crawlable with defined canonical, `hreflang`, sitemap, duplicate prevention, and applicable structured-data handling. Dashboards, appointments, consultations, chat, payment flows, admin pages, and sensitive resources are not intentionally indexable.

### F. Responsive, accessible, performant UI

Core flows work on desktop, tablet, and mobile without hover-only or desktop-only actions. Primary flows have semantic HTML, keyboard access, visible focus, labels/errors, usable contrast, and accessible controls; no critical accessibility blocker remains. The public-page LCP target is ≤ 2.5 seconds in a production-like environment. Screens remain minimal, low-saturation, whitespace- and typography-led, and free of excessive badges/icons/metadata/decorative elements or miniature-profile cards.

### G. Notifications and publication

Each required confirmation/reminder/message notification creates a durable intent, avoids duplicate critical triggering, defines retry/failure behavior, and does not require an open browser. A doctor creates/edits a profile, submits it for publication, an administrator/moderator approves/rejects it, and only approved profiles appear publicly. KYC is not required.

### H. Six mandatory hard gates

MVP is not accepted unless all pass: **(1)** doctor discovery works; **(2)** a patient books a genuinely available slot; **(3)** tested concurrency prevents double booking; **(4)** the correct consultation mode is available and protected; **(5)** private patient/appointment/consultation data cannot cross authorization boundaries; **(6)** public doctor/discovery pages are SEO/crawl ready while private areas remain protected.
