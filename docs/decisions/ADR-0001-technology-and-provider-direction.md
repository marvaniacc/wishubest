# ADR-0001: Laravel/Livewire modular monolith and provider boundaries

- **Status:** Accepted
- **Date:** 2026-09-06
- **Owners:** Engineering and product owners
- **Related:** [Architecture](../ARCHITECTURE.md), [Technical specification](../TECHNICAL-SPECIFICATION.md), [Roadmap](../ROADMAP.md)

## Context

WishUBest needs crawlable multilingual public doctor pages, secure patient/doctor dashboards, policy-based authorization, appointment scheduling, background work, accessibility, and low MVP operational complexity.

## Problem

The application needs an implementation architecture now. An SPA/API split, microservices, Kubernetes, or provider-specific domain logic would add delivery, security, SEO, localization, and operations cost without an MVP requirement.

## Options

1. Laravel/PHP with Livewire in a server-rendered modular monolith.
2. Laravel with a separate SPA/API.
3. Microservices or a plugin-led/WordPress core.

## Decision

Accept option 1: Laravel/PHP + Livewire, implemented as a server-rendered modular monolith. Use Laravel policies, queues, scheduler, localization catalogs, and testing; isolate external vendor protocols behind application-owned adapters. Do not select video, realtime, translation, payment, storage, email, hosting, or cloud vendors in this ADR.

## Reasoning

It directly supports SSR/SEO, accessible HTML, one authorization/validation model, multilingual rendering, jobs, dashboards, and a maintainable low-cost deployment. It preserves later exits because domain rules and adapter contracts are independent of UI and vendor SDKs.

## Consequences

### Positive

- A direct, testable implementation path for the first vertical slice.
- No duplicated frontend/backend auth or rendering concerns.
- Provider selection can be deferred without blocking domain implementation.

### Negative / risks

- The team must maintain Laravel/PHP competence.
- Rich realtime behavior remains an adapter concern and is intentionally not assumed for MVP.

### Follow-up

Implement the modular boundaries and ADR-record any material provider choice when it is required. Revisit separate clients or services only with demonstrated need.
