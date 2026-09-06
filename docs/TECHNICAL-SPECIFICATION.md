# Technical specification

## Functional requirements

- Support accounts, patient and doctor roles/profiles, administrative roles, and server-side role/resource authorization.
- Provide public, localized, crawlable doctor profiles and specialty/location discovery where publishing and verification policy permits.
- Support doctor specialties, services, consultation types, locations, languages, credentials where applicable, availability, scheduling, and pricing representation.
- Support appointment discovery, booking, confirmation, reschedule, cancellation, completion, no-show, and disputed/exception states according to a defined policy.
- Support authorized video, chat, and in-person consultation workflows without treating an external provider as the authoritative appointment record.
- Provide patient and doctor dashboards, preference-aware notifications, reporting, administrative operations, and auditable changes.
- Support payments and refunds only through a provider-agnostic, compliant boundary when the commercial model is accepted.

## Security, privacy, and medical boundaries

| Boundary | Requirement |
| --- | --- |
| Identity and sessions | Secure credentials, session protection, recovery/verification controls, rate limiting, and audit-safe events. |
| Authorization | Evaluate every protected request server-side; separate patient, doctor, support, moderation, and administrator capabilities. |
| Patient/appointment data | Minimize collection, encrypt/protect sensitive data, restrict access by relationship and purpose, redact logs, and define retention. |
| Consultation communication | Treat chat and video-related content as private and potentially sensitive; define consent, recording, storage, access, export, and deletion rules before implementation. |
| Doctor information | Define source, verification, review, publication, correction, expiry, and jurisdiction rules for credentials and public claims. |
| Payments | Keep raw card data outside application systems; verify callbacks and preserve idempotent internal payment/refund state. |
| Operations | Restrict production access, retain necessary audit evidence, define incident response, backup/recovery, and privacy-rights procedures. |

## Translation and internationalization architecture

Translation must support UI, doctor-profile content, localized public medical content, notifications, patient/doctor communication, chat, and potentially consultation-related communication subject to policy. The product must distinguish source text, machine output, human review, translation provenance, source version, target locale, review state, and stale state.

- Store locale-neutral domain facts separately from localized presentation and translated content.
- Maintain a locale registry with language/region, writing direction, formats, fallbacks, support status, and jurisdictional availability.
- Use versioned UI translation catalogs; do not distribute user-facing literals through application code.
- Preserve medical terminology/context where translation is used; define terminology governance, quality thresholds, human review triggers, and user disclosure.
- Evaluate latency, caching, persistence, retention, consent, access control, and provider abstraction separately for public content, notifications, chat, and consultation-related communication.
- Do not select or transmit protected content to a translation provider before the privacy, legal, and consent boundary is documented.

## SEO requirements

- Public, eligible doctor profiles are a core SEO surface and must support server-rendered/crawlable content, accurate profile metadata, structured data where appropriate, and strong performance.
- Evaluate canonical URLs, multilingual SEO, hreflang alternatives, specialty/location discovery pages, sitemaps, pagination, indexing rules, and duplicate-content prevention. Do not prescribe a URL structure before architecture analysis.
- Publish only approved public data. Dashboards, patient information, appointments, consultation communications, payment flows, administrative views, personalized results, and protected assets must be non-indexable or access-controlled.
- Ensure semantic accessible HTML, meaningful internal linking, crawl-safe redirects/errors, image/media metadata, and explicit retirement handling.

## Quality attributes and acceptance baseline

Security, privacy, accessibility, localization quality, clinical-safety considerations, observability, resilience, performance, recoverability, cost transparency, and auditability are release criteria. Before implementation, accept the product/medical boundary, identity and authorization model, appointment lifecycle, scheduling/time-zone rules, data-store choice, translation operating model, provider evaluation criteria, and the first patient discovery-to-booking vertical slice.

## MVP interface and directory requirements

The public discovery UI must follow the lightweight doctor-card rule in the product blueprint. A default card exposes only photo, name, specialty, and location. Detailed profile information is progressively disclosed on a doctor profile or booking screen. Rendering architecture must support this low-density default without requiring hidden data to be shipped to every result card.

Doctor registration, doctor profile creation, publication approval/moderation, and future KYC/professional verification are independent processes. MVP requires the first three only; KYC and professional, identity, licensing, and organization/clinic verification are explicitly out of scope.

## Authentication and authorization recommendation

Use a single account identity with separate patient and doctor profile capabilities and explicit, server-enforced role assignments for administrator, support, and moderation work. Use secure first-party browser sessions, credential recovery/verification controls, session rotation/invalidation, rate limits, and authorization policies evaluated for every resource action. Do not use client route visibility as authorization. Whether initial doctor access requires invitation, self-registration, or manual approval is a product decision.

## Operational requirements by maturity

MVP requires a relational database, durable transactional work queue, scheduled jobs, basic cache only where measured, audit events, backups, monitoring/alerting, and asynchronous email notification capability. It does not require a separate cache cluster, message broker, websocket fleet, microservices, or external calendar synchronization.

Video requires a short-lived, appointment-scoped provider session/access grant. Chat requires ordered, authorized messages and notification delivery; realtime delivery is desirable only after polling/refresh is shown insufficient. In-person appointments require no media session. Attachments, recordings, and clinical documentation are deferred; do not permit uploads until retention, malware handling, authorization, and legal review are defined.

## Storage and notification boundaries

Use an object-storage abstraction when public photos or private files are required. Public doctor images may be cacheable public assets after publication approval. Patient uploads, consultation attachments, and private medical-related files require private storage, authorization-checked time-bounded delivery, malware scanning policy, retention, and audit access; they are deferred from MVP unless accepted explicitly.

Notifications are application-owned intents with channel adapters. MVP needs email confirmation and reminder events plus in-app status; SMS is open and should be justified by market/product need. All notification providers remain open.
