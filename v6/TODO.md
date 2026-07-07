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
- Latest completed step: Step 101 - Workstation Chart Surface Contract
  Integration Audit.
  The chart surface owner contract matches the current browser chart surface,
  adapter, host manager, event-only surface bridges, and dashboard row-action
  boundaries.

## Next Executable Steps

### Step 102 - Chart Surface Boundary Smoke Expansion

Add chart surface owner contract checks to the broader boundary-smoke gate or a
focused boundary helper used by it.

Status: planned.

Notes for execution:

- keep chart-data and chart-viewport surface bridges event-only;
- keep manual-wall and reset-view control bridges limited to viewport commands;
- keep chart surface series writes and visible range application inside
  chart-engine browser surface files;
- do not modify dashboard row action visibility.

Scope:

- extend `boundary-smoke.js` or add a focused helper invoked by it;
- reuse `chart-surface-contract.js` where practical;
- keep changes test-only unless a mismatch requires a small source fix.

Acceptance:

- boundary smoke catches chart surface owner violations;
- chart surface contract and re-entry audit smokes pass;
- workstation chart host/data bridge/viewport bridge/default-wall/manual-wall
  browser smokes pass;
- dashboard row action visibility remains unchanged.

## Completed Steps

### Step 101 - Workstation Chart Surface Contract Integration Audit

Completed in commit:

- `a95d20df docs(v6): audit chart surface contract integration`

Verification:

- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 100 - Workstation Chart Surface Owner Contract

Completed in commits:

- `bc995ea9 feat(v6): add chart surface owner contract`
- `dcc8252c test(v6): guard chart surface reentry contract`

Verification:

- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 99 - Workstation Replay/Chart Re-entry Audit

Completed in commits:

- `b2cbcb1f docs(v6): audit workstation replay chart reentry`
- `c34ace79 test(v6): align workstation browser smokes with main pane`

Verification:

- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 98 - Session Dashboard Readiness Re-audit

Completed in commit:

- `8eb24471 docs(v6): audit session dashboard readiness`

Verification:

- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `git diff --check`

### Step 97 - Recent Sessions Row Action Contract Audit

Completed in commits:

- `3a66c0b0 docs(v6): audit recent session row actions`

Verification:

- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `git diff --check`

### Step 96 - Calendar Owner Contract

Completed in commits:

- `ff91676b feat(v6): add calendar owner contract`
- `ad13a835 test(v6): guard calendar owner boundaries`

Verification:

- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 95 - Journal Owner Contract

Completed in commits:

- `6ac21fc0 feat(v6): add journal owner contract`
- `2f28f9a7 test(v6): guard journal owner boundaries`

Verification:

- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-domain-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 94 - Orders Owner Contract

Completed in commits:

- `8b61e350 feat(v6): add orders owner contract`
- `826a5e74 test(v6): guard orders owner boundaries`

Verification:

- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 93 - Session Copy Metadata Action

Completed in commits:

- `eb6c3f2d feat(v6): copy session metadata in repository`
- `64582c7b feat(v6): expose session copy command`
- `50b54920 feat(v6): enable session copy action`

Verification:

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `git diff --check`

### Step 92 - Session Copy Owner Contract

Completed in commits:

- `bc7b48f0 feat(v6): add session copy contract`
- `820be36b test(v6): guard session copy boundaries`

Verification:

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 91 - Session Analytics Read-only Surface

Completed in commits:

- `bc49e851 feat(v6): add session analytics surface model`
- `7b9f8846 feat(v6): open read-only session stats surface`
- `f4f00ed6 test(v6): verify read-only session stats surface`

Verification:

- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-analytics-surface-model-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `git diff --check`

### Step 90 - Session Analytics Owner Contract

Completed in commits:

- `18b71f81 feat(v6): add session analytics contract`
- `c2a32db6 test(v6): guard session analytics boundaries`

Verification:

- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 89 - Session Summary Surface Polish

Completed in commits:

- `fab143df docs(v6): scope session summary polish`
- `3ea0d684 feat(v6): polish session summary surface`

Verification:

- `node v6/tests/session-summary-surface-model-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 88 - Session Summary Read-only Surface

Completed in commits:

- `23b3dea6 docs(v6): scope session summary surface`
- `f17e6321 feat(v6): add session summary surface model`
- `7b74c34f feat(v6): open read-only session summary`

Verification:

- `node v6/tests/session-summary-surface-model-smoke.js`
- `node v6/tests/session-summary-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 87 - Session Summary Owner Contract

