# V7 Non-Decision Memo Registry

Status: binding documentation-governance index

Created: 2026-08-07

Last updated: 2026-08-12

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
| `MEMO-V7-001` | General futures/plugin platform, semantic tools, Setup workflow, AI, distribution, marketplace | 2026-08-01 | 2026-08-12 | partially promoted by ADR-V7-004, ADR-V7-006, and ADR-V7-005, including interface/language, Agent-authoring/Pine-migration, open Contribution-Profile/composition, and calculated-series projection boundaries; general-futures scope, Setup/AI, concrete runtime/sandbox/tooling, registry operations, commercialization, and Marketplace remain open | `V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md` |
| `MEMO-V7-002` | Second-level Replay and tick-sourced data | 2026-08-01 | 2026-08-06 | current deferral position recorded; future activation undecided | `V7_SECOND_LEVEL_REPLAY_TICK_DATA_PREDECISION_MEMO.md` |
| `MEMO-V7-003` | AI-Agent-participatory Research, Training, and Trading Review system, using semantic Study Cases/Cohorts | 2026-08-07 | 2026-08-07 12:12 PDT | partially promoted by ADR-V7-003; system boundary, autonomy, workflow ownership, and business model remain undecided | `V7_CHART_RESEARCH_SEMANTIC_CASE_AGENT_PREDECISION_MEMO.md` |
| `MEMO-V7-004` | Semantic-dataset competitive landscape, commercialization, open-source/SaaS path, market-data economics, and open-model use | 2026-08-09 | 2026-08-09 PDT | core evidence-dataset product position promoted by ADR-V7-003; hosting, shared data, branding, pricing, and market entry remain open | `V7_SEMANTIC_DATASET_MARKET_AND_COMMERCIALIZATION_PREDECISION_MEMO.md` |

## Adjacent Decision Candidates

| Candidate id | Topic | Drafted | Current status | File |
| --- | --- | --- | --- | --- |
| _None_ | — | — | ADR-V7-005 and ADR-V7-006 are accepted and recorded in Decision History | — |

Accepted decisions which promote or constrain memo content are recorded in
Decision History.

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
- ADR-V7-001 accepts `DrawingGeometry`, `DrawingEntity`, `SemanticArtifact`,
  and `ArtifactProjection`, reserving asset for tradable instruments.
- Later decisions must translate the older memo into the accepted terms rather
  than preserve two annotation state models.

### ADR-V7-004 Versus Remaining MEMO-V7-001 Scope

- ADR-V7-004 accepts Kernel/Core/Community classification, initial Core
  foundations, public derived dependencies, a host-rendered Plugin Center, and
  a thin-platform/reference-plugin/declarative-local/free-registry delivery
  sequence. Its amendment also accepts strict TypeScript authoring, compiled
  ESM artifacts, JSON-schema host-rendered settings, and unified registry/file/
  unpacked candidate channels. The 2026-08-11 amendment further accepts a
  future Agent-native Developer Kit/Harness with MCP as a bounded adapter, plus
  assisted Pine-indicator ingestion into ordinary TypeScript packages after the
  target SDK/runtime tiers exist.
- It does not accept the memo's broader general-futures repositioning, complete
  Setup/AI system, concrete loader/sandbox implementation, remote service
  operation, commercialization model, or paid Marketplace.
- Core Plugin is a product/distribution tier represented by built-in first-
  party metadata; it does not change a V7 module to descriptor `kind: "core"`
  or promote feature code into the Kernel.
- The accepted spec translates semantic annotations to ADR-V7-001's
  `SemanticArtifact` and `ArtifactProjection` terms. Remaining memo work must
  use that vocabulary and ADR-V7-003's evidence-grade dataset constraints.

### ADR-V7-006 And ADR-V7-005 Versus Remaining MEMO-V7-001 Scope

- Accepted ADR-V7-006 promotes MEMO-V7-001's distinction among calculated
  Indicators, manual Semantic contributions, detectors, Drawings, and visual
  capabilities into an open, host-governed Contribution Profile/composition
  model. It adds anchored studies as a distinct initial truth model so
  Fibonacci is not forced into Drawing, calculated-series, or Semantic state.
- Its five current Profiles are an initial reference set, not a closed enum.
  Adding a future Profile requires an accepted versioned contract, host owner,
  capability/permission boundary, migration, resource policy, and conformance;
  package code cannot self-register one.
- Accepted ADR-V7-005 is subordinate and promotes only the calculated-series
  Profile's host-mediated standard Plots, native internal Chart Regions,
  structural Scale compatibility, exact no-future frames, and same-Profile
  Core/Community ABI.
  Main versus internal region remains user-owned instance placement, so an MA
  may move off the candle region without changing truth or formula.
- Visual co-presence does not merge lifecycle or provenance. FVG/SMT Semantic
  Artifacts, Fibonacci anchored studies, Drawings, detectors, and calculated
  series retain Profile-correct owners even if one Chart adapter reuses native
  rendering helpers.
