# Session — Calculated-Series Projection And Chart Region Specification Acceptance

Date: 2026-08-12

Branch: `feature/v7-drawing-semantic-annotation`

Scope: record ADR-V7-005 acceptance; documentation only

## Product-Owner Decision

The product owner stated:

> ADR-V7-005 修订后的八项决策全部接受；不实施。

This explicitly accepts all eight revised material decisions in
`V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md` without amendment.
The final clause explicitly withholds implementation authority.

## Accepted Architecture

ADR-V7-005 now binds:

- scope limited to Contributions claiming the accepted architecture label
  `analysis.calculated-series`;
- separation of independent `WorkspacePane`, host-stable `ChartRegion`, and
  transient native Lightweight Charts pane resources;
- `CalculatedSeriesInstance`, `PlotGroup`, `Plot`, `ScaleGroup`, and exact
  `CalculatedSeriesProjectionFrame` concepts;
- definition-supplied stable Plot semantics/defaults and user-owned effective
  Main/new/existing-region placement;
- structural, versioned Scale compatibility instead of Indicator-name,
  package, or Domain-Tag branches;
- multi-Plot and independently placeable multi-PlotGroup output without DOM,
  Canvas, custom-renderer, or native Chart authority;
- host-owned instance/layout persistence and unresolved survival;
- exact Pane-snapshot/Replay-cutoff frames which remove stale values and expose
  honest pending/empty/unavailable/error states;
- the same Profile SDK/result/settings/lifecycle semantics for Core and future
  Community Contributions, with trust-specific execution and resources;
- the existing Chart adapter as the sole native pane/Series/Scale writer.

## Relationship To ADR-V7-006

Accepted ADR-V7-006 remains the upstream open Contribution Profile and
composition decision. ADR-V7-005 is its calculated-series projection
subordinate. It does not make every plugin an Indicator, reduce anchored
studies/Drawings/Semantic Artifacts/detectors to standard Plots, create one
universal visual-result ABI, or close the Profile registry to its five initial
reference Profiles.

## Documentation State Updated

The acceptance pass:

- changed ADR-V7-005 from candidate to accepted binding specification;
- retained its exact no-implementation boundary and added the product-owner
  acceptance quote;
- moved ADR-V7-005 from the adjacent-candidate registry into Decision History;
- recorded its partial promotion of MEMO-V7-001's calculated-series scope;
- updated ADR-V7-006 and ADR-V7-004 cross-references;
- updated Architecture, Product/Scope, INDEX, TODO, Execution Roadmap, and
  Restart Handoff;
- allocated no implementation delivery id or Harness id.

## Verification

The final documentation pass completed:

- `git diff --check` passed;
- the source-quality Harness passed across 497 production files, 461 public
  exports, and 22 negative controls;
- the production-architecture Harness passed across 68 modules, 150 dependency
  edges, 133 construction sites, 27 writer sites, and 15 negative controls,
  with zero blocking violations;
- H116 passed all 20 negative controls, including the unchanged rejection of
  unauthorized Community/Worker/sub-pane availability;
- H117 passed all 54 negative groups plus its browser, storage, and product
  evidence regressions;
- `v7-harness-rules.json` remains unchanged, with H117 still `executable`,
  `humanReviewRequired: true`, and `acceptanceEvidence: null`;
- the changed-file audit contains only documentation, `v7/TODO.md`, and this
  session record; no production, SDK, schema, catalog, fixture, dependency, or
  Harness-rule file changed.

## Non-Authorization Preserved

ADR-V7-005 acceptance does not:

- register `analysis.calculated-series` in production or SDK schemas/catalogs;
- create a calculation runtime, instance owner, projection coordinator,
  persistence adapter, ChartRegion adapter, UI, or test fixture;
- allocate a delivery id or Harness id;
- implement MA/SMA or classify/implement RSI, ATR, MACD, Volume, or another
  example;
- change P0a/P0b/P1a/P1b contracts or availability;
- activate Installed packages or Community execution;
- start P1b.4 or accept H117;
- authorize P2/P3, Pine migration, privileged renderers, Marketplace, or
  broader product scope.

## Next Boundary

No implementation step is authorized. Any future work must begin with a new,
explicit product-owner instruction and a bounded specification. If later
authorized, the accepted dependency order remains pure Profile/definition/
instance/result contracts, Chart-owned projection, trusted Core MA/SMA vertical
slice, generic multi-Plot/layout, and only then separately authorized Community
Worker integration.
