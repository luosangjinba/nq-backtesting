# Session — Calculated-Series Pure Contract Specification Acceptance

Date: 2026-08-12

Branch: `feature/v7-drawing-semantic-annotation`

Scope: accept all ten pure-contract decisions; documentation only

## Product-Owner Decision

The product owner stated:

> 接受十项决策，下一步计划做什么？

This accepts all ten material decisions in
`V7_CALCULATED_SERIES_PURE_CONTRACT_SLICE_SPEC.md` without amendment. Material
decision 10 explicitly withholds implementation authority.

## Accepted Boundary

The acceptance binds:

- separate future `contribution-profile-contract` and
  `calculated-series-contract` pure owners;
- the host-governed `analysis.calculated-series@1.0.0` contract descriptor
  design while execution availability remains unchanged;
- exact host-owned P0a Contribution binding without treating `kind: indicator`
  as a Profile or runtime grant;
- exact Definition, current-Workspace-Pane input, standard Plot/Style,
  structural Scale, instance/ChartRegion/ScaleGroup, result/frame, provenance,
  diagnostic, limit, and declarative migration contracts;
- closed, bounded, deeply immutable, canonically serialized values;
- inert unresolved survival and fail-closed migration;
- a future independent headless gate allocated only with separate
  implementation authorization;
- the pure-contract → Chart projection → trusted MA/SMA dependency order.

## Documentation State Updated

The acceptance pass:

- changed the pure-contract document from candidate to accepted binding
  specification and added the exact acceptance quote;
- synchronized ADR-V7-005, ADR-V7-006, Architecture, Product/Scope, the Core/
  Community model, INDEX, TODO, Execution Roadmap, and Restart Handoff;
- recorded pure-contract implementation as the next eligible but separately
  unauthorized step;
- allocated no delivery id or Harness id.

## Non-Authorization Preserved

Acceptance does not:

- add either pure module, an export, SDK value, JSON Schema, catalog, fixture,
  manifest field, migration, diagnostic, generated release, or Harness rule;
- make `analysis.calculated-series` executable or make Indicator/
  `subpane.runtime` available in P1a/P1b;
- create calculation, instance, persistence, projection, Chart, UI, Worker, or
  package activation behavior;
- implement or classify MA/SMA, RSI, ATR, MACD, Volume, or another product
  Indicator beyond existing decisions;
- start the Chart-owned projection slice, P1b.4, P2, P3a, P3b, or Marketplace;
- accept, activate, or reclassify H117.

P1b.4 remains paused. H117 must remain `executable`,
`humanReviewRequired: true`, and `acceptanceEvidence: null`.

## Verification

The final documentation pass completed:

- `git diff --check` passed;
- the source-quality Harness passed across 497 production files, 461 public
  exports, and 22 negative controls;
- the production-architecture Harness passed across 68 modules, 150 dependency
  edges, 133 construction sites, 27 writer sites, and 15 negative controls,
  with zero blocking findings;
- H116 passed all 20 negative controls, including the unchanged rejection of
  unauthorized Community/Worker/sub-pane availability;
- H117 passed all 54 negative groups plus its browser, IndexedDB/storage, and
  product-surface evidence;
- `v7-harness-rules.json` remains unchanged, with H117 still `executable`,
  `humanReviewRequired: true`, and `acceptanceEvidence: null`;
- the changed-file audit contains only documentation, `v7/TODO.md`, and this
  session record; no production, SDK, schema, catalog, fixture, manifest,
  dependency, generated release, or Harness-rule file changed.

## Next Eligible Plan

No implementation is currently authorized. If the product owner later
authorizes the accepted pure-contract implementation, the bounded plan is:

1. allocate one delivery id and the next available independent Harness id;
2. implement `contribution-profile-contract` with branded descriptor/ref,
   pinned-registry resolution, compatibility, and diagnostics;
3. implement `calculated-series-contract` in focused Definition, Plot/Style,
   Scale, instance/document, result/frame/provenance, and migration helpers;
4. add exact JSON Schemas, host catalogs, canonical serialization, structural/
   byte ceilings, and synthetic positive/negative fixtures;
5. prove P0a exact-binding compatibility and unchanged P0a/P0b/P1a/P1b/H117
   behavior through the new headless gate and full regressions;
6. conduct a focused human contract/evidence review and stop for acceptance.

That future implementation must not include Chart projection, a live instance
or persistence owner, SDK execution availability, a real Indicator, Community/
Worker execution, P1b.4, or H117 acceptance. Only after the pure-contract
implementation is accepted may the Chart-owned projection slice be specified.