- ADR-V7-006 and ADR-V7-005 do not promote general-futures scope, complete
  Setup/AI ownership, Community execution, remote registry operation,
  privileged renderers, commercialization, or Marketplace. Those positions
  remain open.
- ADR-V7-006 acceptance changes no P1a/P1b availability, H117 state, Core
  catalog, delivery plan, or implementation authority. ADR-V7-005 acceptance
  retains the same non-authorization boundary.

### MEMO-V7-004 Versus Broad Commercialization

- ADR-V7-003 accepts private, user-owned evidence-grade semantic data as a
  first-class product output; it does not accept a SaaS, public corpus,
  marketplace, bundled market-data service, or proprietary model as the
  business model.
- MEMO-V7-004 records market-data licensing and operating cost as a major
  obstacle to an early bundled-data SaaS. This favors a local-first or
  bring-your-own-data candidate path, but no commercial path is selected.
- MEMO-V7-001's broad plugin marketplace and MEMO-V7-004's possible dataset or
  semantic-package marketplace are independently decidable. Neither can use
  the accepted package boundary as implicit Marketplace authorization.
- MEMO-V7-003's Agent learning loops may consume versioned dataset packages,
  but ADR-V7-003 makes the model/provider replaceable and prevents the Agent
  from silently becoming the source of accepted semantic truth.
- A future hosted or shared-data decision must reconcile user ownership,
  consent, deletion, source-data licensing, contributor rights, privacy,
  identity, and the local product's removable exit path.

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

| Decision id | Accepted | Promoted or constrained memo content | Remaining open content | File |
| --- | --- | --- | --- | --- |
| `ADR-V7-001` / `R13.1` | 2026-08-08 | accepts Drawing/Semantic Annotation terminology, ownership, package, provenance, interaction, and projection foundations discussed broadly by MEMO-V7-001 and required by MEMO-V7-003 | general plugin SDK/marketplace and complete Research/Training/Review product remain open | `V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md` |
| `ADR-V7-002` | 2026-08-08 | accepts official Primitive-pattern adaptation while rejecting reviewed community packages as parallel V7 owners | Indicator reuse and later community/plugin distribution remain separately undecided | `V7_COMMUNITY_REUSE_GATE_FOR_R13_6.md` |
| `ADR-V7-003` | 2026-08-09 | partially promotes MEMO-V7-003's evidence/case/cohort constraints and MEMO-V7-004's evidence-grade semantic dataset product position, user ownership, human-governed AI, and local-first initial boundary | complete learning-system ownership, commercial model, hosted service, public/shared datasets, branding, pricing, and implementation remain open | `V7_EVIDENCE_GRADE_SEMANTIC_DATASET_PRODUCT_DECISION.md` |
| `ADR-V7-004` | 2026-08-10; amended 2026-08-11 | partially promotes MEMO-V7-001's Kernel/Core/Community taxonomy, FVG/MA/SMA/BSL/Fib Core classification, declared derived dependencies, Plugin Center experience, unified install/developer channels, host-rendered settings, strict TypeScript/ESM/JSON Schema model, Agent-native Developer Kit/Harness and MCP boundary, assisted Pine-to-TypeScript indicator migration, stricter trust tiers, and thin-platform/local/free-registry sequence | general-futures scope, Setup/AI system, concrete loader/sandbox/Developer-Kit/MCP/Pine implementation, remote registry operations, commercialization, and paid Marketplace remain open | `V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md` |
| `ADR-V7-006` | 2026-08-12 | promotes MEMO-V7-001's contribution taxonomy into an open host-governed Profile registry; accepts Package/Contribution/Profile/Capability/Domain-Tag/Pack separation, five non-exhaustive initial Profiles, multi-Contribution packages, typed host composition, unresolved survival, and same-Profile Core/Community semantics | no production/SDK registry, Profile implementation, calculated-series projection, Community execution, general-futures scope, Setup/AI system, remote registry, commercialization, or Marketplace is authorized | `V7_PLUGIN_CONTRIBUTION_PROFILES_AND_COMPOSITION_SPEC.md` |
| `ADR-V7-005` | 2026-08-12 | promotes MEMO-V7-001's calculated-series projection boundary; accepts user-owned Main/internal-Chart-region placement, Plot Groups and standard Plots, structural Scale compatibility, exact no-stale projection frames, host-owned instance/layout/unresolved state, sole Chart writing, and same-Profile Core/Community semantics | no production/SDK Profile registration, MA/SMA or other Indicator implementation, Community execution, delivery/Harness id, P1b.4, H117 acceptance, general-futures scope, Setup/AI system, remote registry, commercialization, or Marketplace is authorized | `V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md` |

No registered memo has been fully promoted and closed. MEMO-V7-001,
MEMO-V7-003, and MEMO-V7-004 are partially promoted; their explicitly
unresolved questions remain discoverable here and authorize no implementation.
