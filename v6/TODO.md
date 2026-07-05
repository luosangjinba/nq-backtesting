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
- Latest completed step: Step 12 - Single-Pane Default Wall Replay. The
  implementation adds a default-wall replay domain/runtime, registers it in the
  V6 app, and gates real chart Next visibility so latest candles stay on the
  default wall while old candles push left without fetch on the visible path.

## Next Executable Steps

### Step 13 - Manual Wall Replay

Implement native manual-wall replay behavior: drag or wheel establishes a
manual replay wall and subsequent Next/Play preserves that wall instead of
falling back to the default wall.

Acceptance:

- latest candle stays at the manual wall;
- display-window loading cannot alter viewport intent;
- browser tests assert logical offset/span, not only cursor text.

## Completed Steps

### Step 1 - Skeleton And Contracts

Completed in commits:

- `8e44281 feat(v6): scaffold workstation shell`
- `5ca0d75 feat(v6): add runtime core`
- `98847cb test(v6): add step one smoke gates`

Verification:

- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 2 - Product Baseline Shell

Completed in commits:

- `6c2611a feat(v6): expand workstation shell markup`
- `e9649f1 feat(v6): style product baseline shell`
- `0c708d2 test(v6): gate product baseline shell`

Verification:

- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 3 - Session Model

Completed in commits:

- `dfd4ed5 feat(v6): add session domain repository`
- `9f6cd8a feat(v6): register session runtime`
- `8b80d4e test(v6): gate session runtime boundary`

Verification:

- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 4 - Bar Data Runtime

Completed in commits:

- `a790062 feat(v6): add bar data window cache`
- `7693073 feat(v6): add v4 bars adapter`
- `dc7f958 feat(v6): register bar data runtime`
- `a853113 test(v6): gate bar data runtime`

Verification:

- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-adapter-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 5 - Replay Runtime

Completed in commits:

- `0b246d8 feat(v6): add replay state domain`
- `602d6b7 feat(v6): register replay runtime`
- `7150114 test(v6): gate replay runtime`

Verification:

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 6 - Unified Pane Model

Completed in commits:

- `72c2e71 feat(v6): add unified pane model`
- `9259e68 feat(v6): register pane runtime`
- `228aadb test(v6): gate unified pane model`

Verification:

- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 7 - Viewport Intent Domain

Completed in commits:

- `993697d feat(v6): add viewport intent domain`
- `db46ab5 feat(v6): add viewport projection domain`
- `1c2e05b test(v6): gate viewport intent invariants`

Verification:

- `node v6/tests/viewport-intent-domain-smoke.js`
- `node v6/tests/viewport-projection-smoke.js`
- `node v6/tests/viewport-intent-invariant-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 8 - Chart Data Runtime

Completed in commits:

- `1fd4c2f feat(v6): add pane chart data store`
- `799f205 feat(v6): register chart data runtime`
- `a3bd5ee test(v6): gate chart data runtime`
- `5ac957c test(v6): enforce chart data boundaries`

Verification:

- `node v6/tests/chart-data-domain-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 9 - Chart Viewport Runtime

Completed in commits:

- `61f9659 feat(v6): add chart viewport store`
- `6daf30a feat(v6): register chart viewport runtime`
- `03cb36a test(v6): gate chart viewport runtime`
- `1e23714 test(v6): enforce chart viewport boundaries`

Verification:

- `node v6/tests/chart-viewport-store-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 10 - Chart Engine Adapter

Completed in commits:

- `0837d5d feat(v6): add lightweight chart adapter`
- `60519b1 test(v6): verify chart engine browser adapter`
- `bf132cc test(v6): enforce chart engine adapter boundaries`

Verification:

- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 11 - Visible Latency Harness

Completed in commits:

- `3a64a56 feat(v6): add visible latency timeline`
- `8ef6cf8 test(v6): add cache-hit visible latency browser smoke`
- `df59b93 test(v6): enforce visible latency boundary`

Verification:

- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 12 - Single-Pane Default Wall Replay

Completed in commits:

- `2d67dfe feat(v6): add default wall replay domain`
- `dd79182 feat(v6): add default wall replay runtime`
- `3387e05 feat(v6): register default wall runtime`
- `9f22053 test(v6): gate default wall replay visibility`
- `91a89ba test(v6): enforce default wall boundaries`

Verification:

- `node v6/tests/default-wall-replay-domain-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Deferred Until Later Gates

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
