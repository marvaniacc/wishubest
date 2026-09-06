# Project state

## Last commit

- **Commit:** **HEAD** — Merge current main and reconcile Phase 0 documentation conflicts (this commit).
- **Previous documentation baseline:** b87ef91 — docs: complete Phase 0 architecture analysis; reconciled against current origin/main.
- **Repository state at HEAD:** documentation-only planning repository; the permanent documents now define WishUBest as a multilingual doctor discovery, appointment booking, and medical consultation platform. No application code, dependencies, migrations, or test suite exist.
- **Update rule:** after every commit, update this section in place so it identifies the new HEAD and accurately describes that committed state.

## State summary

| Area | State |
| --- | --- |
| Application implementation | Not started. |
| Product definition | Doctor/patient marketplace and video/chat/in-person consultation modes documented. |
| Technical direction | Laravel/PHP with Livewire remains open; modular SSR-first direction is recommended. |
| Data store | PostgreSQL is proposed; acceptance remains open pending operations validation. |
| External providers | Video, realtime, translation, payments, hosting, cloud, storage, messaging, and email/SMS providers open. |
| Key decisions | MVP boundary/card rule accepted; legal/compliance, market, scheduling, payment, provider, and framework decisions remain gated. |
| Delivery | Decision-gated roadmap; no dates committed. |

## Next actions

1. Assign owners and resolve Phase 0 product, market, medical/legal, and safety questions.
2. Record Phase 1 evaluations and decisions before application implementation.
3. Refresh this document in place after the next commit.