Completed in commits:

- `c0ebcf09 docs(v6): scope session summary contract`
- `c0926349 feat(v6): define session summary contract`
- `7becd460 test(v6): guard session summary ownership`
- `67ee8860 feat(v6): mark summary action contract ready`

Verification:

- `node v6/tests/session-summary-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `git diff --check`

### Step 86 - Recent Sessions Row Action Boundaries

Completed in commits:

- `dbf6e104 docs(v6): scope recent row action boundaries`
- `50c7c75a feat(v6): define recent row action boundaries`
- `09183e3c test(v6): guard recent row action placeholders`

Verification:

- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

### Step 85 - Quick Session Modal Polish

Completed in commits:

- `e13b27af docs(v6): scope quick session modal polish`
- `89eeb699 feat(v6): polish quick session modal`

Verification:

- `node v6/tests/session-setup-model-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

### Step 84 - Recent Sessions Controls

Completed in commits:

- `f88e3fe2 docs(v6): scope recent sessions controls`
- `ce2ad615 feat(v6): model recent sessions controls`
- `bd8bdb9b feat(v6): wire recent sessions controls`

Verification:

- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

### Step 83 - Quick Session Creation Flow

Completed in commits:

- `c7e13d04 docs(v6): scope quick session flow`
- `1b2d2ccd feat(v6): extend quick session metadata`
- `54f143ef feat(v6): add quick session modal`

Verification:

- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-setup-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

### Step 82 - Session Metadata Delete Action

Completed in commits:

- `052fbfc4 docs(v6): scope step eighty two session delete`
- `6979bfca feat(v6): delete session metadata`
- `474b0e3d test(v6): verify session metadata delete`

Verification:

- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/session-dashboard-persistence-boundary-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `git diff --check`

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

### Step 31 - Workflow Surfaces Readiness Audit

Completed in commits:

- `675e69c feat(v6): hide engineering gates from readiness surface`
- `8f9d078 docs(v6): audit workflow surfaces`

Verification:

- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 32 - Product Top Chrome Consolidation

Completed in commits:

- `3d3a6f7 feat(v6): consolidate product top chrome`
- `cd73cea docs(v6): document product top chrome`

Verification:

- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 33 - Workflow Panel Product Copy And Layout

Completed in commits:

- `546a9f9 feat(v6): refine workflow panel product copy`
- `3fe49ed test(v6): protect workflow panel layout`

Verification:

- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/settings-panel-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 34 - Workflow Action Active States

Completed in commits:

- `1b2f788 feat(v6): add workflow action active states`
- `661ce3a test(v6): cover workflow action state helper`

Verification:

- `node v6/tests/workflow-action-state-smoke.js`
- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 35 - Workflow Panel Close Behavior

Completed in commits:

- `9f4ede5 feat(v6): add workflow panel close behavior`
- `5d72c99 test(v6): cover workflow panel close helper`

Verification:

- `node v6/tests/workflow-panel-close-smoke.js`
- `node v6/tests/workflow-action-state-smoke.js`
- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 36 - Workflow Panel Mutual Exclusivity

Completed in commits:

- `618f2b6 feat(v6): coordinate workflow panel exclusivity`
- `d7a99dd test(v6): cover workflow panel coordinator`

Verification:

- `node v6/tests/workflow-panel-coordinator-smoke.js`
- `node v6/tests/workflow-panel-close-smoke.js`
- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 37 - Workflow Shell Audit

Completed in commits:

- `28a6666 docs(v6): audit workflow shell behavior`
- `ff2a499 test(v6): protect workflow shell audit`

Verification:

