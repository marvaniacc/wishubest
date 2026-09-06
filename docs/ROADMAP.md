# Roadmap

Phases express dependency order and decision gates, not dates or delivery commitments.

| Phase | Outcome | Dependencies |
| --- | --- | --- |
| 0 — Product, market, and safety discovery | Defined initial patient/doctor segment, markets, medical/legal boundary, consultation scope, success measures, and risk register. | Human decisions on jurisdictions, care model, policies, and initial locales. |
| 1 — Foundation decisions | Accepted identity/access, doctor publication/moderation and future-verification extension, scheduling/booking lifecycle, data-store, translation, SEO, privacy/security, and provider evaluation criteria. | ADRs; legal/privacy/security review; operational and cost assumptions. |
| 2 — Patient booking vertical-slice design | End-to-end design for localized doctor discovery → availability → booking → notification → authorized consultation entry/support. | Phase 1; service/pricing, time-zone, cancellation, and acceptance criteria. |
| 3 — Foundation implementation | Secure web foundation, directory/appointment domain primitives, localization catalog, authorization/audit, test/deploy approach. | Phase 2; selected implementation stack and operating environment. |
| 4 — Doctor directory and appointments | Governed doctor profiles, search/discovery SEO surface, scheduling, booking, dashboards, notifications, and operations. | Verification policy, SEO analysis, storage/messaging choices if needed. |
| 5 — Consultation and translation | Authorized video/chat/in-person workflows, advanced translation, reporting, and privacy-safe provider integrations. | Video/realtime/translation choices; communication and retention policy. |
| 6 — Commerce and launch readiness | Payments/refunds if applicable, observability, accessibility, resilience, privacy-rights operations, controlled release. | Commercial/tax policy; payment, hosting/cloud, email/SMS, and support decisions. |

## Dependency rules

- Do not implement medical consultation or communications before the legal/safety/privacy, consent, retention, and authorization boundary is documented.
- Do not implement appointment booking before time-zone, availability, booking-concurrency, cancellation/reschedule, and payment-confirmation policies are accepted.
- Do not index public pages before doctor publication/verification, localization, canonical/hreflang analysis, privacy, and duplicate-content controls are testable.
- Do not select or integrate a provider before its documented evaluation and material ADR.
- Each phase exit updates PROJECT-STATE, development history, affected durable documents, and ADRs as appropriate.

## Near-term decision backlog

1. Define initial markets, patient/doctor segment, service categories, and the platform's medical/legal responsibility boundary.
2. Define doctor credentials, verification, profile publication, reviews, and moderation policies.
3. Define appointment/service lifecycle, availability, time-zone, cancellation, rescheduling, no-show, and consultation-entry rules.
4. Select initial locales and translation terminology, review, disclosure, privacy, latency, caching, and persistence policy.
5. Evaluate Laravel/PHP with Livewire, PostgreSQL vs MySQL, and provider criteria without selecting providers.
6. Define public doctor SEO requirements, privacy/security controls, accessibility target, operations, and launch gates.

## Phase 0 outcome and gate

Phase 0 establishes analysis, not implementation. Its accepted product constraints are the three distinct consultation modes, minimal/low-noise UI, lightweight doctor cards, and KYC out of MVP. The implementation readiness gate in Architecture is authoritative. Coding remains blocked until its OPEN, product-decision, and legal/compliance items are resolved to the level required by the first vertical slice.
