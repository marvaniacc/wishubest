# ADR-0002: PostgreSQL as the MVP relational database

- **Status:** Accepted
- **Date:** 2026-09-06
- **Owners:** Engineering and product owners
- **Related:** [Architecture](../ARCHITECTURE.md), [Domain model](../DOMAIN-MODEL.md), [Technical specification](../TECHNICAL-SPECIFICATION.md)

## Context

WishUBest requires correct concurrent booking, relational appointment/audit data, directory filtering, reporting-ready indexes, Laravel support, and simple managed operations.

## Problem

The primary relational store must prevent double booking and retain integrity without adding a separate search or distributed data platform.

## Options

1. PostgreSQL.
2. MySQL.
3. A non-relational primary store.

## Decision

Accept PostgreSQL for the MVP. Use a managed deployment with encrypted connections, least-privilege access, backup/restore testing, monitoring, and cost review. Use relational constraints, transactions, and a PostgreSQL-appropriate active interval overlap-prevention strategy for appointment/hold correctness.

## Reasoning

PostgreSQL offers strong transactional semantics, expressive constraints/indexing, JSON support, and Laravel compatibility. It fits atomic booking holds, directory filtering, and reporting while retaining a single-store operational model. MySQL is credible but does not outweigh the scheduling correctness and constraint fit for this MVP.

## Consequences

### Positive

- One relational source of truth with enforceable booking integrity.
- No premature search platform or multi-store synchronization.
- Strong foundation for audit and directory queries.

### Negative / risks

- Operators need PostgreSQL familiarity and managed-service discipline.
- Engine-specific overlap enforcement must be isolated and covered by tests.

### Follow-up

Benchmark the contested-slot path, test restores, and keep query boundaries portable. Any future engine migration requires a dedicated migration plan and ADR.