- `node v6/tests/workflow-shell-audit-smoke.js`
- `node v6/tests/workflow-panel-coordinator-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 38 - Replay Chart Readiness Re-Audit

Completed in commits:

- `3122ff9 docs(v6): audit replay chart readiness`
- `9ff7f11 test(v6): protect replay chart readiness audit`

Verification:

- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 39 - Chart Presentation Surface Audit

Completed in commits:

- `87ac595 docs(v6): audit chart presentation surface`
- `4aeffe1 test(v6): protect chart presentation audit`

Verification:

- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 40 - Workstation Chart Host Surface

Completed in commits:

- `b33c25d feat(v6): reserve workstation chart host`
- `cf0ed6d docs(v6): update chart presentation audit`

Verification:

- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 41 - Mount Workstation Chart Adapter

Completed in commits:

- `90e747d1 feat(v6): add workstation chart surface mount`
- `56586e14 feat(v6): mount workstation chart adapter`

Verification:

- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 42 - Connect Chart Data Snapshot To Mounted Adapter

Completed in commits:

- `1a3d854e feat(v6): apply chart data records to workstation chart`
- `ee7bb97a feat(v6): bridge chart data to workstation chart`

Verification:

- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 43 - Connect Viewport Projection To Mounted Adapter

Completed in commits:

- `1675b8ec feat(v6): apply viewport projection to workstation chart`
- `1fba4157 feat(v6): bridge viewport projection to workstation chart`

Verification:

- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 44 - Gate Workstation Default Wall Flow

Completed in commits:

- `3c40b396 test(v6): gate workstation default wall flow`

Verification:

- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 45 - Gate Workstation Manual Wall Flow

Completed in commits:

- `49d8e7c1 test(v6): gate workstation manual wall flow`

Verification:

- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 46 - FXReplay UI Reference Guardrails

Completed in commits:

- `5e9573d0 docs(v6): capture fxreplay ui guardrails`

Verification:

- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 47 - FXReplay UI Parity Gap Audit

Completed in commits:

- `c411c76b docs(v6): audit fxreplay ui parity gaps`

Verification:

- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 48 - Top Toolbar Shell Parity Slice

Completed in commits:

- `da3ec583 feat(v6): add top toolbar parity shell`

Verification:

- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 49 - Timeframe Menu Shell Parity Slice

Completed in commits:

- `846ce242 feat(v6): add timeframe menu parity shell`

Verification:

- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 50 - Right Utility Rail Shell Reservation

Completed in commits:

- `e4ccf7f5 feat(v6): reserve right utility rail shell`

Verification:

- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 51 - Real Chart Manual Wall Input Bridge

Completed in commits:

- `40e8e6a9 docs(v6): retarget step fifty one to chart input bridge`
- `65221c65 feat(v6): expose chart visible range subscriptions`
- `83798dde feat(v6): bridge chart range input to manual walls`
- `6d74660c test(v6): gate native chart input manual walls`

Verification:

- `node v6/tests/manual-wall-input-bridge-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 52 - Chart Toolbar Chrome Cleanup

Completed in commits:

- `b3624e4f fix(v6): clean duplicate chart toolbar chrome`
- `e121d712 docs(v6): guard chart chrome cleanup`

Verification:

- `node v6/tests/chart-toolbar-cleanup-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 53 - Session Dashboard Shell Direction

Completed in commits:

- `e1592af5 docs(v6): clarify step fifty three dashboard scope`
- `b15c51ed feat(v6): add session dashboard shell`
- `544179d9 docs(v6): guard session dashboard shell`

Verification:

- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 54 - Simplify Session Dashboard Tabs

Completed in commits:

- `ccfdf2a1 docs(v6): retarget step fifty four dashboard simplification`
- `a6735ff8 fix(v6): simplify session dashboard entries`
- `ebe5cca2 docs(v6): guard simplified session dashboard`

Verification:

- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 55 - Session Dashboard Open Session Contract

Completed in commits:

- `50ebe9d4 docs(v6): scope step fifty five session open contract`
- `be79ea77 feat(v6): add session open command`
- `9cb1f049 fix(v6): open dashboard sessions through runtime`
- `8191b57c fix(v6): remove duplicate session dashboard tabs`

Verification:

- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 56 - Standalone Session Surface

Completed in commits:

- `3d4e901e docs(v6): scope step fifty six session surface`
- `ac345684 feat(v6): make session surface standalone`

Verification:

- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 57 - Backtesting Session Setup Form

Completed in commits:

- `e3de8392 docs(v6): scope step fifty seven session setup`
- `0e5fd68f feat(v6): add session setup form model`
- `e6cc06bd feat(v6): add backtesting session setup form`
- `de92a0f0 fix(v6): hide workstation on session surface`

Verification:

- `node v6/tests/session-setup-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 58 - Chart Entry Activation Owner

Completed in commits:

