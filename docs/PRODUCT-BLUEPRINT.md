# Product blueprint

## Product definition

WishUBest is a multilingual, international doctor discovery, appointment booking, and medical consultation platform. It connects patients with doctors across language boundaries so patients can understand a doctor's professional profile, specialties, languages, locations, services, availability, consultation options, and applicable pricing before booking care.

The core consultation modes are video consultation, online chat consultation, and in-person consultation. Translation is a product differentiator across public information and permitted patient/doctor communication; it is not limited to interface strings.

## Users and outcomes

| User | Primary outcome |
| --- | --- |
| Visitor | Find trustworthy, localized public doctor information and understand available care options. |
| Patient | Discover an appropriate doctor, book and manage a consultation, communicate safely, and control personal information. |
| Doctor | Maintain a professional presence, define offerings and availability, manage appointments, and communicate with patients. |
| Administrator | Govern users, doctors, bookings, payments, content, moderation, configuration, and operational issues. |
| Support/moderation operator | Resolve reports and support cases using least-privilege, auditable access. |

## Core workflows

1. **Discover a doctor:** a visitor searches or browses public doctor profiles and specialty/location pages; filters by specialty, location, language, consultation type, availability, and applicable price; and understands credentials and service information in a supported locale.
2. **Book a consultation:** a patient authenticates or creates an account, selects a doctor, service, consultation type, available time, preferred language, and required details; reviews price/terms; completes payment where applicable; and receives a confirmed or pending booking.
3. **Prepare and attend:** a patient and doctor receive appropriate notifications, manage a booking within policy, and enter the authorized video, chat, or in-person consultation flow. Consultation communications are private and are never public search content.
4. **Doctor practice management:** a doctor completes profile and professional verification requirements, manages specialties/services/pricing/locations/languages, maintains availability, and acts on appointment changes.
5. **Administrative governance:** authorized staff review doctor verification, reported content/conduct, operational exceptions, bookings, payments, and configuration; actions and reasons are auditable.
6. **Privacy and account management:** patients and doctors manage preferences, language settings, data requests, and communication consent subject to applicable policy and law.

## Product requirements and boundaries

Required capabilities: multilingual UX; international users; public doctor profiles; doctor search and discovery; specialties, locations, languages, credentials where applicable, services, availability, consultation types and pricing; appointment booking lifecycle; patient and doctor dashboards; notifications; online communication; advanced translation; payments where applicable; privacy/security; administration; auditability; and reporting/abuse mechanisms.

Not yet decided: initial markets/locales, medical scope and regulatory posture, credential-verification rules, consultation record/recording policy, payment model, supported currencies, pricing/refund policy, review policy, provider stack, and native/mobile clients.

## Success measures

- A patient can locate and understand an eligible doctor and book an appropriate consultation in a supported language.
- A doctor can safely maintain accurate public information and availability without administrative data intervention.
- Appointment, payment, verification, moderation, and privacy-sensitive actions are authorized, attributable, and reviewable.
- Eligible public doctor and discovery content is indexable and localized; patient, booking, consultation, and dashboard data is protected from indexing.

## Assumptions to validate

- Patients and doctors need cross-language understanding at more than one point in the care journey.
- The platform may facilitate healthcare interactions without itself becoming the system of record for clinical care; the legal and operational boundary is open.
- Video, chat, and in-person appointment workflows have distinct safety, privacy, scheduling, and provider requirements.
- Payments apply only to markets/services where the model, tax, refund, and compliance obligations have been defined.
