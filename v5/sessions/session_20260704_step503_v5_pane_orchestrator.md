# Step 503 - Pane Orchestrator Extraction

Date: 2026-07-04

## Trigger

Step 503 starts the multi-pane module cleanup sequence. The route currently
owns too much pane orchestration:

- active-pane display timeframe derivation;
- chart host mount/release dispatch;
- non-primary pane display initialization;
- active-pane TF changes;
- interval-sync display reload fan-out.

## Substep Plan

### 503.1 - Planning Handoff

Update TODO/session docs with the implementation split and commit the docs
before code changes.

Verification:

- `git diff --check`

### 503.2 - Module Seam

Create `chart-replay-pane-orchestrator.js` with the public contract and minimal
internal state, then wire route dependencies without changing behavior.

Expected route responsibilities after this substep:

- page construction;
- controller construction;
- top-level event subscriptions;
- teardown.

Expected orchestrator responsibilities after this substep:

- route-level pane state facade;
- active display timeframe getter;
- lifecycle `dispose()`.

Verification:

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `git diff --check`

### 503.3 - Move Pane Host And Display Orchestration

Move these route functions into the orchestrator:

- `activePaneDisplayTimeframe`;
- `mountChartHosts`;
- `releaseRemovedChartPanes`;
- `paneInitialDisplayTimeframe`;
- `ensurePaneLocalDisplay`;
- `ensureNonPrimaryPaneDisplays`;
- `setActivePaneDisplayTimeframe`.

The orchestrator may dispatch chart/layout/replay commands, but it must not
call chart engine APIs or request bars directly.

Verification:

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `git diff --check`

### 503.4 - Regression Gate And Closeout

Run the Step 503 acceptance gates and update this handoff with the final result.

Verification:

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `git diff --check`

## Guardrails

- Preserve the Step 503A behavior contract.
- Do not add new multi-pane behavior.
- Do not move layout sync effects yet; Step 504 owns that.
- Do not move chart runtime pane-state helpers yet; Step 506 owns that.
- Do not move replay pane display merge logic yet; Step 507 owns that.

## Status

Completed.

## Result

Added:

- `v5/src/features/chart-replay/chart-replay-pane-orchestrator.js`

Changed:

- `chart-replay-route.js` delegates pane layout application, active display
  timeframe derivation, chart host mount/release, non-primary display
  initialization, and active-pane TF changes to the orchestrator.
- Route still owns page construction, controller wiring, top-level event
  subscriptions, display timezone/presentation sync, layout sync effects, and
  teardown.
- Route line count moved from 636 lines at audit time to 541 lines after Step
  503.

## Verification Result

Passed:

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `git diff --check`

Node emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ESM test
files; tests still passed.

## Next

Step 504 should extract `chart-replay-layout-sync-controller.js` for route-level
time, date-range, crosshair, and chart visible-range sync effects.
