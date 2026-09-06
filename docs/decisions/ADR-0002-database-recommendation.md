# ADR-0002: Prefer PostgreSQL for the initial relational database

- **Status:** Proposed
- **Date:** 2026-09-06
- **Owners:** Engineering and product owners to be assigned
- **Related:** [Architecture](../ARCHITECTURE.md), [Domain model](../DOMAIN-MODEL.md), [Technical specification](../TECHNICAL-SPECIFICATION.md)

## Context

Appointments need reliable concurrent booking, directory filtering, transactional payment/booking facts, audits, and future reporting. Laravel supports both PostgreSQL and MySQL. No schema or managed service has been selected.

## Problem

The initial relational database must optimize correctness and operational simplicity without prematurely introducing a search platform or database-specific coupling.

## Requirements

Correct transactional scheduling; relational integrity; indexing and JSON support; Laravel compatibility; backups/recovery/monitoring; manageable cost; team operability; and a credible exit path.

## Options

1. PostgreSQL.
2. MySQL.
3. A non-relational primary store.

## Advantages

PostgreSQL offers strong transactional and indexing capabilities suited to scheduling and relational reporting. MySQL has broad familiarity and managed availability. Both keep the Laravel path simple.

## Disadvantages

PostgreSQL may be less familiar or costlier in some managed environments. MySQL requires equally careful locking/transaction design for booking correctness. A non-relational primary store complicates relational appointment integrity and is not suitable for the initial core.

## Operational implications

Compare candidate managed offerings for region, backup restore testing, monitoring, high availability, worker connectivity, cost, and operator familiarity before acceptance.

## Security implications

Use least-privilege database access, encrypted connections, protected backups, audit-safe logs, and tested recovery regardless of engine. Engine selection does not satisfy patient-data obligations.

## Scalability implications

Use measured indexes and bounded availability queries first. Keep search abstraction separate so full-text or dedicated search can be introduced only when evidence warrants it.

## Cost and complexity implications

A single managed relational database minimizes MVP infrastructure. A second store or premature search cluster adds operations without proven need.

## Decision

Recommend PostgreSQL for the initial relational database, subject to managed-service and team-operability validation.

## Reasoning

Its transactional, indexing, and JSON capabilities provide a strong fit for correct appointment booking and a growing multilingual directory while retaining a simple Laravel-supported architecture.

## Why this fits WishUBest

WishUBest must favor appointment correctness, secure relational records, SEO-facing directory queries, and low operational complexity over fashionable infrastructure.

## Consequences

If accepted, booking concurrency design may use PostgreSQL-appropriate constraints and transactions, while repository/query boundaries preserve a future exit path. MySQL remains the fallback if validated operations, cost, or team evidence outweighs the recommendation.

## Rejected alternatives

A non-relational primary database is rejected for MVP because it weakens the simplest path to relational appointment and audit correctness. A dedicated search system is deferred because MVP filters do not justify its operational cost.

## Future migration and exit implications

Avoid unneeded engine-specific behavior, export/backup test data regularly, and isolate persistence/query access. A later migration requires tested data reconciliation and booking downtime/dual-write planning; it is not assumed to be free.
