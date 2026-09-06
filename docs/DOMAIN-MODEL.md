# Domain model

## Modeling principles

This model is doctor-consultation specific, not a generic marketplace model. Application records own business truth; provider identifiers/events are integration evidence. Sensitive patient, appointment, and communication data require purpose-limited access, retention rules, and auditability. Exact clinical/legal responsibilities remain open pending jurisdiction and policy analysis.

## Bounded contexts and entities

| Context | Entities and ownership |
| --- | --- |
| Identity and access | **Account**, role assignment, session, consent/preference. An account may act as a patient, doctor, or authorized operator; privileged roles are explicitly assigned. |
| Patient | **Patient profile** contains only necessary identity/contact/preference attributes and is controlled by the patient subject to policy. |
| Doctor directory | **Doctor profile**, specialty, medical service, location/clinic association, spoken language, public content, credential, verification. A doctor owns submitted profile data; verification/publication is governed by administration. |
| Scheduling and booking | **Availability schedule**, availability slot/exception, appointment, booking hold, appointment participant. The appointment is the authoritative relationship between patient, doctor, selected service/type, scheduled time, and lifecycle state. |
| Consultation and communication | **Consultation**, consultation type (video, online chat, in-person), conversation, message, attachment reference, provider-session reference. A consultation is authorized by an eligible appointment; external sessions do not replace appointment state. |
| Translation and localization | **Localized content**, translation request/result, terminology/context reference. Each translated artifact links to source version, locale, provenance, review state, and stale state. |
| Commerce | **Order/payment**, refund, invoice/tax record where required, provider transaction. Internal state is idempotent and authoritative for access/booking decisions. |
| Operations | Notification, report, administrative case, moderation action, privacy request, audit event. Access is least privilege and actions/reasons are attributable. |

## Core relationships and lifecycle rules

- A doctor has one governed professional profile and may have many specialties, services, languages, locations, credential records, availability schedules, and public localizations.
- Credential and verification states are distinct from profile draft/published/retired states. A public claim is published only when policy permits.
- An appointment belongs to one patient and one doctor and references one consultation type, one selected service where applicable, a scheduled time interval/time zone, and a lifecycle such as draft hold, requested, confirmed, rescheduled, cancelled, completed, no-show, or exception. Exact transitions are policy decisions.
- Availability is doctor-controlled subject to policy; booking must prevent invalid or conflicting reservations under concurrent requests. Holds and external calendar synchronization need explicit design.
- A consultation is created only for an authorized appointment and has a separate preparation/active/ended/access-expired lifecycle. Recording, notes, attachments, and retention are open decisions.
- Conversations/messages are private to authorized participants and operators with a defined purpose. Translation does not broaden access to source content.
- A source update marks related translations stale; machine and human translations are distinguishable and reviewable.
- Payment status can affect booking confirmation only according to accepted commercial policy. Provider callbacks are verified and idempotent.
- Reports may concern accounts, doctor profile content, messages, appointments, or other governed resources; actions must preserve appropriate confidentiality and audit evidence.

## Data classification

| Class | Examples | Handling |
| --- | --- | --- |
| Public | Approved doctor profile, specialties, services, eligible locations, localized discovery content. | Index only when publication policy permits. |
| Private/personal | Patient profile, preferences, appointment history, availability administration. | Purpose-limited authorization; exclude from public indexes and unsafe logs. |
| Sensitive consultation | Chat, attachments, consultation metadata/content, health-related details if collected. | Minimize, protect, auditable access, defined consent/retention; legal requirements pending. |
| Restricted operations | Credential evidence, verification, reports, payment references, privacy requests. | Least privilege, redaction, audit access, retention policy. |
| Sensitive integration | Tokens, webhooks, provider payloads, secret configuration. | Protect/encrypt, minimize, redact logs, rotate and restrict access. |

## Open modeling decisions

Initial jurisdictions, patient data categories, doctor licensing/credential verification, clinics/organizations, cross-border care eligibility, scheduling recurrence/time-zone policy, calendar sync, consultation documentation/recording, reviews, refunds/payouts, retention, and emergency/escalation policy must be decided before implementation.

## Recommended MVP appointment state machine

| State | Entered by | Legal transitions | Notes |
| --- | --- | --- | --- |
| draft hold | Patient booking flow/system | requested, expired, cancelled | Short-lived internal reservation; one active hold per doctor/time interval. |
| requested | Patient | confirmed, cancelled, rejected | Use only if doctor acceptance is a product requirement; otherwise create confirmed directly. |
| confirmed | System, doctor, or patient according to policy | rescheduled, cancelled, in-progress, no-show | Confirmation requires valid availability and any accepted payment condition. |
| rescheduled | Patient/doctor/system | confirmed, cancelled | Preserve links to prior appointment and audit reason. |
| in-progress | System/authorized participant | completed, no-show, exception | Consultation mode determines session/access behavior. |
| completed | System/doctor | exception only | Terminal for ordinary booking; clinical records are out of scope until policy says otherwise. |
| no-show | Doctor/system, with dispute path | exception | Requires a policy-defined observation window and audit trail. |
| cancelled | Patient/doctor/system | exception | Refund eligibility is derived from accepted cancellation/refund policy. |
| rejected, expired, exception | System/doctor/operator | exception resolution | Terminal or operator-governed states. |

Appointment creation must atomically re-check the doctor/time interval and consume the hold so two concurrent requests cannot create a double booking. Store the appointment's intended time zone and normalized instant; recurring availability and exceptions are source rules, while confirmed appointments are immutable scheduling facts. Calendar synchronization is deferred.

## Future verification extension

A verification case may later link a doctor, credential evidence, reviewer, status, expiry, and audit events. It is deliberately absent from MVP authorization: publication approval is a moderation workflow, not proof of identity, credentials, licence, or clinic status.
