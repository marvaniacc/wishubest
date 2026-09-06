# Agent handoff

## Status

codex/explain-codebase-structure-and-learning-path-govsip
Phase 1 Milestone 1 is complete. WishUBest now has a Laravel 13 + Livewire 4.4 server-rendered modular-monolith foundation with PostgreSQL-backed tests, first-party authentication, roles/capabilities, `en`/`es` catalogs, queue/session/cache defaults, and passing baseline feature tests. The product remains a multilingual doctor discovery, appointment booking, and medical consultation platform—not a generic marketplace or EHR.

## What is implemented

- PostgreSQL is the configured local/test database. PHPUnit uses `wishubest_test` with the `pgsql` driver and verifies a PostgreSQL query/migration path.
- Patient self-registration, sign-in, sign-out, session regeneration/invalidation, validation, and rate limiting are implemented.
- `UserRole` defines patient, doctor, administrator, and moderator. `access-administration` and `moderate-doctor-profiles` gates are enforced server-side through `can` middleware; protected routes have feature coverage.
- English and Spanish authentication/dashboard translation catalogs exist and are tested.
- Laravel database queue/session/cache defaults and log mailer baseline are configured. No provider SDK was selected.

## What is not implemented

Do not infer product functionality from the foundation. Doctor profiles/publication, discovery/SEO, scheduling/availability/booking, notifications, consultations, public-content translation records, payments, KYC/verification, recordings, attachments, calendar sync, and providers are not implemented.

## Begin next

Implement **Milestone 2 — doctor directory and publication**. Add Doctor and Doctor Profile domain records, controlled Specialty/Location/Medical Service references, doctor-only profile authoring, administrator/moderator approval/rejection, approved-only public visibility, locale-prefixed SSR public routes, and tests for doctor/admin/moderator/patient/public boundaries. Do not start scheduling or booking in that milestone.

Preserve locked decisions: Laravel/Livewire modular monolith, PostgreSQL, first-party sessions, server-side policies/capabilities, `en`/`es`, minimal four-field discovery cards, no payment first slice, no KYC, and provider adapters only. Do not add project `SKILL.md` files yet; reassess after the scheduling and authorization domains show a reusable, project-specific workflow.

## Test commands

Run `php artisan test` for the PostgreSQL-backed feature suite and `vendor/bin/pint --test` for formatting. Ensure PostgreSQL is running and the `wishubest_test` database/user from `.env.example`/`phpunit.xml` are available; do not substitute SQLite.

## Non-blocking legal/compliance boundary

Technical foundation and controlled MVP implementation may continue. Before public production launch in a jurisdiction, obtain applicable review for medical-practice scope, privacy/retention/consent, advertising/credential claims, and emergency guidance. Keep the MVP non-EHR, data-minimizing, and free of protected-content translation.

**DOCUMENTATION COMPLETE — READY FOR IMPLEMENTATION.** WishUBest is a multilingual doctor discovery, appointment booking, and medical consultation platform for video, online chat, and in-person consultations. It is not a generic marketplace or EHR.

## Begin here

1. Read `README.md`, this handoff, [Architecture](ARCHITECTURE.md), [Domain model](DOMAIN-MODEL.md), [Technical specification](TECHNICAL-SPECIFICATION.md), and accepted ADRs.
2. Begin Phase 1 implementation: Laravel/PHP + Livewire modular monolith, PostgreSQL, first-party sessions, roles/policies, migrations, test harness, queue/scheduler, and `en`/`es` catalogs.
3. Implement the first vertical slice in roadmap order and write tests against every mandatory acceptance threshold—especially concurrency, timezone, authorization/privacy, and public/private SEO boundaries.
4. Preserve the minimal four-field doctor-card rule. KYC and all verification are out of MVP; profile publication moderation is required and is not verification.
5. Keep video, translation, email, storage, and hosting behind adapters. Do not send protected content to translation services. Do not add payments to the first slice.
6. Update canonical documentation, development history, and `PROJECT-STATE.md` after every commit. Record material deviations with a sequential ADR.

## Non-blocking legal/compliance boundary

Technical foundation and controlled MVP implementation may begin. Before public production launch in a jurisdiction, obtain applicable review for medical-practice scope, privacy/retention/consent, advertising/credential claims, and emergency guidance. Keep the implemented MVP within its non-EHR, data-minimizing, no-protected-content-translation boundary.

## Do not reopen/defer implementation for

Laravel/Livewire, PostgreSQL, scheduling model, locale strategy, SEO strategy, payment exclusion, KYC exclusion, or the final readiness gate: these are accepted. Post-MVP items are listed in [Roadmap](ROADMAP.md#post-mvp).
main
