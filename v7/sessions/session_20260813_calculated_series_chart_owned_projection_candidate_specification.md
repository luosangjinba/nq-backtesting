# V7 Calculated-Series Chart-Owned Projection Candidate Specification

Date: 2026-08-13

Branch: `feature/v7-drawing-semantic-annotation`

Scope: documentation-only candidate; no implementation, delivery id, Harness
id, runtime availability, or product surface

## Product-Owner Direction

> 起草 V7 Calculated-Series Chart-Owned Projection Slice 候选规格；不实施，
> 不分配 P1c.2/H119，不启动 MA/SMA、实例/持久化/UI、Community/Worker 或
> P1b.4，不变更 H117。

## Inputs Reviewed

- accepted ADR-V7-006 Contribution Profile/composition boundaries;
- accepted ADR-V7-005 generic calculated-series projection and Chart-region
  architecture;
- accepted P1c.1/H118 pure contracts and evidence;
- existing sole Chart Snapshot Application participant and reversible
  Lightweight Charts adapter stage;
- accepted Annotation Chart-projection transaction as a removable-boundary
  precedent;
- pinned Lightweight Charts 5.2.0 pane, Series, Price Scale, price-line, and
  Primitive APIs and official band-plugin example;
- current awesome-tradingview inventory and the listed
  `lightweight-charts-indicators` project.

## Candidate Produced

`../docs/V7_CALCULATED_SERIES_CHART_OWNED_PROJECTION_SLICE_SPEC.md` now proposes:

- a removable, package-neutral complete-surface projection transaction;
- an adapter-internal native bridge that exposes no Chart, pane, Series,
  Price Scale, Primitive, DOM, Canvas, callback, or native-id handle;
- exact branded candidate closure against the accepted candle/Workspace/
  Replay snapshot and all visible resolved calculated-series frames;
- stable logical resource identities for regions, scales, anchors, Plots,
  bands, and reference lines within one Lightweight Chart;
- structural Scale and standard Plot realization with explicit unsupported
  cases rather than silent coercion;
- inert preparation, complete application, receipt-bound exact rollback,
  deferred destructive finalization, poison-on-unprovable-restore, and
  idempotent disposal;
- the same state machine for outer-workspace staging and exact same-snapshot
  late settlement;
- bounded projection ceilings, deterministic diagnostics, and a future
  synthetic real-Chromium conformance fixture;
- ten material decisions for product-owner review.

## Reuse Decision

The candidate uses official Lightweight Charts pane/Series/Scale operations
and may adapt the official band example's coordinate, segmented-fill, and
autoscale rendering pattern. It does not adopt the example's calculation or
data-subscription ownership.

The ecosystem `lightweight-charts-indicators` package was not selected. Its
documented direct Chart writes, `overlay` placement switch, second-chart RSI
pattern, concrete named-Indicator registry, and mixed visual concerns do not
fit V7's sole writer, same-chart region, user placement, Profile separation,
or reversible complete-surface transaction contracts. Individual formula
research remains a separate future decision.

## Preserved Boundaries

- the existing Chart Snapshot Application remains the sole outer Chart
  transaction participant;
- the Lightweight Charts adapter remains the sole native writer;
- no `P1c.2` or H119 was allocated or registered;
- no production, SDK, schema, catalog, fixture, test, runtime, adapter,
  persistence, route, UI, dependency, or package file was changed;
- no named Indicator, MA/SMA, calculation executor, live instance owner,
  Community/Worker execution, generic layout UI, or P1b.4 work was started;
- H117 remains `executable`, human-review-required, unaccepted, and carries its
  prior unchanged evidence state.

## Documentation State

- the candidate specification is under review and not accepted;
- TODO, INDEX, execution roadmap, task numbering, restart handoff, and both
  upstream calculated-series specifications point to the candidate without
  treating it as an authorized delivery;
- no implementation or acceptance claim is made by this record.

## Verification

The bounded documentation change passed:

- `node v7/tests/source-quality-harness.js`;
- `node v7/tests/production-architecture-harness.js`;
- `node v7/tests/architecture-hardening-harness.js`;
- `node v7/tests/calculated-series-pure-contract-harness.js` — H118 remained
  passed and reported H117 unchanged;
- `node v7/tests/plugin-developer-kit-harness.js` — H116 remained passed;
- `node v7/tests/local-plugin-package-harness.js` — H117 remained executable
  with its 54 negative controls and visible review still required;
- `git diff --check`.

No Harness registry or baseline was refreshed.

## Exact Next Step

Review the ten candidate material decisions and accept, amend, or reject them.
Acceptance alone would bind the specification but still would not allocate
`P1c.2`/H119 or authorize implementation. A later delivery would require a
separate explicit product-owner instruction.
