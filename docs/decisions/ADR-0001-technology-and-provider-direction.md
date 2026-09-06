# ADR-0001: Technology and provider direction

- **Status:** Open
- **Date:** 2026-09-06
- **Owners:** Product and engineering owners to be assigned
- **Related:** [Architecture](../ARCHITECTURE.md), [Technical specification](../TECHNICAL-SPECIFICATION.md), [Roadmap](../ROADMAP.md)

## Context

WishUBest is a multilingual doctor discovery, appointment booking, and medical consultation platform. It needs a web application direction, a relational datastore, and eventual integrations for video, realtime communication, translation, payments, hosting, cloud operations, storage, messaging, and email/SMS.

## Problem

Selecting technology or providers before the medical/legal, patient-data, scheduling, translation, SEO, and commercial requirements are defined risks avoidable lock-in and unsafe assumptions. Leaving all direction implicit risks inconsistent implementation.

## Options

1. Accept Laravel/PHP with Livewire and select providers immediately.
2. Evaluate Laravel/PHP with Livewire as a candidate; evaluate PostgreSQL and MySQL against documented appointment, directory, operational, and privacy criteria; defer provider selections until requirements and evaluation criteria are accepted.
3. Begin application implementation without a documented direction.

## Decision

Choose option 2. Laravel/PHP with Livewire is an evaluated candidate only. PostgreSQL and MySQL remain open for comparison. Video, realtime, translation, payments, hosting, cloud, storage, messaging, and email/SMS providers remain explicitly open.

## Reasoning

Doctor discovery, scheduling, private communication, medical translation, international SEO, payments, and privacy obligations materially influence technology selection. Documentation-first evaluation establishes integration boundaries without claiming a provider or implementation decision.

## Consequences

### Positive

- Avoids premature framework and vendor lock-in.
- Makes patient-data, scheduling, localization, SEO, and operational evaluation factors explicit.
- Preserves portability through application-owned integration boundaries.

### Negative / risks

- Delays application scaffolding until decision gates are complete.
- Requires disciplined documentation updates and accountable decision owners.

### Follow-up

Define candidate sets, measurable criteria, owners, and acceptance gates. Record accepted, deferred, or superseding outcomes in subsequent ADRs before implementation.
