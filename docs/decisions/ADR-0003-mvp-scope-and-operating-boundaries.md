# ADR-0003: MVP operating boundaries, localization, and payment exclusion

- **Status:** Accepted
- **Date:** 2026-09-06
- **Owners:** Product and engineering owners
- **Related:** [Product blueprint](../PRODUCT-BLUEPRINT.md), [Technical specification](../TECHNICAL-SPECIFICATION.md), [Architecture](../ARCHITECTURE.md), [Roadmap](../ROADMAP.md)

## Context

Implementation needs a finite first vertical slice rather than unresolved market, payment, translation, and verification alternatives. The platform must remain safe without becoming an EHR or selecting providers prematurely.

## Problem

Open-ended scope would delay coding and invite provider, payment, KYC, and protected-data assumptions that are not required to validate patient discovery through consultation entry.

## Options

1. Build all anticipated launch capabilities before validating the core journey.
2. Accept a localized no-payment first slice with public-content translation, publication moderation, and strict Post-MVP boundaries.
3. Delay all implementation for provider, payment, and verification decisions.

## Decision

Accept option 2. MVP supports `en` and `es` UI and approved public content; it implements visitor discovery through protected video/chat/in-person consultation entry without payment collection. KYC, identity/professional/organization verification, recordings, attachments, clinical records, calendar sync, reviews, payouts, SMS, advanced realtime, and provider selections are Post-MVP. Protected communication/chat translation is not implemented or externally processed. Public production launch in a jurisdiction requires legal/compliance review, but technical foundation and controlled MVP implementation may proceed.

## Reasoning

This is the smallest coherent, reversible journey that proves the six hard gates. It makes translation visible where safe, preserves patient privacy, avoids commercial obligations, and separates publication moderation from verification.

## Consequences

### Positive

- Coding can start against explicit scope and acceptance criteria.
- No payment or KYC integration blocks the core patient journey.
- Locale and translation records are designed for expansion without exposing protected data.

### Negative / risks

- The initial MVP cannot validate payment conversion or protected-chat translation.
- A jurisdiction-specific production launch still needs legal/compliance approval.

### Follow-up

Before adding payments, verification, protected communication translation, or a vendor integration, define policy/requirements and record an ADR. Before public launch, complete jurisdiction-specific review.
