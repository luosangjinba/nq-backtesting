# Session — Generic Indicator Projection And Chart Region Specification Draft

Date: 2026-08-12

Status: ADR-V7-005 candidate drafted; product-owner acceptance pending; no
implementation authorized

## Authority

After accepting the corrected P1b.3 Plugin Center review and deliberately
pausing P1b.4, the product owner identified that RSI, ATR, MACD, and similar
Indicators commonly use internal chart regions, while an MA normally shown on
the candle region may also be moved to an internal region by user preference.
The product owner directed a generic capability suitable for custom Indicator
Plugins and authorized specification drafting only.

## Draft Outcome

`docs/V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md` now proposes:

- stable Workspace Pane versus internal `ChartRegion` terminology;
- `IndicatorInstance`, `PlotGroup`, standard `Plot`, `ScaleGroup`, and exact
  `IndicatorProjectionFrame` contracts;
- plugin-supplied defaults with host/user-owned effective placement;
- structural Scale compatibility rather than concrete Indicator branches;
- multi-Plot and multi-region output through one generic contract;
- exact no-future inputs and projection frames tied to the accepted Pane
  snapshot and Replay cutoff;
- host-owned instance/layout persistence, unresolved survival, reversible
  projection, and bounded resources;
- one semantic SDK/result/settings/lifecycle ABI for Core and future Community
  Indicator Plugins;
- sole native pane/Series mutation by the existing Chart adapter;
- separately gated trusted MA, generic multi-Plot/layout, and later Community
  Worker integration slices after candidate acceptance.

The draft records eight material decisions for product-owner review.

## Evidence Reviewed

- the accepted ADR-V7-004 Core/Community plugin model and P1a/P1b availability;
- the current `IndicatorModule` immutable no-future/declarative-output boundary;
- R6.5's tested Lightweight Charts 5.2 native Pane versus V7 Workspace Pane
  decision;
- official Lightweight Charts Pane, Chart, Pane API, and Indicator examples;
- the accepted community-reuse audit, including calculation-only candidate
  treatment for `lightweight-charts-indicators`;
- MEMO-V7-001's earlier calculated-Indicator and host-mediated Chart
  contribution proposal.

## Non-Authorization

This draft adds documentation only. It does not add or change production code,
SDK types, JSON Schemas, catalogs, manifests, fixtures, Harness rules,
dependencies, Indicator execution, native panes, or product UI. `ADR-V7-005`
is not accepted, no delivery/Harness id is allocated, MA/SMA is not
implemented, named RSI/ATR/MACD examples are not classified, Community
execution remains unavailable, P1b.4 remains paused, and H117 remains
executable but unaccepted.

## Verification

- `node v7/tests/source-quality-harness.js` passes with 497 production files,
  461 public exports, and 22 negative controls;
- `node v7/tests/production-architecture-harness.js` passes with 68 modules,
  150 dependency edges, 133 construction sites, 27 writer sites, and zero
  blocking findings;
- H116 passes all 20 negative controls, including the unchanged rejection of an
  unauthorized Community Worker/subpane profile;
- H117 passes its existing 54 negative groups and browser/storage evidence, but
  `v7-harness-rules.json` remains unchanged at `state: executable`,
  `humanReviewRequired: true`, and `acceptanceEvidence: null`;
- the change set contains only documentation, TODO, and this session record;
  no production, SDK, catalog, schema, Harness-rule, fixture, or dependency file
  changed;
- `git diff --check` passes.

## Next Gate

Review and accept, reject, or amend the candidate's eight material decisions.
Do not write an implementation specification or begin any implementation slice
without a subsequent explicit product-owner instruction.