- `2677b42e docs(v6): scope step fifty eight activation owner`
- `21a1b47d feat(v6): add chart entry activation runtime`
- `0b9633b4 feat(v6): register chart entry activation runtime`

Verification:

- `node v6/tests/chart-entry-runtime-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 59 - Chart Entry Initialization Plan

Completed in commits:

- `cbcacf07 docs(v6): scope step fifty nine init plan`
- `73aaeb18 feat(v6): define chart entry initialization plan`
- `abc9b19d feat(v6): attach initialization plan to chart entry`

Verification:

- `node v6/tests/chart-entry-plan-smoke.js`
- `node v6/tests/chart-entry-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 60 - Chart Entry Context Initialization Owner

Completed in commits:

- `43caa27f docs(v6): scope step sixty context initialization`
- `53c05106 feat(v6): define chart entry context plan`
- `91f38936 feat(v6): add chart entry initialization runtime`
- `f2b607de feat(v6): register chart entry initialization runtime`

Verification:

- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/chart-entry-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 61 - Chart Entry Bounded Context Load Owner

Completed in commits:

- `32e26c87 docs(v6): scope step sixty one context load`
- `b1501ccc feat(v6): add chart entry context load runtime`
- `4551847d feat(v6): register chart entry context load runtime`

Verification:

- `node v6/tests/chart-entry-context-runtime-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 62 - Chart Entry Replay Bootstrap Owner

Completed in commits:

- `c868f975 docs(v6): scope step sixty two replay bootstrap`
- `7ae20b36 feat(v6): add chart entry replay bootstrap runtime`
- `3b4adbe0 feat(v6): register chart entry replay bootstrap runtime`

Verification:

- `node v6/tests/chart-entry-replay-bootstrap-runtime-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-entry-context-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 63 - Chart Entry Default Wall Plan Owner

Completed in commits:

- `2000f87e docs(v6): scope step sixty three wall plan`
- `6f11cc51 feat(v6): define chart entry wall plan`
- `9d261a9e feat(v6): add chart entry wall plan runtime`
- `82aa9359 feat(v6): register chart entry wall plan runtime`

Verification:

- `node v6/tests/chart-entry-default-wall-plan-smoke.js`
- `node v6/tests/chart-entry-default-wall-plan-runtime-smoke.js`
- `node v6/tests/chart-entry-replay-bootstrap-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 64 - Chart Entry Projection Preparation Owner

Completed in commits:

- `2741c2cd docs(v6): scope step sixty four projection prep`
- `d7b50ae7 feat(v6): define chart entry projection preparation`
- `ceade2a4 feat(v6): add chart entry projection preparation runtime`
- `282c287f feat(v6): register chart entry projection preparation runtime`

Verification:

- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-default-wall-plan-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 65 - Chart Entry Projection Apply Owner

Completed in commits:

- `80e83b4c docs(v6): scope step sixty five projection apply`
- `4b586035 feat(v6): add chart entry projection apply runtime`
- `1f522cad feat(v6): register chart entry projection apply runtime`

Verification:

- `node v6/tests/chart-entry-projection-apply-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 66 - Chart Entry Initial Visibility Browser Gate

Completed in commits:

- `e0259d49 docs(v6): scope step sixty six visibility gate`
- `9e46453f fix(v6): align workstation chart pane id`
- `af66f7f3 test(v6): add chart entry visibility smoke`
- `2033c03d docs(v6): align chart presentation pane id`

Verification:

- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/chart-entry-projection-apply-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 67 - Chart Entry Manual Next Owner

Completed in commits:

- `ad398407 docs(v6): scope step sixty seven manual next`
- `5f558c9d feat(v6): add chart entry manual next runtime`
- `7200225a feat(v6): route transport next through chart entry`
- `22e4104a fix(v6): align chart entry cursor projection`
- `9ab77168 test(v6): add chart entry manual next browser smoke`

Verification:

- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 68 - Chart Entry Auto Playback Tick Owner

Completed in commits:

- `85554e7a docs(v6): scope step sixty eight autoplay`
- `d4bc7062 feat(v6): add chart entry autoplay owner`
- `3b02c2fb test(v6): verify chart entry autoplay browser flow`

Verification:

- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 69 - Chart Entry Playback End-State And Speed Policy

Completed in commits:

