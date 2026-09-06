# Documentation is the project contract

> **Non-negotiable rule for future agents:** update the established documentation **in place**. Do **not** rename, restructure, replace, or move this documentation without explicit human instruction.

This repository is intentionally documentation-first. Application implementation begins only after these records have been used to turn validated product and technical decisions into work.

## Permanent documentation map

| Document | Purpose | Update when |
| --- | --- | --- |
| [Product blueprint](docs/PRODUCT-BLUEPRINT.md) | Product intent, users, workflows, scope, and success measures. | Product behavior, audience, or scope changes. |
| [Technical specification](docs/TECHNICAL-SPECIFICATION.md) | Functional and non-functional requirements, boundaries, and acceptance criteria. | A requirement is clarified, added, or retired. |
| [Architecture](docs/ARCHITECTURE.md) | System shape, integration boundaries, quality attributes, and unresolved architecture questions. | A design or integration direction changes. |
| [Domain model](docs/DOMAIN-MODEL.md) | Canonical entities, relationships, lifecycle rules, and ownership. | Vocabulary, data ownership, or business rules change. |
| [Roadmap](docs/ROADMAP.md) | Outcome-oriented delivery sequencing and dependencies. | Priorities, phases, or delivery dependencies change. |
| [Project state](docs/PROJECT-STATE.md) | Snapshot of the repository at the last commit. | **After every commit.** |
| [Decision records](docs/decisions/) | Durable, reviewable architectural and product decisions. | A material decision is proposed, accepted, changed, or deferred. |
| [Development history](docs/DEVELOPMENT-HISTORY.md) | Chronological record of meaningful work and rationale. | A meaningful milestone or change is completed. |
| [Agent handoff](docs/AGENT-HANDOFF.md) | Concise next-agent orientation and safe working checklist. | Priorities, known risks, or next steps change. |

## Documentation change rules

1. Treat these paths and filenames as stable public project interfaces. Edit the relevant document in place; do not create a competing “v2”, “new”, or replacement structure.
2. Update every document affected by a change in the same change set. Cross-link related decisions, requirements, and roadmap items rather than duplicating conflicting detail.
3. Update **docs/PROJECT-STATE.md** immediately after **every** commit so it names that commit and accurately describes the committed repository state. If a commit changes plans or decisions, also update the relevant durable record and history.
4. Record materially consequential choices in **docs/decisions/** using the required decision-record sections and status vocabulary. Never silently convert a proposal into an implementation assumption.
5. Preserve open questions as open. Do not imply a vendor, provider, framework, schema, or timeline has been selected unless an accepted record says so.
6. Keep documentation specific, testable, and current. Use links to canonical sections rather than copying large blocks.
7. Only add project-specific agent instructions or reusable skills when they provide durable, actionable guidance beyond these documents. Do not add generic boilerplate.

## Current direction

Laravel/PHP with Livewire is an **evaluated direction**, not an implementation commitment. PostgreSQL and MySQL remain under evaluation. Video, realtime, translation, payments, hosting, and cloud providers are explicitly open pending documented evaluation. See the [architecture](docs/ARCHITECTURE.md), [technical specification](docs/TECHNICAL-SPECIFICATION.md), and [decision records](docs/decisions/).
