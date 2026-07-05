# V6 TODO

## Current / Next

- Current status: V6 opened because V5 replay viewport/manual-anchor behavior
  proved structurally unreliable. The active decision is documented in
  `v5/docs/specs/v6-rewrite-start-decision.md`.
- Current direction: do not patch V5 replay viewport behavior further. Build V6
  around `v6/docs/specs/replay-viewport-intent.md`,
  `v6/docs/specs/replay-visible-latency.md`,
  `v6/docs/specs/pane-model.md`, and
  `v6/docs/specs/fxreplay-baseline.md`.
- Execution plan: follow `v6/docs/V6_EXECUTION_ROADMAP.md`. The roadmap expands
  the V5 formation order into smaller V6 gates and moves the known V5 failure
  classes, visible K-line delay and primary/non-primary multi-pane confusion,
  into early stop conditions.

## Next Executable Steps

### Step 1 - Skeleton And Contracts

Build only the V6 app/runtime skeleton from
`v6/docs/V6_EXECUTION_ROADMAP.md`.

Acceptance:

- `v6/index.html` boots;
- command/event smoke passes;
- no chart/replay/data coupling exists yet;
- no imports from V5 runtime implementation modules.

### Step 2 - Product Baseline Shell

Create the FXReplay-like chart route shell before internal replay work grows.

Acceptance:

- full chart-workstation surface, compact chrome, floating transport
  placeholder, and footer/status placeholder exist;
- screenshot smoke verifies it is not a landing/demo page.

### Step 3 - Session Model

Implement local replay session creation/get state with no chart/data coupling.

Acceptance:

- session smoke passes;
- runtime boundary smoke confirms session runtime does not own bars, chart, or
  viewport intent.

## Deferred Until Step 6 Passes

- multi-pane layout;
- Settings parity;
- transport polish beyond the FXReplay baseline controls;
- persistence beyond in-memory session state;
- journal/orders/analytics;
- visual polish.

## V5 Reference Policy

Allowed from V5:

- product wording and workflow lessons;
- stable V4 API usage;
- test fixture data generation;
- selected UI layout ideas after Step 6 passes.
- FXReplay-like interaction targets from specs, not V5 implementation paths.

Forbidden from V5:

- chart runtime viewport/follow/manual internals;
- replay display-window viewport restoration model;
- viewport-demand bridge ownership;
- manual anchor patches based on time range plus logical reconstruction;
- route-level orchestration that couples cursor, data loading, and chart range
  writes.
- primary/non-primary split mechanisms.
- any replay path that updates runtime cursor quickly but delays visible candle
  appearance without failing a browser latency gate.
