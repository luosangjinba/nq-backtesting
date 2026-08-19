# Session — Study Collection Dashboard, Chart Application, And Visual Grammar Pre-Decision Memo

Date: 2026-08-18

Time: 23:25 PDT

Branch: `feature/v7-drawing-semantic-annotation`

Status: MEMO-V7-005 captured and registered; discussion only; no decision,
delivery/Harness id, or implementation authorized

## Product-Owner Input

The product owner added a future product direction:

- every Setup-validation, public-trader-Setup, actual-trade, hindsight-review,
  or similar dataset should have a Dashboard with appropriate Calendar, win-
  rate, capital-path, and auxiliary information;
- datasets should not appear on Charts by default and should require explicit
  application;
- several datasets should be applicable simultaneously, including actual
  trades beside hindsight/counterfactual trades;
- Setup-free questions such as 5m EQL/EQH sweep probability and 4h FVG respect
  probability need a research model even though their final workflow was not
  yet selected;
- Entry, Stop Loss, Target/Exit, a `4h FVG respected` event dataset, and
  explanatory text require one uniform explicit Chart-element standard;
- these solutions should be written into a pending-decision Memo.

## Inputs Reviewed

- accepted ADR-V7-001 Drawing Geometry / Semantic Artifact / declarative
  projection / adapter-native Render Primitive separation;
- accepted ADR-V7-003 evidence-grade data, no-future provenance, Study Case/
  Cohort/Analysis, raw-context drill-down, and user-owned data constraints;
- accepted ADR-V7-005/006 calculated-series and Contribution Profile ownership,
  visual co-presence, and no cross-feature control rules;
- accepted H114 manual FVG Rectangle/midpoint/label projection and unresolved-
  provider lifecycle;
- accepted P1c.3/H120 SMA/calculated-series owner and Chart projection path;
- the pending FVG + SMA Validation Campaign / Study Case Demo candidate;
- the future Segment/Ray/Infinite Line, Circle, and Arc requirements;
- MEMO-V7-003's Research/Training/Trading Review and Universe/Setup/Outcome/
  Study Case/Cohort model;
- V7's pinned Lightweight Charts `5.2.0` package and current Chart-owner rules.

## External Capability Review

Following the repository's chart-planning rule, `agent-reach` was used to
inspect current official and awesome-tradingview sources. Exa was unavailable
without an API key and `gh` was unauthenticated, so the documented Jina/public-
GitHub fallback was used. The review found:

- official `createSeriesMarkers` supports time, optional exact price, id, text,
  size, color, position, and supported marker shapes;
- the Series API supports horizontal Price Lines and adapter attachment of
  custom Series Primitives;
- official Primitive APIs support layered Canvas visuals and scale labels with
  lifecycle hooks;
- official examples include Anchored Text, Partial Price Line, Rectangle,
  Tooltip, Trend/Vertical Line, alerts, and session highlighting;
- the current awesome-tradingview list exposes no uniform Entry/Stop/respect/
  multi-dataset business visual grammar or compatible source owner.

These are implementation patterns only. No external package or dependency was
added, and native APIs remain adapter-private.

## Memo Produced

`../docs/V7_STUDY_COLLECTION_DASHBOARD_CHART_APPLICATION_VISUAL_GRAMMAR_PREDECISION_MEMO.md`
is registered as `MEMO-V7-005`. It records:

- native-owner-referencing `EvidenceCollection` descriptors/snapshots rather
  than a monolithic copied dataset store;
- capability-aware Dashboard metrics which distinguish unavailable/not-
  applicable/incomplete/zero and never invent trade capital assumptions;
- default-off explicit Apply-to-chart, pinned exact snapshot bindings,
  simultaneous independent Collections, and actual-versus-counterfactual
  comparison through exact relations only;
- portable `ChartSemanticElement` intent under the sole Chart writer;
- separate semantic-role, evidence-mode, Collection-identity, and availability
  visual dimensions with color-independent accessibility;
- candidate Entry, planned/actual Stop, Target, Exit, EQL/EQH sweep, FVG
  respect/invalidation, observation-window, and explanatory-text compositions;
- a specific rule that `4h FVG respected` is a Study-owned event marker/
  connector/explanation beside the FVG owner's source projection, never a
  duplicate/reconstructed FVG Rectangle;
- evidence-linked business text versus future free-form `geometry.text`, with
  compact callouts and full bounded plain text in an Inspector;
- Setup-free `PhenomenonStudy` definitions for universe, event, outcome,
  context, sampling/completeness, observation, Cohort, and deterministic
  analysis;
- lifecycle, removal, density, z-order, accessibility, owner, evidence, and
  promotion requirements;
- fifteen open product decisions.

## Preserved Boundaries

- the pending FVG + SMA candidate and its ten decisions were not edited,
  accepted, or expanded;
- no production source, manifest, module, schema, persistence/state-sync,
  route, UI, fixture, Harness registry, plugin, algorithm, or dependency was
  changed;
- no delivery or Harness id was allocated;
- P1c.4/H121 and P1b.4 remain unallocated/paused;
- no Dashboard, Collection, Journal, Research, Phenomenon detector, Chart
  application/projection, text tool, Dataset Builder, Community/Worker, or AI
  implementation was started;
- H117 remains `executable`, human-review-required, unaccepted, with
  `acceptanceEvidence: null`.

## Documentation Updated

- the new MEMO-V7-005 file;
- `../docs/V7_NON_DECISION_MEMO_REGISTRY.md`;
- `../docs/INDEX.md`;
- `../TODO.md`;
- `../docs/V7_EXECUTION_ROADMAP.md`;
- `../docs/V7_RESTART_HANDOFF.md`;
- `../docs/V7_TASK_NUMBERING.md`;
- this capture record.

## Verification

The bounded documentation change passed:

- `node v7/tests/architecture-hardening-harness.js` — 120 rules and 15
  negative controls;
- `node v7/tests/architecture-boundary-harness.js`;
- `node v7/tests/production-architecture-harness.js` — 76 modules, 174 edges,
  143 construction sites, 31 writer sites, zero blocking findings, and 15
  negative controls;
- `node v7/tests/production-module-assembly-harness.js` — 76 public entries,
  33 lifecycle modules, and 53 optional-removal cases;
- `node v7/tests/production-writer-closure-harness.js` — 25 surfaces, 31
  observed writer files, and 8 negative controls;
- `node v7/tests/deployed-runtime-architecture-harness.js`;
- `node v7/tests/source-quality-harness.js` — 582 production files, 558 public
  exports, and 22 negative controls;
- `node v7/tests/server-state-sync-harness.js`;
- `node v7/tests/plugin-developer-kit-harness.js` — H116 passes;
- `node v7/tests/local-plugin-package-harness.js` — H117 passes all 54 frozen
  negative controls plus contract, transaction, storage, unpacked-security,
  and real-browser product evidence without changing its governance state;
- `node v7/tests/calculated-series-pure-contract-harness.js` — H118 passes and
  reports H117 unchanged;
- `node v7/tests/calculated-series-chart-projection-harness.js` — H119 passes;
- `node v7/tests/core-moving-averages-harness.js` — accepted H120 formula and
  real production-route browser evidence pass while reporting H117 unchanged.

No generated Developer Kit or source-quality baseline required refresh. Final
staged `git diff --check` is required before commit.

## Next Decision Boundary

The exact pending product action remains review of the ten decisions in the
FVG + SMA Demo candidate. MEMO-V7-005 is a separate non-decision backlog. A later
instruction may request review/promotion of its fifteen questions, but neither
the Memo nor such review alone may allocate implementation.
