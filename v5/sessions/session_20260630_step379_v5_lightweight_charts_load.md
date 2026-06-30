# Step 379 - V5 Lightweight Charts Production Load

## Goal

Make V5's static page load the real Lightweight Charts engine by default while
retaining the DOM fallback for offline/unit harnesses.

This step advances Historical Replay Review: the visible chart surface should
use the real chart engine before adding crosshair, axis, tooltip, and toolbar
polish.

## Planned Steps

### Step 379.1 - Plan

- Add Step 379 to `v5/TODO.md`.
- Update `v5/docs/specs/chart-engine-adapter.md` with the static-page engine
  loading rule.
- Create this session handoff.

Status: complete.

### Step 379.2 - Local Engine Asset

- Add a pinned local Lightweight Charts standalone build under `v5/vendor/`.
- Load the script in `v5/index.html` before `v5/src/app.js`.
- Keep DOM fallback behavior for tests and environments without
  `window.LightweightCharts`.

Completed:

- Added `v5/vendor/lightweight-charts.standalone.production.js`.
- Added `v5/vendor/README.md` with version, source, hash, and license note.
- Updated `v5/index.html` to load the local standalone script before the V5 app
  module.
- Updated the adapter to ignore programmatic Lightweight visible-range events
  unless they follow recent user input, preventing initial `setData` from
  forcing manual mode.

Status: complete.

### Step 379.3 - Browser Verification

- Update browser smoke coverage so the normal static route reports
  `data-chart-engine="lightweight-charts"`.
- Preserve checks that drag/zoom/manual follow behavior stays within chart
  runtime ownership and no-future replay boundaries.

Completed:

- Updated `v5/tests/chart-interaction-browser-smoke.js` to assert the normal
  browser route uses `data-chart-engine="lightweight-charts"`.
- Kept manual follow/no-future checks in the browser route.
- Kept DOM fallback interaction coverage in runtime/fallback-specific smoke.

Status: complete.

### Step 379.4 - Closeout

- Run relevant smoke checks and `git diff --check`.
- Run full `v5/scripts/smoke_all.js`.
- Update this handoff and TODO to mark Step 379 complete.

Completed:

- Ran relevant adapter, runtime, browser, and boundary checks.
- Ran full V5 smoke and whitespace checks.
- Updated TODO and this handoff.

Status: complete.

## Manual Acceptance

- Opening `v5/index.html` with the local server loads `window.LightweightCharts`
  before `v5/src/app.js`.
- The chart host reports `data-chart-engine="lightweight-charts"` in the normal
  browser route.
- The DOM fallback remains available for deterministic unit/runtime tests when
  `window.LightweightCharts` is absent.
- Chart runtime remains the only module creating/calling chart-engine instances.
- Replay runtime still owns cursor, reveal state, and no-future display
  invariants.
- Bar data runtime remains the only owner of `/v4/bars` requests and cache.
- Production chart packaging, crosshair polish, axis labels, go-to time,
  orders, journal, dashboard, AI, SaaS auth, and billing remain out of scope.

## Checks

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- V5 now loads the real Lightweight Charts engine by default in the browser.
- The visible UI is still an engineering shell, not final product UI.
- Drag/zoom is no longer the DOM fallback path in normal browser use, but
  Lightweight timeScale behavior has not yet been tuned for replay workstation
  feel.
- Recommended next step: Step 380 should tune Lightweight timeScale/right-edge
  interaction behavior before crosshair, tooltip, order, journal, dashboard, AI,
  or SaaS work.
