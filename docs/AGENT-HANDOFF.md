# Agent handoff

## Start here

1. Read the root README rule and this handoff.
2. Check **docs/PROJECT-STATE.md** and the latest commit before changing anything.
3. Use the permanent documents as the source of truth; update affected records in place.
4. Keep provider and architecture questions open until an evaluation and, where material, an ADR records the outcome.
5. After committing, update PROJECT-STATE with the commit identifier and accurate repository snapshot.

## Current safe next step

Facilitate Phase 0–1 discovery: define the first user/experience workflow, initial locales, governance/privacy assumptions, and evaluation criteria. Do not scaffold Laravel, Livewire, a database, or an external provider until the documented decision gate is satisfied.

## High-risk assumptions

Video requirements, realtime interaction semantics, payment responsibilities, translation review policy, jurisdiction/data residency, and content moderation/retention can each change the architecture. Surface them early rather than encoding them as defaults.
