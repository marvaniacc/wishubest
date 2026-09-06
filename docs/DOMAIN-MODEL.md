# Domain model

## Modeling rules

Domain names below are canonical until changed in place. Persist authoritative business state in application-owned records; treat external-provider identifiers and events as integration data, not as the sole source of truth. All state transitions require authorization and auditable timestamps/actors where sensitive.

## Core entities

| Entity | Purpose and key relationships |
| --- | --- |
| Account | Authentication identity and security lifecycle; may have one or more roles and a member profile. |
| Profile | Member-controlled public/private profile attributes, preferences, locale, and accessibility settings. |
| Role assignment | Time-bounded grant of member, host, moderator, support, or administrator capability. |
| Experience | A host-owned video-centered offering with draft, review, published, retired, and archived lifecycle states. |
| Experience localization | A locale-specific rendering of eligible Experience fields, linked to source version and translation provenance. |
| Session/occurrence | A scheduled or on-demand instance of an Experience; carries access, capacity, and provider-session references. |
| Participation | A member's requested, confirmed, cancelled, attended, or revoked relationship to an occurrence. |
| Access entitlement | The evaluated authorization fact that grants a subject access to protected experience capability for a bounded period. |
| Payment/order | Commercial record of a purchase attempt and its pending, authorized, paid, refunded, failed, or disputed state. |
| Provider transaction | Idempotent external payment/video/realtime/translation callback or request record, linked to its internal aggregate. |
| Translation | A translation job/result with source content version, target locale, provenance, review status, and provider reference. |
| Content/report | User-authored content or a report against a subject, including category, evidence references, confidentiality, and status. |
| Moderation case/action | A governed investigation and its warning, restriction, removal, escalation, or closure actions. |
| Privacy request | Access, correction, deletion, or export request with verified subject, lawful/policy outcome, and fulfillment state. |
| Audit event | Append-oriented record of significant actor/system action, affected resource, time, outcome, and safe context. |
| Notification | A localized, preference-aware delivery intent and outcome; provider delivery remains an adapter concern. |

## Relationship and lifecycle rules

- An Experience has one accountable host and may have many localizations and occurrences.
- A Participation must refer to one account and one occurrence; confirmation requires current eligibility and, where applicable, a valid paid entitlement.
- Access decisions derive from server-evaluated entitlement, role, occurrence state, and policy; never from a URL or client claim alone.
- Source content changes invalidate or mark related translations stale until reviewed/replaced.
- A report creates or joins a moderation case according to policy; case actions must be attributable and should not expose reporter identity beyond authorized roles.
- External callbacks are stored and processed idempotently before changing internal lifecycle state.
- Privacy requests and destructive actions must preserve only the minimum lawful audit evidence and respect retention policy.

## Data classification

| Class | Examples | Handling |
| --- | --- | --- |
| Public | Published experience metadata and approved localized pages. | Indexable only when publish policy permits. |
| Member-private | Profile fields, preferences, participation history. | Authorize per subject/role; omit from public indexes/logs. |
| Restricted | Reports, moderation evidence, payment references, privacy requests. | Least privilege, audit access, defined retention. |
| Sensitive integration data | Tokens, webhook secrets, provider payload fragments. | Encrypt/protect, redact logs, minimize retention and access. |

## Open modeling decisions

Identity verification, organization/team ownership, recording/media retention, refunds/payouts, consent artifacts, age gates, data residency, and the exact relationship between experiences and video sessions are not yet decided.
