# Product blueprint

## Product definition

WishUBest is a multilingual, international platform for patients to discover doctors, book appointments, and enter authorized video, online chat, or in-person consultations. Translation is a significant differentiator for the UI and approved public doctor/discovery content. WishUBest is not a generic marketplace, social network, generic video service, or EHR.

## Users and outcomes

| User | Outcome |
| --- | --- |
| Visitor | Finds an approved, localized public doctor profile and understands available consultation options. |
| Patient | Books and manages a consultation, receives notifications, and accesses only their authorized consultation. |
| Doctor | Creates a professional profile, manages services/availability, and manages authorized appointments. |
| Administrator/moderator | Approves or rejects doctor-profile publication and resolves operational exceptions with auditable, least-privilege access. |

## Final UX direction

The interface is minimal, modern, clean, professional, trustworthy, low-saturation, whitespace-oriented, typography-led, and easy to scan. Avoid decorative icons, aggressive color, excess metadata, and visually overloaded screens.

### Doctor discovery-card rule

A default discovery card contains **only** doctor photo, doctor name, specialty, and location. It is not a miniature profile. Biography, credentials, languages, reviews, pricing, availability, badges, statistics, and other detail are progressively disclosed on the public doctor profile or booking workflow.

## MVP workflow and scope

The first real journey is:

**Visitor → discover doctor → view doctor profile → choose consultation type → select valid availability → book → confirmation → protected consultation entry.**

MVP includes public approved doctor discovery/profile pages; patient, doctor, and administrator accounts/roles; doctor profile creation and publication moderation; specialties, locations, medical services, consultation types, availability and exceptions; appointment booking; notification intents; protected video/chat/in-person entry; UI localization; approved public-content translations; audit events; and responsive accessible web UI.

The initial implementation locale set is **English (`en`) and Spanish (`es`)**. The technical foundation must use a locale registry so further locales can be enabled without redesign. Public doctor content may be authored in either supported locale and translated through the documented review/provenance model.

MVP deliberately excludes payment collection, KYC, identity verification, professional licensing verification, organization/clinic verification, reviews, recordings, attachments, clinical notes, EHR features, external calendar synchronization, waitlists, multi-practitioner capacity, payouts, SMS, and native applications.

## Explicitly separate workflows

Account registration, doctor profile creation, publication approval/moderation, and future professional verification/KYC are separate workflows. MVP requires registration, profile creation, and publication moderation. Publication is a content/operational approval, not proof of identity, credentials, licence, or clinic status.

## Product boundaries

- A consultation is an appointment-authorized interaction, not a clinical record.
- Translation never widens access to private source content.
- Public pages include only approved publication-safe data; appointments, dashboards, communications, payment flows, administration, and protected assets are private.
- The first implementation validates the no-payment journey. Any future commercial launch requires a separate commercial, tax, refund, and provider ADR.
- Production availability in a jurisdiction requires applicable legal/compliance review; this does not block implementation of the technical foundation or controlled non-production MVP work.

## First vertical slice

| Area | Slice definition |
| --- | --- |
| Screens | Localized public discovery, public doctor profile, sign-in/registration, booking, confirmation, patient and doctor appointment views, video/chat/in-person entry, and admin publication queue. |
| Entities | Account, Patient, Doctor, Doctor Profile, Specialty, Location, Medical Service, Consultation Type, Availability Rule/Exception, Appointment/Hold, Consultation, Conversation/Message, Localized Content/Translation, Notification, Audit Event. |
| Permissions | Public reads approved profiles only; patients book/read their own appointments; doctors manage only their own profile/availability/appointments; operators publish profiles; consultation access is appointment-scoped. |
| Services | Directory query, profile publication, availability expansion, booking hold/confirmation, appointment transition, consultation access grant, chat message append, notification dispatch, audit recording. |
| Data/integrity | PostgreSQL constraints and transactions enforce publication, ownership, idempotency, and no double booking. |
| Quality gates | The six mandatory hard gates and full thresholds in the technical specification apply. |
| Excluded | All explicitly Post-MVP capabilities above, provider-specific integrations beyond replaceable adapters, and protected-content machine translation. |

## Success measures

The MVP is successful only when its mandatory acceptance thresholds pass: a public doctor can be discovered, a patient can book a genuinely available slot without double booking, each consultation mode is correctly protected, private data remains private, and public SEO pages are crawlable while private pages are not. 【Technical specification: MVP Acceptance Thresholds】
