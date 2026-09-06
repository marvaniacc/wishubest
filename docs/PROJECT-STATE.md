# Project state

## Last commit

- **Commit:** **HEAD** — Phase 1 foundation: Laravel, Livewire, PostgreSQL test path, first-party authentication, roles/capabilities, and localization (this commit).
- **Repository state:** Laravel 13.30.1 + Livewire 4.4 modular-monolith foundation is implemented. PostgreSQL is the configured local and test database; the PHPUnit suite executes migrations and queries against `wishubest_test`, never SQLite. First-party authentication, secure session rotation/invalidation, rate limits, explicit roles/capabilities, `en`/`es` catalogs, database queue/session/cache configuration, and baseline feature tests are in place.
- **Update rule:** Update this section in the same commit after every commit so it identifies that commit and accurately describes the repository state.

## Implemented baseline

| Area | State |
| --- | --- |
| Application architecture | Laravel/PHP + Livewire server-rendered modular-monolith foundation implemented. |
| Database | PostgreSQL configured in `.env.example`; test suite uses PostgreSQL `wishubest_test` and verifies migrations/queries. |
| Authentication | First-party patient registration, sign-in, sign-out, session regeneration/invalidation, and login/registration rate limiting implemented. |
| Authorization | `patient`, `doctor`, `administrator`, and `moderator` roles implemented as a typed enum; server-side gates and `can` middleware protect administration/moderation routes. |
| Localization | Versioned `en` and `es` authentication/dashboard catalogs implemented and tested. |
| Operations | Database session/cache/queue defaults, scheduler-ready Laravel foundation, log mailer default, and application logging configuration are present. |
| Tests | 11 PHPUnit tests pass against PostgreSQL: authentication, rate limiting, protected-route/role boundaries, localization catalogs, and database path. |

## Not implemented

Doctor profiles, publication moderation workflow, specialties/locations/services, public discovery/SEO pages, availability, scheduling, bookings, notifications, consultations, translated public content records, payments, KYC, and providers remain unimplemented. They are not represented by placeholder product features.

## Next action

Implement **Milestone 2 — doctor directory and publication**: Doctor/Doctor Profile, controlled specialties/locations/services, doctor-only authoring, administrator/moderator publication decisions, approved-only server-rendered public profile/discovery routes, and corresponding authorization/public-private visibility tests. Preserve the minimal four-field doctor-card rule and locale-prefixed SEO route plan.

## Risks and blockers

- No product/technical blocker prevents Milestone 2.
- PostgreSQL must be available to run tests; the suite intentionally does not fall back to SQLite.
- Legal/compliance review remains required before public production launch, as documented; it does not block foundation or directory implementation.
