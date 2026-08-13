# Session — Plugin Contribution Profile And Composition Specification Acceptance

Date: 2026-08-12

Branch: `feature/v7-drawing-semantic-annotation`

Scope: record ADR-V7-006 acceptance and begin ADR-V7-005 decision review;
documentation only

## Product-Owner Decision

The product owner stated:

> ADR-V7-006 十项决策全部接受；继续审阅 ADR-V7-005 修订后的八项决策，不实施。

This explicitly accepts all ten material decisions in
`V7_PLUGIN_CONTRIBUTION_PROFILES_AND_COMPOSITION_SPEC.md` without amendment.
It does not accept ADR-V7-005 and does not authorize implementation.

## Accepted Architecture

ADR-V7-006 now binds:

- separation of Plugin Package, Contribution, Contribution Profile,
  Capability, Domain Tag, and Pack;
- exactly one primary truth/lifecycle Profile for every Profile-governed
  Contribution;
- an open, namespaced, versioned, host-governed Contribution Profile Registry;
- calculated series, anchored studies, Drawing geometry, Semantic Artifacts,
  and detectors as five initial reference Profiles rather than a closed enum;
- separately reviewed host contracts, owners, schemas, permissions, migration,
  resource rules, references, and conformance for every future Profile;
- orthogonal negotiated capabilities and non-authoritative open Domain Tags;
- multi-Contribution packages without ambiguous hybrid truth;
- distinct visual co-presence, package grouping, typed dependency, derived
  analysis, and human-promotion operations;
- unresolved survival and fail-closed activation for unknown/incompatible
  Profiles and required dependencies;
- one base envelope and identical semantics for Core/future Community
  Contributions claiming the same Profile id/version, with trust-specific
  execution and resources.

## Documentation State Updated

The acceptance pass:

- changed ADR-V7-006 from candidate to accepted binding specification;
- retained its explicit no-implementation boundary and added the exact
  product-owner acceptance record;
- moved ADR-V7-006 from the adjacent-candidate table into Decision History;
- recorded the partial promotion of MEMO-V7-001's taxonomy/composition scope;
- updated ADR-V7-004 cross-references without changing its implementation
  state;
- updated INDEX, TODO, Execution Roadmap, and Restart Handoff;
- changed ADR-V7-005's upstream references from candidate to accepted
  ADR-V7-006 while leaving all eight ADR-V7-005 decisions unaccepted.

## Current Review Gate

ADR-V7-005 is now the sole adjacent candidate in this sequence. Its revised
eight material decisions cover only Contributions claiming the accepted
architecture label `analysis.calculated-series`:

1. calculated-series ChartRegion/PlotGroup/ScaleGroup/instance concepts;
2. user-owned effective Main/new/existing-region placement;
3. structural Scale compatibility;
4. multi-Plot/multi-PlotGroup declarative output;
5. host-owned instance/layout/unresolved state;
6. exact snapshot/cutoff projection with no stale visible values;
7. same-Profile Core/future-Community contract compatibility;
8. no implementation authority and a later bounded delivery sequence.

The product owner requested review, not acceptance, of those eight decisions.

## Verification

The documentation pass completed with:

- `git diff --check` — passed;
- `node v7/tests/source-quality-harness.js` — passed with 497 production files,
  461 public exports, and 22 negative controls;
- `node v7/tests/production-architecture-harness.js` — passed with 68 modules,
  150 dependency edges, 133 construction sites, 27 writer sites, zero blocking
  findings, and 15 negative controls;
- `node v7/tests/plugin-developer-kit-harness.js` — H116 passed all 20 negative
  controls, including unchanged Community/Worker/sub-Pane rejection;
- `node v7/tests/local-plugin-package-harness.js` — H117's existing 54 negative
  groups and package/archive, transactions/storage, unpacked-security, and
  real-browser product evidence passed;
- `v7/docs/v7-harness-rules.json` remains unchanged with H117 `executable`,
  `humanReviewRequired: true`, and `acceptanceEvidence: null`;
- changed-file inspection found documentation, TODO, and this session only; no
  production, SDK, schema, catalog, fixture, dependency, or Harness-rule file
  changed.

## Non-Authorization Preserved

ADR-V7-006 acceptance does not:

- create a production or SDK Profile Registry;
- register the five architecture Profiles as wire-schema values;
- reinterpret current P0a contribution kinds or P1a/P1b Contract Profiles;
- accept ADR-V7-005 or implement calculated-series projection;
- implement MA/SMA, Fibonacci, a detector, or any named example;
- activate Installed packages or Community execution;
- add a delivery id or Harness id;
- start P1b.4 or accept H117;
- authorize P2/P3, Pine migration, AI, strategy/execution, privileged
  renderers, Marketplace, or broader product scope.
