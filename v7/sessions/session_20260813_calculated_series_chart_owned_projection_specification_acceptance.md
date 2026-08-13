# V7 Calculated-Series Chart-Owned Projection Specification Acceptance

Date: 2026-08-13

Branch: `feature/v7-drawing-semantic-annotation`

Scope: specification acceptance only; no implementation, delivery id, Harness
id, runtime availability, or product surface

## Product-Owner Decision

After reviewing all ten candidate decisions, the product owner directed:

> 接受第 1–6、9–10 项，并按审阅建议修订第 7、8 项；不实施。

## Accepted Outcome

`../docs/V7_CALCULATED_SERIES_CHART_OWNED_PROJECTION_SLICE_SPEC.md` is now the
binding specification for the second ADR-V7-005 dependency.

Decisions 1–6 and 9–10 are accepted as drafted. They bind:

- one removable package-neutral complete-surface projection transaction;
- one bounded adapter-internal native bridge beneath the existing sole Chart
  Snapshot Application;
- complete branded Pane-surface candidates and no partial Plot patches;
- one Lightweight Chart with stable Main/internal-region resources;
- built-in standard Series plus host-owned band/reference-line mechanics;
- structural Scale realization with exact rejection rather than coercion;
- no stale resources for hidden, unresolved, or non-ready states and complete
  `setData()` replacement for the first slice;
- a future independently numbered deterministic, real-Chromium, rollback,
  interaction, owner-invariance, and focused-human gate;
- no authority granted merely by specification acceptance.

## Accepted Decision 7 Amendment

Prepare remains inert; apply, rollback, and finalize retain exact receipt-bound
transaction semantics. If restoration cannot be proved, the calculated-series
surface must stop writing and report the fault to the sole Chart Snapshot
Application. Before another Chart command, that owner must either complete an
adapter-owned teardown/remount from its last accepted Chart snapshot or poison
the current Chart activation. Uncertainty in shared native pane/Scale state
cannot be reported as a merely local failure. Accepted candle data, semantic
ownership, and writer revision remain unchanged.

## Accepted Decision 8 Amendment

`workspace-stage` and exact `same-snapshot-settlement` use the same complete-
surface state machine and are admitted and sequenced only by the Chart Snapshot
Application. Settlement is a Chart-owned local child transaction, not another
global Workspace participant. A calculator, Contribution, package, or
projector cannot bypass the Chart owner to invoke the native adapter. A newer
candle/Workspace identity rejects stale settlement before any side effect.

## Preserved Non-Authorization Boundary

- no `P1c.2` or H119 was allocated, registered, or inferred;
- no projection transaction, adapter bridge, pane, Series, Scale, price line,
  Primitive, fixture, test, schema, catalog, runtime, or production route was
  implemented;
- no calculation executor, named Indicator, MA/SMA, live instance owner,
  persistence, settings/layout UI, Community/Worker execution, P1b.4, or
  product integration was started;
- H117 remains `executable`, `humanReviewRequired: true`, and
  `acceptanceEvidence: null`;
- P1c.1/H118 remains the latest completed calculated-series delivery and
  accepted Harness gate.

## Documentation Updated

- accepted Chart-owned projection specification;
- TODO, INDEX, execution roadmap, task numbering, restart handoff, and both
  upstream calculated-series specifications;
- this durable specification-acceptance record.

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

No Harness registry or generated baseline was refreshed.

## Exact Next Boundary

No repository-changing next step is authorized by this acceptance. A future
implementation would require a separate explicit product-owner instruction to
allocate `P1c.2` and H119. MA/SMA cannot begin until that separately authorized
projection implementation and its focused gate close, followed by another
explicit instruction.
