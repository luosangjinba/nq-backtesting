# Step 361 - V5 Chart Runtime Foundation

## Goal

Add the only chart-writing runtime for V5 without adding bars loading or replay
semantics.

## Completed

### Step 361.1 - Chart Runtime Shell

- Added `v5/src/runtime/chart-runtime.js`.
- Registered `runtime.chart` in the app shell.
- Chart route now exposes only a generic chart host.
- Chart runtime discovers chart hosts and mounts the chart canvas.

Commit: `082464d Add V5 chart runtime shell`

### Step 361.2 - Series Commands

- Added chart commands:
  - `chart.replaceBars`
  - `chart.appendBars`
  - `chart.clearBars`
- Chart runtime validates OHLC bars.
- Chart runtime renders injected test bars itself.
- Added `v5/tests/chart-runtime-smoke.js`.

Commit: `a46b6be Add V5 chart series commands`

### Step 361.3 - Viewport Metrics

- Added `chart.getViewportMetrics`.
- Runtime reads mounted chart dimensions and estimates visible bar capacity.
- Extended chart runtime smoke coverage.

Commit: `bde4ae3 Add V5 chart viewport metrics`

### Step 361.4 - Chart Boundary Harness

- Added `v5/tests/chart-boundary-smoke.js`.
- The harness fails if feature modules import chart runtime internals or call
  chart series APIs directly.
- Added the harness to `v5/scripts/smoke_all.js`.

## Checks

- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-boundary-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/tests/app-shell-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Manual Acceptance

- Chart route initializes a chart host.
- Chart runtime is the only module writing chart display state.
- Injected test bars render through chart runtime commands.
- Feature modules cannot directly call chart series APIs.
- Bars and replay runtimes are still absent.

## Next Step

Step 362 should add the bar data runtime as the only runtime allowed to request
and cache K-line data.

Do not move bars API access into feature modules.
