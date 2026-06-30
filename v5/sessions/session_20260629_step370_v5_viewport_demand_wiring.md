# Step 370 - V5 Viewport Demand Runtime Wiring

## Goal

Route actual chart viewport demand events into bounded replay display-window
loading, preserving the V5 runtime ownership boundaries:

- chart runtime observes viewport state and emits demand;
- feature/app wiring dispatches replay commands only;
- replay runtime owns display-window decisions and no-future filtering;
- bar data runtime owns bar requests and cache reuse;
- chart runtime remains the only chart writer.

## Context

Step 369 completed the target display cache abstraction:

- chart runtime can compute and emit `chart:viewportDemand`;
- replay runtime exposes `replay.loadDisplayWindow`;
- bar data runtime caches display windows with delayed release;
- display timeframe controls can reload bounded windows.

The remaining product gap is that real viewport demand is not yet wired through
the active chart route. A left pan can produce demand in chart runtime tests, but
the chart replay route does not subscribe to that event and dispatch replay
display-window loading.

## Planned Steps

### Step 370.1 - Runtime Wiring Smoke

- Add `v5/tests/replay-display-viewport-demand-wiring-smoke.js`.
- Prove a chart viewport demand event dispatches `replay.loadDisplayWindow`
  instead of calling bars/chart internals directly.
- Keep the first harness focused on the command/event bridge.

Status: complete.

Red check:

- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js` fails because
  `v5/src/features/chart-replay/viewport-demand-wiring.js` is not implemented
  yet.

### Step 370.2 - Active Route Wiring

- Subscribe to `CHART_EVENTS.VIEWPORT_DEMAND` while chart replay route is active.
- Ignore events when no session id is active.
- Dispatch `REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW` with the viewport demand.
- Clean up the subscription on route disposal.

Status: complete.

Completed:

- Added `createReplayViewportDemandBridge`.
- The bridge subscribes to `chart:viewportDemand`.
- The bridge dispatches `replay.loadDisplayWindow` with `{ sessionId,
  viewportDemand }`.
- The bridge dedupes identical in-flight demand keys.
- The chart replay route starts/stops the bridge with route lifecycle.

### Step 370.3 - Replay Demand Normalization

- Let `replay.loadDisplayWindow` consume `viewportDemand.missingWindow`.
- Normalize anchor, direction, display timeframe, and suggested count.
- Deduplicate duplicate/in-flight demand keys.
- Keep all bar-data requests bounded by count/window.

Status: planned.

### Step 370.4 - Display Merge And Cache Reuse

- Merge newly loaded display bars with existing display bars by timestamp.
- Preserve no-future filtering after merge.
- Use bar data runtime cache naturally through identical bounded windows.
- Keep chart updates routed through chart runtime commands only.

Status: planned.

### Step 370.5 - Browser Coverage And Handoff

- Add or extend browser smoke for a visible left-pan demand path.
- Add the new smoke to `v5/scripts/smoke_all.js`.
- Run the Step 370 check set and update this handoff with completed status.

Status: planned.

## Manual Acceptance

- A chart visible-range change that crosses loaded left coverage causes one
  bounded replay display-window load.
- The wiring dispatches replay commands only; it does not request bars or write
  chart series from the feature layer.
- Replay runtime remains the owner of display state and no-future filtering.
- Bar data runtime remains the only owner of bar requests and cache hits.
- Newly loaded display windows merge with existing display bars instead of
  replacing useful visible context with a single isolated window.
- Duplicate or overlapping viewport demand does not create duplicate in-flight
  bar requests.
- Cached display windows are reused when the viewport returns to known coverage.
- No request loads the full replay session range or full left-side history.

## Checks

- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
