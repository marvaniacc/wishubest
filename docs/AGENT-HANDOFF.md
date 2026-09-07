# Agent handoff

## Status

Phase 1 Milestone 2 is complete. WishUBest has a Laravel + Livewire server-rendered modular monolith with PostgreSQL-backed tests, first-party authentication, roles/capabilities, `en`/`es` catalogs, and a doctor directory/publication slice.

## What is implemented

- Milestone 1 foundation: PostgreSQL configuration, first-party patient registration/sign-in/sign-out, secure session handling, rate limits, explicit roles, and server-side gates.
- Doctor accounts own one Doctor record and one Doctor Profile. Profiles have explicit `draft`, `submitted`, `approved`, `rejected`, and `retired` states.
- Specialty, Location, and Medical Service are controlled relational references. Doctor authoring validates active references and can submit a complete profile for review.
- Administrators and moderators can approve/reject submitted profiles through protected server-side authorization; moderators remain unable to use administrator-only routes.
- Locale-prefixed `/en/doctors` and `/es/doctors` SSR directory/profile routes show approved profiles only. Directory cards contain only photo, name, specialty, and location.

## What is not implemented

Scheduling, availability, slots, bookings, appointments, notifications, consultations, public-content translation records, payments, KYC/verification, recordings, attachments, calendar sync, and providers are not implemented.

## Begin next

Implement **Milestone 3 — scheduling and booking**. Add doctor-local recurring availability and exceptions, timezone-safe display/storage, PostgreSQL-backed conflict protection, booking holds, and the documented appointment lifecycle. Do not add payments, providers, KYC, or consultation functionality.

## Test commands

Run `php artisan test` for the PostgreSQL-backed feature suite and `vendor/bin/pint --test` for formatting. Ensure PostgreSQL and the `pdo_pgsql` extension are available; do not substitute SQLite.

## Non-blocking legal/compliance boundary

Before public production launch in a jurisdiction, obtain applicable review for medical-practice scope, privacy/retention/consent, advertising/credential claims, and emergency guidance. Keep the MVP non-EHR, data-minimizing, and free of protected-content translation.
