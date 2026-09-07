# Project state

## Last commit

- **Commit:** **HEAD** — Phase 1 Milestone 2 doctor directory and publication (this commit).
- **Repository state:** The Laravel/Livewire PostgreSQL foundation now includes doctor/profile ownership, controlled directory references, publication moderation, and localized server-rendered public doctor discovery.
- **Update rule:** Update this section in the same commit after every commit so it identifies that commit and accurately describes the repository state.

## Implemented baseline

| Area | State |
| --- | --- |
| Foundation | Laravel/Livewire SSR modular monolith, PostgreSQL test path, first-party authentication, roles, rate limits, and `en`/`es` catalogs. |
| Directory domain | `Doctor` owns one `DoctorProfile`; controlled Specialty, Location, and Medical Service records are connected through relational pivots. |
| Publication | Explicit `draft`, `submitted`, `approved`, `rejected`, and `retired` states; doctors submit, and administrators/moderators review. |
| Authorization | Doctors can manage only their own profiles; patient authoring is denied; administrator-only administration remains separate from moderator publication capability. |
| Public directory | Locale-prefixed `/en/doctors` and `/es/doctors` directory/profile routes render only approved profiles and preserve the four-field card rule. |
| Tests | Baseline tests plus directory feature coverage for profile ownership, controlled-reference validation, moderation, public visibility, and locale routes. |

## Not implemented

Scheduling/availability/slots, bookings, appointments, notifications, consultations, translated public-content records, payments, KYC, verification, recordings, attachments, calendar synchronization, and providers remain out of scope.

## Next action

Implement **Milestone 3 — scheduling and booking**: availability rules/exceptions, local-time/timezone behavior, PostgreSQL conflict protection, booking holds and appointment lifecycle. Preserve publication visibility and authorization boundaries.

## Risks and blockers

- PostgreSQL and the `pdo_pgsql` PHP extension must be available to execute the test suite; the suite intentionally does not fall back to SQLite.
- Legal/compliance review remains required before public production launch, but does not block controlled MVP implementation.
