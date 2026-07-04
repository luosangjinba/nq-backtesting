# Step 504 - Layout Sync Controller Extraction

Date: 2026-07-04

## Trigger

Step 503 moved pane host/display/TF orchestration out of the route. The next
remaining route-level multi-pane responsibility is layout sync policy:

- Go to / Jump cursor time sync;
- chart visible-range date-range sync;
- chart crosshair sync;
- event handling for chart visible range and crosshair changes.

## Substep Plan

### 504.1 - Planning Handoff

Update TODO/session docs with the implementation split and commit before code
changes.

Verification:

- `git diff --check`

### 504.2 - Controller Seam

Create `chart-replay-layout-sync-controller.js` with a narrow public contract,
then wire route dependencies without changing behavior.

Expected controller responsibilities after this substep:

- hold route-level layout sync facade;
- expose `syncTime`, `syncDateRange`, `syncCrosshair`,
  `handleVisibleRangeChanged`, and `handleCrosshairChanged`;
- expose `dispose()`.

Verification:

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `git diff --check`

### 504.3 - Move Sync Logic

Move these route functions into the controller:

- `syncLayoutTime`;
- `syncLayoutDateRange`;
- `syncLayoutCrosshair`;
- visible-range event sync decision;
- crosshair event sync decision.

The controller may dispatch layout commands and call route callbacks. It must
not write chart data, request bars, or mutate replay cursor/reveal state.

Verification:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `git diff --check`

### 504.4 - Regression Gate And Closeout

Run the Step 504 acceptance gates and update this handoff with the final
result.

Verification:

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `git diff --check`

## Guardrails

- Preserve the Step 503A behavior contract.
- Do not add new multi-pane behavior.
- Do not move pane host/display/TF orchestration back into the route.
- Do not move pane shell DOM or split resize behavior yet; Step 505 owns that.
- Do not let this controller write chart series or request bars.

## Status

In progress.
