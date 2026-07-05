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
- Latest completed step: Step 30 - Journal Workflow Entry Surface. The
  implementation adds a bounded Journal panel that uses existing journal and
  journal-persistence commands without mutating chart/replay/data/viewport
  state.

## Next Executable Steps

### Step 31 - Workflow Surfaces Readiness Audit

Audit the newly added workflow entry surfaces before adding deeper workflow
features or visual polish.

Acceptance:

- Sessions, Replay, Journal, Settings, Readiness, Transport, and Status surfaces
  have explicit command/event boundaries;
- no workflow UI imports feature runtime internals or chart/data/viewport
  ownership paths;
- the next implementation target is narrowed from audit results.

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

### Step 13 - Manual Wall Replay

Completed in commits:

- `0b3ee42 feat(v6): preserve manual wall projection in replay`
- `fc6a3ad test(v6): keep manual wall through display windows`
- `10718ab test(v6): gate manual wall replay visibility`
- `83daf7e test(v6): cover manual wall range measurement`

Verification:

- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/manual-wall-display-window-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/viewport-projection-smoke.js`
- `node v6/tests/viewport-intent-domain-smoke.js`
- `node v6/tests/viewport-intent-invariant-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 14 - Replay Transport Controls

Completed in commits:

- `acdb530 feat(v6): add replay transport controller`
- `d2da1a1 feat(v6): mount replay transport controls`
- `37a7865 test(v6): verify replay transport dispatch`
- `2a112ac test(v6): enforce replay transport boundaries`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 15 - Chart Status And OHLC

Completed in commits:

- `8b7e65f feat(v6): add status readout model`
- `7844ce9 feat(v6): mount read-only status readouts`
- `29c4d69 test(v6): verify read-only status updates`
- `a0f80c8 test(v6): enforce status readout boundaries`

Verification:

- `node v6/tests/status-readout-model-smoke.js`
- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 16 - Display Timeframe Single-Pane

Completed in commits:

- `45175eb feat(v6): add display timeframe projection`
- `d4c2b5b feat(v6): add pane display timeframe command`
- `47a8f1f feat(v6): add display timeframe runtime`
- `af5d9de feat(v6): mount display timeframe control`
- `76b840a test(v6): verify display timeframe selection`
- `93565b2 test(v6): enforce display timeframe boundaries`

Verification:

- `node v6/tests/display-timeframe-projection-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 17 - Layout Runtime Skeleton

Completed in commits:

- `30f73f8 feat(v6): add layout model store`
- `ab02217 feat(v6): add layout runtime`
- `80087de feat(v6): register layout runtime`
- `862219b test(v6): enforce layout boundaries`

Verification:

- `node v6/tests/layout-model-smoke.js`
- `node v6/tests/layout-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 18 - Multi-Pane Chart Hosts

Completed in commits:

- `375a810 feat(v6): add chart host manager`
- `ec0c89d feat(v6): fan out default wall panes`
- `48830d1 test(v6): verify multi pane chart hosts`
- `7334195 fix(v6): preserve default wall append alias`

Verification:

- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 19 - Mixed Timeframe Panes

Completed in commits:

- `114baec feat(v6): project default wall pane timeframes`
- `6ac7883 feat(v6): support mixed timeframe wall fanout`
- `644da85 test(v6): measure mixed timeframe visible latency`
- `b65aaf3 test(v6): guard pane timeframe isolation`

Verification:

- `node v6/tests/default-wall-pane-projection-smoke.js`
- `node v6/tests/default-wall-mixed-timeframe-runtime-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 20 - Pane-Local Manual Walls

Completed in commits:

- `ef540a6 test(v6): guard pane manual viewport intent`
- `699eac4 test(v6): verify multi pane manual wall replay`

Verification:

- `node v6/tests/chart-viewport-pane-manual-isolation-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 21 - Settings Baseline

Completed in commits:

- `61453e7 feat(v6): add settings runtime`
- `82f3b49 feat(v6): register settings runtime`
- `28ebfda feat(v6): mount settings panel`
- `3090181 test(v6): enforce settings boundaries`
- `a195d7c test(v6): verify settings panel browser flow`

Verification:

- `node v6/tests/settings-runtime-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/settings-panel-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 22 - Transport Polish Baseline

Completed in commits:

- `7d50951 feat(v6): sync replay transport playback state`
- `fc93c10 test(v6): verify transport external playback sync`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 23 - Persistence Baseline

Completed in commits:

- `7046048 feat(v6): add persistence repository`
- `3b8dcbf feat(v6): add persistence runtime`
- `6cde633 feat(v6): register persistence runtime`
- `7c6ef9c test(v6): enforce persistence boundaries`

Verification:

- `node v6/tests/persistence-repository-smoke.js`
- `node v6/tests/persistence-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 24 - Journal Analytics Boundary Baseline

Completed in commits:

- `eedd897 feat(v6): add journal analytics domain`
- `f304aed feat(v6): add journal runtime contract`
- `cb51216 feat(v6): register journal runtime`
- `6513de5 test(v6): enforce journal boundaries`

Verification:

- `node v6/tests/journal-domain-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 25 - Journal Persistence Command Bridge

Completed in commits:

- `6d79441 feat(v6): allow journal snapshot persistence`
- `104a8e0 feat(v6): add journal persistence bridge`
- `aeb6055 feat(v6): register journal persistence bridge`
- `8797c2a test(v6): enforce journal persistence bridge boundaries`

Verification:

- `node v6/tests/persistence-repository-smoke.js`
- `node v6/tests/persistence-runtime-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-persistence-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 26 - V6 Readiness Audit

Completed in commits:

- `7384f2f test(v6): add readiness audit smoke`
- `e0253dd docs(v6): add readiness audit`

Verification:

- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `git diff --check`

### Step 27 - UI Workflow Readiness Surface

Completed in commits:

- `10f4b05 feat(v6): add readiness surface controller`
- `87dbdce feat(v6): mount readiness surface`
- `663bcea test(v6): enforce readiness surface boundaries`

Verification:

- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

### Step 28 - Session Workflow Entry Surface

Completed in commits:

- `3f5299b feat(v6): add sessions surface controller`
- `4cf30b0 feat(v6): mount sessions workflow surface`
- `f43d8e6 test(v6): enforce sessions surface boundaries`

Verification:

- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

### Step 29 - Replay Workflow Entry Surface

Completed in commits:

- `019f20b feat(v6): add replay workflow surface controller`
- `4654b91 feat(v6): mount replay workflow surface`
- `2a7b98c test(v6): enforce replay workflow boundaries`

Verification:

- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

### Step 30 - Journal Workflow Entry Surface

Completed in commits:

- `7f54849 feat(v6): add journal workflow surface controller`
- `7bce5c9 feat(v6): mount journal workflow surface`
- `e46714b test(v6): enforce journal surface boundaries`

Verification:

- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-persistence-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

## Deferred Until Later Gates

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