- `93f799f7 docs(v6): scope step sixty nine playback policy`
- `9df04628 feat(v6): route active playback speed through owner`
- `330cb94e test(v6): verify playback policy browser flow`

Verification:

- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-policy-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 70 - Chart View Reset Intent Owner

Completed in commits:

- `fe38552c docs(v6): scope step seventy reset view`
- `440c8138 feat(v6): add chart viewport reset owner`
- `ed415bd8 feat(v6): wire reset view control`
- `3dbd3025 fix(v6): reset view to pane default wall`
- `edf197d0 test(v6): verify chart reset view browser flow`
- `5f47a775 test(v6): include reset view in runtime inventory`

Verification:

- `node v6/tests/chart-viewport-store-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/reset-view-control-bridge-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 71 - Chart Entry Playback Period Sync Policy

Completed in commits:

- `de86fb32 docs(v6): scope step seventy one playback period`
- `280c4f8d feat(v6): add playback period runtime`
- `263de362 feat(v6): wire playback period controls`
- `84af0053 test(v6): cover playback period sync`

Verification:

- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 72 - Chart Entry Playback Period Execution Integration

Completed in commits:

- `6241ffab docs(v6): scope step seventy two playback execution`
- `b112ba2a feat(v6): apply playback period to manual next`
- `d20f9cbc test(v6): verify playback period execution`

Verification:

- `node v6/tests/chart-entry-playback-period-policy-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 73 - Playback Period Boundary Gates

Completed in commits:

- `d7180ed7 docs(v6): scope step seventy three boundaries`
- `fc745805 fix(v6): guard playback period replay end`
- `33e681eb test(v6): gate playback period browser boundaries`

Verification:

- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-period-policy-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 74 - Playback Period UI Feedback

Completed in commits:

- `4109e1b9 docs(v6): scope step seventy four transport feedback`
- `e5ea90cb feat(v6): show ended replay transport state`
- `e228955e test(v6): verify ended transport feedback`
- `4d52b47e fix(v6): keep transport playing during replay advance`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 75 - Replay End Restart Entry Policy

Completed in commits:

- `fac490d4 docs(v6): scope step seventy five restart entry`
- `5e99061b feat(v6): add chart entry restart owner`
- `996fb2a1 feat(v6): wire explicit replay restart control`
- `14cdef1f test(v6): verify replay restart browser flow`

Verification:

- `node v6/tests/chart-entry-restart-runtime-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 76 - Restart UX Polish And Semantics

Completed in commits:

- `d6bb0e28 docs(v6): scope step seventy six restart polish`
- `03bd3070 feat(v6): clarify restart transport semantics`
- `363e749b fix(v6): refresh transport after replay restart`
- `5d4cc823 fix(v6): stabilize transport after restart`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/chart-entry-restart-runtime-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 77 - Transport Control Visual State Audit

Completed in commits:

- `e299cfff docs(v6): scope step seventy seven transport audit`
- `270259e2 feat(v6): harden transport control states`
- `6e6cb3c2 test(v6): audit transport visual states`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 78 - Transport Focus And Keyboard Polish

Completed in commits:

- `6e3f37ef docs(v6): scope step seventy eight transport focus`
- `5e4a3b81 feat(v6): polish transport focus keyboard`
- `72f2bf24 test(v6): verify transport focus keyboard`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/replay-transport-focus-keyboard-browser-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 79 - Transport Drag Position Persistence

Completed in commits:

- `b07f23bf docs(v6): scope step seventy nine transport persistence`
- `d6a6aad0 feat(v6): persist transport drag position`
- `32e1df68 test(v6): verify transport position persistence`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/replay-transport-position-persistence-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/replay-transport-focus-keyboard-browser-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 80 - Session Dashboard Persistence Boundary

Completed in commits:

- `5285817e docs(v6): scope step eighty session boundary`
- `9a9025ba docs(v6): define session dashboard persistence boundary`
- `b3ff08f3 test(v6): gate session dashboard persistence boundary`

Verification:

- `node v6/tests/session-dashboard-persistence-boundary-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `git diff --check`

### Step 81 - Session Metadata Persistence Adapter

Completed in commits:

- `8f1cd83d docs(v6): scope step eighty one session metadata`
- `172bb8ea feat(v6): persist session metadata`
- `4eb472e6 test(v6): verify durable session metadata`

Verification:

- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/session-dashboard-persistence-boundary-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
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
