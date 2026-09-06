# Domain model

## Modeling principles

This is a doctor-consultation model, not a generic marketplace model. Application records are authoritative; provider IDs and callbacks are integration evidence. Store the minimum necessary data, enforce access by relationship and purpose, and record security-sensitive changes as audit events. WishUBest does not create clinical records in MVP.

## Core MVP entities and ownership

| Entity | Purpose and key relationships |
| --- | --- |
| Account | One authenticated identity; has explicit roles and may own one Patient and/or Doctor capability. |
| Patient | Private profile with minimum contact and preference data; owns appointments as patient participant. |
| Doctor | Account capability that owns one Doctor Profile, availability, and doctor-side appointments. |
| Doctor Profile | Doctor-submitted professional public content, specialty/location/service associations, locale content, and `draft → submitted → approved/rejected → retired` publication state. |
| Specialty, Location, Medical Service | Controlled directory concepts referenced by approved profiles; Location is a public practice/consultation location, not patient location. |
| Consultation Type | Fixed MVP values: `video`, `online_chat`, `in_person`. |
| Availability Rule / Availability Exception | Doctor-local-time recurring weekly intervals and dated overrides. They are source rules, not appointment facts. |
| Booking Hold | Short-lived, unique reservation for a doctor/time interval; consumed or expired. |
| Appointment | Authoritative patient-doctor-service/type/time relationship and lifecycle fact. Stores doctor scheduling timezone plus normalized UTC start/end instants. |
| Consultation | Appointment-authorized interaction with `prepared → active → ended → access_expired`; contains mode-specific access reference only. |
| Conversation / Message | One private online-chat conversation per eligible chat appointment; ordered persisted messages with sender, sequence, idempotency key, and timestamps. |
| Localized Content / Translation | Source text plus locale variants. A translation records source version, target locale, provenance, review status, and stale state. |
| Notification | Application-owned delivery intent, channel, idempotency key, status, retry data, and subject reference. |
| Audit Event | Append-only actor/action/resource/reason/time evidence, with redacted metadata. |
| Payment | Post-MVP. No order, payment intent, refund, or provider transaction is required in the MVP schema. |

## Relationships and publication

A doctor owns submitted profile information and availability; an administrator/moderator owns the publication decision. Only an `approved` profile and its approved public localizations are discoverable. Account registration, profile creation, publication approval, and future verification remain distinct. Future verification may link credential evidence, reviewer, expiry, and audit events but has no MVP authorization effect.

An appointment has exactly one patient, one doctor, one consultation type, one scheduled interval, and one selected service where applicable. A consultation and conversation exist only through an authorized appointment; external video/chat sessions never become the appointment authority.

## Scheduling and appointment state machine

Doctor availability uses recurring local-week rules plus one-off local-date exceptions. For a requested window, the booking service expands rules in the doctor’s IANA timezone, converts display times for the patient’s selected/display timezone, and creates a normalized UTC interval. Store the original doctor timezone and UTC instants on every appointment.

| State | Legal transitions | MVP meaning |
| --- | --- | --- |
| `draft_hold` | `confirmed`, `expired`, `cancelled` | Short-lived atomic reservation for a doctor/time interval. |
| `confirmed` | `rescheduled`, `cancelled`, `in_progress`, `no_show` | Valid booked appointment; confirmation notification is queued. |
| `rescheduled` | `confirmed`, `cancelled` | New valid interval is reserved; links to the prior appointment and audit reason. |
| `in_progress` | `completed`, `no_show`, `exception` | Authorized consultation window is active. |
| `completed` | `exception` | Ordinary terminal outcome; no clinical record is implied. |
| `no_show` | `exception` | Policy-defined attendance outcome with audit evidence. |
| `cancelled`, `expired`, `exception` | operator-governed exception resolution only | Terminal ordinary booking outcome. |

The MVP confirms immediately—there is no doctor-acceptance `requested` state and no payment condition. Cancellation is allowed by patient or doctor before start; rescheduling is controlled cancel/rebook with an audit link; no-show is set by the doctor or an authorized operator after the appointment window; completion is set by the doctor or system after the consultation. Exact cancellation cutoff is a configurable MVP policy defaulting to any time before start, and is not a refund policy.

A transaction must re-check eligibility and conflict, consume one unexpired hold, and create exactly one appointment. PostgreSQL must enforce an overlap-prevention constraint/index strategy for active holds/appointments of the same doctor; UI availability checks alone are insufficient. Duplicate booking submission uses an idempotency key.

## Consultation modes

- **Video:** an application-owned consultation adapter issues an appointment-scoped, short-lived access grant only to authorized participants during the permitted window. The provider remains replaceable; recording is unavailable.
- **Online chat:** the eligible appointment owns one private persisted conversation. Message sequence gives deterministic ordering; append uses an idempotency key. Polling/refresh is the MVP delivery baseline; a realtime adapter is Post-MVP only if measured need justifies it. Notification intents are emitted for new messages.
- **In-person:** the appointment provides authorized location visibility, reminders, attendance/no-show/completion actions, and no media session.

## Data classification

| Class | Examples | Required handling |
| --- | --- | --- |
| Public | Approved profile, specialty, service, approved location, approved localization. | Crawlable only after publication approval. |
| Private/personal | Patient profile, preferences, availability administration, appointments. | Relationship/purpose authorization; no public indexing or unsafe logging. |
| Sensitive consultation | Conversation/message, consultation metadata, any health-related input. | Minimize, protect, audit access, retention policy; no external translation in MVP. |
| Restricted operations | Publication decisions, reports, privacy requests, audit evidence. | Least privilege, redaction, audit trail. |
| Sensitive integration | Tokens, webhooks, provider payloads, secrets. | Encrypt/protect, redact logs, rotate/restrict. |

## Post-MVP modeling boundaries

Verification/KYC, clinics/organizations, recordings, attachments, clinical documentation, calendar sync, waitlists, capacity scheduling, reviews, payments/refunds/payouts, and advanced search are intentionally deferred. They require new policy and ADR work before entering the model.
