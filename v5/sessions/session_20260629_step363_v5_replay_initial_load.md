# Step 363 - V5 FX Replay Initial Load

## Goal

Implement the first replay behavior slice on the clean V5 runtime: resolve the
session start bar, load viewport-sized prefix bars, render prefix plus start
through chart runtime, and prevent future bars in display state.

## Completed

### Step 363.1 - Resolve Start Bar

- Added `v5/src/runtime/replay-runtime.js`.
- Registered `runtime.replay` in the V5 app shell.
- Added `replay.resolveStartBar`.
- Replay runtime gets the session through `session.get`.
- Replay runtime resolves the first active-timeframe bar at or after
  `sessionStart` through `barData.loadWindow`.
- Added `v5/tests/replay-start-bar-smoke.js`.

Commit: `4da2b5e Resolve V5 replay start bar`

### Step 363.2 - Load Viewport Prefix

- Added `replay.loadInitialPrefix`.
- Replay runtime reads viewport demand through `chart.getViewportMetrics`.
- Prefix count scales with `estimatedVisibleBars`.
- Prefix bars are loaded through `barData.loadWindow` using a bounded backward
  window anchored at the start bar.
- Added `v5/tests/replay-prefix-load-smoke.js`.

Commit: `a05dfc2 Load V5 replay prefix window`

### Step 363.3 - Render Initial Bars

- Added `replay.loadInitialSession`.
- Initial display state is `prefixBars + startBar`.
- Chart writes happen only through `chart.replaceBars`.
- Chart route dispatches `replay.loadInitialSession` when a session id is
  present.
- Added `v5/tests/replay-initial-render-smoke.js`.

Commit: `f4f23cf Render V5 replay initial bars`

### Step 363.4 - No Future Bars Guard

- Added `assertNoFutureDisplayBars`.
- `replay.loadInitialSession` checks the invariant before chart rendering.
- Added `v5/tests/replay-no-future-bars-smoke.js`.

Commit: `01215cc Guard V5 replay initial future bars`

### Step 363.5 - Real Data Browser Smoke

- Added `v5/tests/replay-initial-browser-smoke.js`.
- Browser smoke creates a real NQ 1M replay session for `2025-06-02T10:00:00Z`.
- It verifies prefix plus start is displayed, start is latest visible bar, no
  future bars are displayed, and the full session range is not requested.
- Added Step 363 tests to `v5/scripts/smoke_all.js`.

## Checks

- `node v5/tests/replay-start-bar-smoke.js`
- `node v5/tests/replay-prefix-load-smoke.js`
- `node v5/tests/replay-initial-render-smoke.js`
- `node v5/tests/replay-no-future-bars-smoke.js`
- `node v5/tests/replay-initial-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Manual Acceptance

- Entering chart replay with a session id triggers initial replay loading.
- Initial display contains prefix bars plus the start bar.
- Start bar is the latest visible replay bar.
- Display state does not include bars after the start bar.
- Initial loading uses bounded start-resolve and prefix requests, not the full
  session range.

## Next Step

Step 364 should add controlled replay progression:

- `Next` reveals exactly one active-timeframe bar;
- `Play` repeatedly reveals one active-timeframe bar;
- replay stops at `sessionEnd`;
- rightward navigation must not expose unrevealed future bars.

Keep forward reveal data access behind bar data runtime commands. Do not let UI
or feature modules request bars directly or write chart series directly.
