# Agent handoff

## Status

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
