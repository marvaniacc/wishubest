# ADR-0001: Technology and provider direction

- **Status:** Open
- **Date:** 2026-09-06
- **Owners:** Product and engineering owners to be assigned
- **Related:** [Architecture](../ARCHITECTURE.md), [Technical specification](../TECHNICAL-SPECIFICATION.md), [Roadmap](../ROADMAP.md)

## Context

The project is beginning before application implementation. It needs a web application direction, a relational datastore, and eventual integrations for video, realtime communication, translation, payments, hosting, and cloud operations.

## Problem

Selecting technology or providers too early risks binding product requirements, privacy obligations, and operational cost to unvalidated assumptions. Leaving all direction implicit risks inconsistent implementation.

## Options

1. Accept Laravel/PHP with Livewire now and select providers during implementation.
2. Evaluate Laravel/PHP with Livewire as a candidate, evaluate PostgreSQL and MySQL against documented criteria, and defer all provider selections until requirements and evaluation criteria are accepted.
3. Begin application implementation without a documented direction.

## Decision

Choose option 2. Laravel/PHP with Livewire is an evaluated candidate only. PostgreSQL and MySQL remain open for comparison. Video, realtime, translation, payments, hosting, and cloud providers remain explicitly open.

## Reasoning

A documentation-first evaluation preserves flexibility while establishing clear integration and decision boundaries. The product's video, language, commercial, jurisdictional, and operational requirements can materially alter the optimal technical choices.

## Consequences

### Positive

- Avoids premature vendor and framework lock-in.
- Makes required evaluation factors visible before implementation.
- Preserves portability through provider-agnostic boundaries.

### Negative / risks

- Delays scaffolding until decision gates are complete.
- Requires disciplined documentation updates and owner participation.

### Follow-up

Define decision owners, candidate sets, measurable criteria, and acceptance gates for each open area. Record accepted or deferred outcomes in subsequent ADRs.
