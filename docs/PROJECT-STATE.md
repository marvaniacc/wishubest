# Project state

## Last commit

- **Commit:** **HEAD** — Phase 1 Milestone 2 doctor directory and publication (this commit).
codex/explain-codebase-structure-to-newcomers-rouu46
- **Repository state:** The Laravel/Livewire PostgreSQL foundation includes doctor/profile ownership, controlled directory references, publication moderation, and localized server-rendered public doctor discovery. Milestone 2 was verified with the PHP 8.5 CLI `pdo_pgsql` extension enabled and PostgreSQL 16 test migrations/connections.

- **Repository state:** The Laravel/Livewire PostgreSQL foundation now includes doctor/profile ownership, controlled directory references, publication moderation, and localized server-rendered public doctor discovery.
main
- **Update rule:** Update this section in the same commit after every commit so it identifies that commit and accurately describes the repository state.

## Implemented baseline

| Area | State |
| --- | --- |
| Foundation | Laravel/Livewire SSR modular monolith, PostgreSQL test path, first-party authentication, roles, rate limits, and `en`/`es` catalogs. |
| Directory domain | `Doctor` owns one `DoctorProfile`; controlled Specialty, Location, and Medical Service records are connected through relational pivots. |
| Publication | Explicit `draft`, `submitted`, `approved`, `rejected`, and `retired` states; doctors submit, and administrators/moderators review. |
| Authorization | Doctors can manage only their own profiles; patient authoring is denied; administrator-only administration remains separate from moderator publication capability. |
| Public directory | Locale-prefixed `/en/doctors` and `/es/doctors` directory/profile routes render only approved profiles and preserve the four-field card rule. |
codex/explain-codebase-structure-to-newcomers-rouu46
| Tests | `php artisan test` passes: 16 tests and 81 assertions against PostgreSQL. Coverage includes profile ownership, controlled-reference validation, moderation, public visibility, and locale routes. |

| Tests | Baseline tests plus directory feature coverage for profile ownership, controlled-reference validation, moderation, public visibility, and locale routes. |
main

## Not implemented

Scheduling/availability/slots, bookings, appointments, notifications, consultations, translated public-content records, payments, KYC, verification, recordings, attachments, calendar synchronization, and providers remain out of scope.

## Next action

Implement **Milestone 3 — scheduling and booking**: availability rules/exceptions, local-time/timezone behavior, PostgreSQL conflict protection, booking holds and appointment lifecycle. Preserve publication visibility and authorization boundaries.

## Risks and blockers

codex/explain-codebase-structure-to-newcomers-rouu46
- Verification environment: PHP 8.5 CLI has `pdo_pgsql` enabled and PostgreSQL 16 is reachable for `wishubest_test`; the suite intentionally does not fall back to SQLite.

- PostgreSQL and the `pdo_pgsql` PHP extension must be available to execute the test suite; the suite intentionally does not fall back to SQLite.
main
- Legal/compliance review remains required before public production launch, but does not block controlled MVP implementation.
