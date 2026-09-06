# Roadmap

Roadmap phases describe dependencies and decision gates, not delivery dates or commitments.

| Phase | Outcome | Dependencies |
| --- | --- | --- |
| 0 — Discovery and governance | Validated audience/problem, policy baseline, success measures, initial locales, and risk register. | Human decisions on market, jurisdiction, content policy, and scope. |
| 1 — Foundation decisions | Accepted baseline architecture/data-store/identity/localization decisions and provider evaluation criteria. | ADRs, threat/privacy review, operational requirements, cost assumptions. |
| 2 — Vertical-slice design | End-to-end design for discovery → join → protected participation, including translations and support paths. | Phase 1; concrete experience format, access rules, and acceptance criteria. |
| 3 — Foundation implementation | Secure web foundation, domain model, localization catalog, authorization/audit primitives, and test/deploy approach. | Phase 2; selected implementation stack and operating environment. |
| 4 — Experience workflow | Host publishing, localized discovery, participation, protected video integration, reporting, and operational workflow. | Video/realtime/translation provider decisions; governance and SEO validation. |
| 5 — Commercial and scale readiness | Payment flow if required, privacy-rights operations, observability, resilience exercises, accessibility/SEO hardening. | Payments, hosting/cloud choices; legal/tax/retention and SLO decisions. |
| 6 — Controlled launch and learning | Limited release, measured feedback, incident/support loop, and prioritised iteration. | Acceptance gates, production operations, support ownership, launch criteria. |

## Dependency rules

- Do not begin provider-dependent implementation before its evaluation is documented and any material choice is recorded in an ADR.
- Do not make public pages indexable before localization, canonical URL, privacy, and content-governance requirements are testable.
- Do not expose protected participation before server-side entitlement, audit, abuse reporting, and provider callback controls are designed.
- Payment work depends on a defined commercial model, jurisdiction/tax responsibilities, refund policy, and provider evaluation.
- Each phase exit updates PROJECT-STATE, development history, and affected durable documents.

## Near-term decision backlog

1. Define the first experience format and target user segment.
2. Select initial locales and translation quality/review policy.
3. Evaluate Laravel/PHP + Livewire against alternatives or accept/reject it.
4. Evaluate PostgreSQL and MySQL against the recorded criteria.
5. Define video, realtime, translation, payments, hosting, and cloud evaluation plans.
6. Define legal/privacy, security, accessibility, SEO, and operational acceptance gates.
