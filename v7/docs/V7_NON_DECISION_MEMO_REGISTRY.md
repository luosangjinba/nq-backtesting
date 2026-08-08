# V7 Non-Decision Memo Registry

Status: binding documentation-governance index

Created: 2026-08-07

Last updated: 2026-08-07

## Purpose

This registry keeps unresolved product and architecture ideas discoverable
without allowing them to masquerade as decisions, roadmaps, or implementation
authorization. It supports two future operations:

1. reopen one memo, update the evidence, and promote an accepted position into
   a binding ADR/specification;
2. compare positions formed at different times, expose contradictions, and
   deliberately choose, combine, or reject them.

The registry is the canonical collection point. Memo files remain at stable
paths so historical links do not break. Physical co-location in one directory
is not required; every qualifying memo must be listed here.

## Classification

Include a document when its primary purpose is to preserve an unresolved idea,
alternative, hypothesis, feasibility discussion, or deferred product direction
and it authorizes no production implementation.

Do not include:

- accepted product or architecture decisions;
- implementation contracts whose code exists but human verification remains;
- audits which reached a bounded conclusion;
- ordinary TODO items;
- historical session logs;
- a rejected implementation record which is already governed by a delivery id.

A proposed ADR/spec awaiting human acceptance is not a memo, but it is listed
in the adjacent decision-candidate table so readers can see when a memo is being
converted into a decision.

## Stable Memo Registry

| Memo id | Topic | First formed | Last substantive revision | Current status | File |
| --- | --- | --- | --- | --- | --- |
| `MEMO-V7-001` | General futures/plugin platform, semantic tools, Setup workflow, AI, distribution, marketplace | 2026-08-01 | 2026-08-01 | open; product decision and implementation deferred | `V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md` |
| `MEMO-V7-002` | Second-level Replay and tick-sourced data | 2026-08-01 | 2026-08-06 | current deferral position recorded; future activation undecided | `V7_SECOND_LEVEL_REPLAY_TICK_DATA_PREDECISION_MEMO.md` |
| `MEMO-V7-003` | AI-Agent-participatory Research, Training, and Trading Review system, using semantic Study Cases/Cohorts | 2026-08-07 | 2026-08-07 12:12 PDT | open; system boundary, autonomy, business model, and ownership undecided | `V7_CHART_RESEARCH_SEMANTIC_CASE_AGENT_PREDECISION_MEMO.md` |

## Adjacent Decision Candidates

| Decision id | Topic | First formed | Status | Relationship to memos | File |
| --- | --- | --- | --- | --- | --- |
| `ADR-V7-001` / `R13.1` | Drawing and Semantic Annotation foundation | 2026-08-07 | branch-local proposed specification at memo-formation time; not accepted or carried into `main` | narrows annotation terminology and state ownership discussed broadly by MEMO-V7-001; supplies a candidate evidence substrate for MEMO-V7-003 | intentionally absent from `main`; preserve or recreate only through its feature branch or a later decision |

When a decision candidate is accepted, move its row to the decision history
below. When rejected, retain the row with the rejection date and reason; do not
delete it.

## Cross-Memo Tensions And Dependencies

### MEMO-V7-001 Versus MEMO-V7-003

- MEMO-V7-001 treats Setup workflow and AI as capabilities in a possible broad
  plugin platform; MEMO-V7-003 considers a narrower first-party Agent-
  participatory Research, Training, and Trading Review system valuable before
  a general plugin SDK or marketplace.
- MEMO-V7-001 names a `SetupCase` as a complete discretionary trade-process
  record owned by Journal/Session; MEMO-V7-003 proposes a `StudyCase` as one
  research observation which may contain no trade and may later reference a
  `SetupCase`.
- MEMO-V7-001 models AI output primarily as nondeterministic advisory evidence
  through a host AI Harness; MEMO-V7-003 additionally considers an external
  coding agent which turns accepted Setup definitions into deterministic
  detectors and conformance tests.
- MEMO-V7-003's revised goal also requires durable bounded Agent participation
  across research plans, deliberate practice, and longitudinal review; a future
  decision must determine whether MEMO-V7-001's AI Harness is sufficient or
  needs a separate workflow-coordination contract.
- A future decision must choose whether the three learning loops form one
  first-party module, several first-party modules, plugin capabilities, or a
  first-party system over later plugin contracts.

### MEMO-V7-002 Versus MEMO-V7-003

- Research, Training, and Trading Review are useful with the accepted minute-
  data product and must not depend on seconds/ticks.
- If second-level data is later activated, Study Cases and Cohorts need explicit
  source-resolution provenance and materially larger evidence/resource budgets.
- Neither memo silently activates the other.

### ADR-V7-001 Versus MEMO-V7-001 Terminology

- MEMO-V7-001 uses the older broad `SemanticAnnotation`/role vocabulary.
- ADR-V7-001 proposes `DrawingGeometry`, `DrawingEntity`, `SemanticArtifact`,
  and `ArtifactProjection`, reserving asset for tradable instruments.
- If ADR-V7-001 is accepted, later decisions should translate the older memo
  into the accepted terms rather than preserve two annotation state models.

## Required Memo Header

Every future non-decision memo must start with:

```text
Memo id: MEMO-V7-###
First formed: YYYY-MM-DD HH:MM TZ when known
Last substantive revision: YYYY-MM-DD HH:MM TZ when known
Status: discussion captured; decision and implementation not authorized
Registry: V7_NON_DECISION_MEMO_REGISTRY.md
```

It must also contain:

- purpose and explicit non-authorization boundary;
- current position as of a date;
- candidate model or alternatives;
- evidence already considered;
- conflicts/dependencies with earlier memos and proposed/accepted decisions;
- what would change the current position;
- evidence required before a decision;
- promotion checklist;
- append-only position history.

## Change And Conflict Rules

1. Never silently rewrite an earlier position to make it agree with a later
   idea.
2. Factual corrections may edit the body, but the position history must name
   the correction date and state whether it changes the candidate direction.
3. A materially different direction receives a dated position-history entry;
   create a new memo id when it is independently decidable rather than a
   revision of the same question.
4. Registry tension notes summarize differences without resolving them.
5. A decision document must cite every memo it accepts, supersedes, combines,
   or rejects and explain the selection.
6. After promotion, freeze the memo's final pre-decision position. Further
   changes belong to the ADR/spec or a new memo.

Use a local timestamp and timezone for new entries when available. Historical
records whose exact clock time was not captured retain a date-only value; do
not invent precision retrospectively.

## Promotion To Decision

A memo becomes a decision only through a separate ADR/specification which:

- identifies the deciding user/product owner and decision date;
- states the chosen outcome and rejected alternatives;
- reconciles every registry tension relevant to the topic;
- defines scope, ownership, failure, persistence, security, and acceptance
  boundaries as applicable;
- allocates a delivery id only when repository implementation is authorized;
- updates this registry with `promoted`, `partially promoted`, `rejected`, or
  `superseded` status and a link to the decision.

## Decision History

No registered non-decision memo has yet been fully promoted into an accepted
decision. At the time MEMO-V7-003 was formed, ADR-V7-001 was a branch-local
proposal adjacent to MEMO-V7-001 and MEMO-V7-003; its specification is not part
of `main` and its branch lifecycle does not control the survival of these memos.
