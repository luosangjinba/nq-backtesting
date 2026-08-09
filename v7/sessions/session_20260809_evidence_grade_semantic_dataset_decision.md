# Session — Evidence-Grade Semantic Dataset Product Decision

Date: 2026-08-09

Status: accepted documentation decision; no implementation authorized

Decision: `ADR-V7-003`

## Authorization And Scope

The user asked to convert the final conclusion from the financial annotation-
dataset market discussion into a binding decision and preserve the discussion
process in the dated non-decision memo system.

This session changes documentation only. It does not implement a Dataset
Builder, AI integration, Research/Training/Trading Review workflow, hosting,
accounts, collaboration, public dataset, Marketplace, data purchase, semantic
detector, or new R13 slice. The pending R13.6 implementation and human gate are
independent and were not modified or accepted by this decision.

## Accepted Result

`ADR-V7-003` accepts V7 as an evidence-grade semantic dataset production
workstation for discretionary trading research. User-owned, AI-ready semantic
annotation data is now a first-class product output, while validation remains
the outcome and Replay remains the controlled observation environment.

The decision binds:

- exact market evidence instead of screenshot-only source truth;
- typed and versioned semantic entities and relations;
- mandatory no-future observation provenance;
- separate Observation, Interpretation, Decision, and Outcome evidence;
- traceable case/cohort/dataset derivation and raw-context drilldown;
- explicit human acceptance of gold labels;
- user portability, source/data-rights provenance, and replaceable AI;
- existing sole-owner and removable semantic-package architecture rules.

## Discussion Preserved

`MEMO-V7-004` records the path to the decision and leaves unresolved:

- the trader pain point separating strategy edge, recognition error, and
  execution failure;
- competition from Replay/journal, chart-AI, generic annotation, and
  institutional financial-data products;
- open-source versus hosted/private/team/enterprise delivery;
- why users might pay for operations, collaboration, support, or private AI
  even when local software is open;
- market-data license cost and redistribution rights as an early SaaS barrier;
- open-model, retrieval, fine-tuning, evaluation, and human-review boundaries;
- public/shared datasets, consent, contributor rights, privacy, branding,
  pricing, and market entry.

`MEMO-V7-003` is marked partially promoted only for its exact semantic
evidence, immutable cases/cohorts, deterministic analysis, and evidence-linked
Agent constraints. Its complete learning-system design remains open.

## Documentation Closure

The decision is discoverable through:

- `docs/V7_PRODUCT_AND_SCOPE.md`;
- `docs/INDEX.md`;
- `docs/V7_NON_DECISION_MEMO_REGISTRY.md`;
- `TODO.md`.

The registry's stale statement that ADR-V7-001 remained proposed was corrected,
and accepted ADR-V7-001/002/003 history is now distinct from open memos and
decision candidates.

## Verification

- relevant Markdown references and stable memo/decision ids were inspected;
- the new decision explicitly allocates no delivery id;
- existing R13.6 source and documentation changes were preserved outside this
  session's decision boundary;
- `git diff --check` passed for the documentation files changed by this
  session.
