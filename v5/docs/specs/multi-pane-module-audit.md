# Multi-Pane Module Audit

Phase: Phase 3 - Real Chart Interaction.

Phase gate: multi-pane charting must stay modular enough that future Settings,
layout, chart interaction, and replay features do not re-create V4-style route
ownership debt.

## Audit Summary

The current multi-pane implementation is functionally moving forward, but the
module structure is too muddy. The main problem is not one oversized file by
itself; it is that pane orchestration lives across route UI, pane shell,
layout runtime, chart runtime, and replay display-window loading without one
clear coordination boundary.

The current risk is high enough that the next multi-pane work should be
refactoring/contract cleanup before adding new behavior.

Step 511 supersedes the earlier "continue refactoring while preserving current
behavior" stance. Manual testing after Steps 508-510 still found structural
multi-pane failures: triple layouts can open with a missing chart pane, reset
view does not reliably recover that pane, triple initial active-pane rules are
incomplete, and replay `Next` / playback still feels like panes advance through
catch-up work instead of one coordinated replay projection. The current
multi-pane path should therefore be treated as a rebuild target, not a surface
for more local behavior patches.

## Current Hotspots

Line counts at audit time:

- `chart-runtime.js`: 886 lines.
- `chart-replay-route.js`: 636 lines.
- `layout-runtime.js`: 445 lines.
- `chart-replay-pane-shell.js`: 414 lines.
- `chart-replay-controls.js`: 308 lines.
- `replay-display-window-controller.js`: 307 lines.

The largest files are not automatically wrong, but their responsibilities are
now mixed:

- `chart-replay-route.js` both boots the route and coordinates pane display
  initialization, active-pane TF changes, host mounting, pane release,
  layout sync, timezone/presentation sync, status refresh, and event fan-out.
- `chart-replay-pane-shell.js` renders panes, tracks active pane intent,
  handles split dragging, creates dynamic pane DOM, and applies split CSS
  tracks.
- `chart-runtime.js` owns both core chart runtime behavior and pane-local
  state branching for bars, display context, visible ranges, demand, mounted
  hosts, global sync, and primary-vs-pane-local update rules.
- `replay-display-window-controller.js` owns primary display-window loading
  and non-primary pane-local display-window loading, including chart snapshot
  reads for merge base.

## Boundary Problems

### 1. Route Owns Too Much Pane Orchestration

`chart-replay-route.js` currently contains the effective multi-pane
orchestrator:

- `mountChartHosts`
- `releaseRemovedChartPanes`
- `paneInitialDisplayTimeframe`
- `ensurePaneLocalDisplay`
- `ensureNonPrimaryPaneDisplays`
- `applyLayoutState`
- `setActivePaneDisplayTimeframe`
- `syncLayoutTime`
- `syncLayoutDateRange`
- `syncLayoutCrosshair`

These are not just route rendering helpers. They encode cross-runtime policy:
when panes get display windows, how pane TF state maps to replay display
loading, when chart hosts are mounted/released, and how active-pane controls
target chart/replay/layout commands.

This is the main source of confusion.

### 2. Active-Pane Intent Is Split Between Route And Pane Shell

Step 501 added optimistic active-pane selection in pane shell so shared
controls can react immediately. That was a correct behavior fix, but it also
made the architectural smell visible:

- layout runtime owns official active pane;
- pane shell owns immediate user intent;
- route owns shared control state derived from both;
- controls call back into route to mutate active pane display timeframe.

This needs a named controller boundary so future shared controls do not each
invent their own active-pane reconciliation.

### 3. Primary Display And Pane-Local Display Rules Are Mixed In Chart Runtime

Chart runtime now contains multiple rules like:

- global primary display sync should update only primary host;
- pane-local updates should target one pane;
- `chart.getRenderedBars({ paneId })` must return replay-readable bars;
- primary reset/range/follow must not rerender non-primary hosts.

These rules are valid, but they are spread through `chart-runtime.js` branches.
Future fixes will be risky unless pane state/sync helpers are split out.

### 4. Replay Display Loading Knows About Chart Pane Snapshots

Replay runtime must own display-window loading, but non-primary merge currently
reads `chart.getRenderedBars({ paneId })` to get the target pane base. This is
acceptable as a command boundary, but it should be documented and isolated in
a helper so it does not turn into ad hoc cross-runtime data coupling.

### 5. Sync Toggles Exist, But Sync Application Has No Single Home

`layout-runtime` stores sync flags. Route applies some sync effects. Chart
runtime emits visible-range/crosshair events. Replay display-window controller
applies display-timeframe results. The sync policy is therefore split across
four places.

The next split should not move all sync into layout runtime, because layout
runtime should not write charts or load bars. But there should be a route-level
sync coordinator module that owns the decision of which runtime command to
dispatch for a sync event.

## Recommended Module Boundaries

### A. `chart-replay-pane-orchestrator.js`

Owns route-level pane orchestration and active-pane derived state.

Move out of `chart-replay-route.js`:

- active pane display timeframe derivation;
- pane display initialization queue/keying;
- pane-local display load requests;
- active-pane TF changes and interval-sync fan-out;
- chart host mount/release dispatch;
- active-pane optimistic reconciliation hooks.

Allowed dependencies:

- command bus;
- layout commands;
- replay commands;
- chart commands;
- route/session getters.

Forbidden:

- direct chart engine calls;
- direct bars API calls;
- DOM rendering beyond reading pane ids from host elements passed in by route.

### B. `chart-replay-layout-sync-controller.js`

Owns route-level sync effects.

Move out of `chart-replay-route.js`:

- `syncLayoutTime`;
- `syncLayoutDateRange`;
- `syncLayoutCrosshair`;
- future sync fan-out behavior for active-pane controls.

This controller should translate chart/replay/UI events into layout commands
only. It must not write chart series or request bars.

### C. `chart-replay-pane-dom.js`

Split pure pane DOM creation/update from pane shell behavior.

Move out of `chart-replay-pane-shell.js`:

- `createChartPane`;
- `createSplitHandle`;
- `updatePaneElement`;
- pane title helpers;
- static pane markup decisions.

The pane shell controller should then only coordinate events, split drag, and
render state application.

### D. `chart-replay-split-resize-controller.js`

Move split drag state out of `chart-replay-pane-shell.js`:

- pointer capture;
- drag state;
- handle positioning;
- ratio dispatch;
- resize cleanup.

This makes future resize UX work safer.

### E. `chart-runtime-pane-state.js`

Split chart pane state helpers out of `chart-runtime.js`:

- pane id normalization;
- pane state lookup;
- pane display-state patching;
- retained pane id sets;
- pane snapshot cloning;
- primary/pane-local sync target helpers.

Chart runtime should remain the command registration and high-level chart
state owner, but not hold every pane-state branch inline.

### F. `replay-pane-display-loader.js`

Extract non-primary display-window base/merge logic from
`replay-display-window-controller.js`:

- target pane snapshot retrieval through chart command;
- base display bars/timeframe normalization;
- merge eligibility;
- duplicate demand key construction including pane id.

Replay display-window controller remains the owner of replay display loading,
but the pane-specific merge rule becomes testable in isolation.

## Proposed Refactor Order

Do not start with `chart-runtime.js`. It is shared and easy to break. Start by
removing route orchestration pressure first.

### Step 503A - Behavior Contract Audit

Status: completed as documentation/audit before implementation.

Goal: confirm the requested multi-pane behavior contract before moving code.
This step does not refactor production modules. It records expected behavior,
current implementation points, smoke coverage, and gaps in
`multi-pane-behavior-contract-audit.md`.

The Step 503-507 module split must preserve this contract while moving code.

### Step 503 - Extract `chart-replay-pane-orchestrator.js`

Status: completed.

Goal: remove pane orchestration from `chart-replay-route.js` without changing
runtime ownership or behavior.

Move out of route:

- `activePaneDisplayTimeframe`;
- `mountChartHosts`;
- `releaseRemovedChartPanes`;
- `paneInitialDisplayTimeframe`;
- `ensurePaneLocalDisplay`;
- `ensureNonPrimaryPaneDisplays`;
- `setActivePaneDisplayTimeframe`.

New module contract:

- receives `root`, `dispatchCommand`, session/replay-loaded getters, and status
  setters;
- exposes `applyLayoutState(layoutState)`, `activeDisplayTimeframe()`,
  `setActivePaneDisplayTimeframe(payload)`, `ensureNonPrimaryPaneDisplays()`,
  and `dispose()`;
- dispatches only layout/replay/chart commands;
- does not render route shell markup;
- does not call chart engine APIs;
- does not request bars directly.

Route after Step 503:

- owns page construction, controller wiring, top-level event subscriptions, and
  route teardown;
- delegates pane host/display/TF orchestration to the new module.

Acceptance:

- no behavior changes;
- `chart-replay-route.js` loses the pane orchestration block;
- active-pane TF and fresh two-pane TF isolation remain covered by browser
  smoke.

Step 503 result:

- added `v5/src/features/chart-replay/chart-replay-pane-orchestrator.js`;
- reduced `chart-replay-route.js` from 636 lines at audit time to 541 lines;
- moved active-pane display timeframe derivation, chart host mount/release,
  non-primary pane display initialization, and active-pane TF fan-out out of the
  route;
- left time/date-range/crosshair layout sync in the route for Step 504.

### Step 504 - Extract `chart-replay-layout-sync-controller.js`

Status: completed.

Goal: put route-level sync effects behind one module.

Move out of route:

- `syncLayoutTime`;
- `syncLayoutDateRange`;
- `syncLayoutCrosshair`;
- sync-event decision logic for `CHART_EVENTS.VISIBLE_RANGE_CHANGED` and
  `CHART_EVENTS.CROSSHAIR_CHANGED`.

New module contract:

- receives `dispatchCommand`, layout-state getter, route layout-state applier,
  and replay-status refresh callback;
- exposes `syncTime(time)`, `syncDateRange(visibleRange)`,
  `syncCrosshair(crosshair)`, and `handleChartVisibleRangeChanged(payload)`;
- dispatches layout commands only;
- does not write chart data;
- does not request bars;
- does not mutate replay cursor/reveal state.

Route after Step 504:

- subscribes to events but delegates layout sync policy.

Acceptance:

- Go to / Jump cursor active-pane behavior unchanged;
- dateRange sync and crosshair sync smoke behavior unchanged.

Step 504 result:

- added `v5/src/features/chart-replay/chart-replay-layout-sync-controller.js`;
- reduced `chart-replay-route.js` from 541 lines after Step 503 to 517 lines;
- moved `syncLayoutTime`, `syncLayoutDateRange`, `syncLayoutCrosshair`, and
  chart visible-range/crosshair event sync decisions out of the route;
- kept the controller limited to layout command dispatch and route callbacks,
  with no chart writes, bar requests, or replay cursor mutation.

### Step 505 - Split Pane Shell DOM And Resize

Status: completed.

Goal: keep pane shell focused on layout-state rendering and pane selection.

Create `chart-replay-pane-dom.js`:

- `paneTitle`;
- `splitHandleSpecs`;
- `createChartPane`;
- `createSplitHandle`;
- `updatePaneElement`.

Create `chart-replay-split-resize-controller.js`:

- split handle positioning;
- pointer capture and drag state;
- ratio dispatch through `layout.setSplitRatio`;
- resize cleanup/dispose.

Leave in `chart-replay-pane-shell.js`:

- controller lifecycle;
- render-state orchestration;
- active-pane selection and optimistic active-pane intent;
- delegating pane DOM updates and resize behavior.

Acceptance:

- pane shell line count falls materially;
- split drag still uses layout runtime ratios, not pixels;
- active-pane selection and controls remain unaffected.

Step 505 result:

- added `v5/src/features/chart-replay/chart-replay-pane-dom.js`;
- added
  `v5/src/features/chart-replay/chart-replay-split-resize-controller.js`;
- reduced `chart-replay-pane-shell.js` from 414 lines at audit time to 140
  lines;
- kept active-pane selection and optimistic selection intent in pane shell;
- moved static pane DOM helpers and split handle specs out of pane shell;
- moved split handle positioning, pointer drag state, `layout.setSplitRatio`
  dispatch, window resize handling, animation-frame scheduling, and resize
  cleanup into the split resize controller.

### Step 506 - Split `chart-runtime-pane-state.js`

Status: completed.

Goal: remove pane-state branching helpers from `chart-runtime.js` while keeping
chart runtime as the only chart writer.

Move out of `chart-runtime.js`:

- `normalizePaneId`;
- `cloneChartStateSnapshot`;
- `stateForPane`;
- `updatePaneDisplayState`;
- `retainedPaneIdSet`;
- primary/pane-local host sync target helpers where practical.

Keep in `chart-runtime.js`:

- command registration;
- event emission;
- chart adapter lifecycle commands;
- high-level mutation orchestration;
- actual chart write dispatch through host sync/adapter.

Acceptance:

- no command contract changes;
- pane-local bars/visible range/viewport demand still pass browser smoke;
- chart runtime file becomes easier to reason about without hiding chart writes
  in helper modules.

Step 506 result:

- added `v5/src/runtime/chart-runtime-pane-state.js`;
- moved pane id normalization, chart state snapshot cloning, retained pane id
  sets, pane-state projection, and pane display-state patching out of
  `chart-runtime.js`;
- kept chart command registration, event emission, host lifecycle, host sync,
  and adapter writes in `chart-runtime.js`;
- kept helper functions pure by passing `primaryState` and
  `paneDisplayStateByPaneId` in from chart runtime.

### Step 507 - Extract Replay Pane Display Merge Helper

Status: completed.

Goal: isolate non-primary display-window merge rules from primary replay
display-window loading.

Create `replay-pane-display-loader.js` or
`replay-pane-display-window-state.js`:

- build duplicate demand keys including pane id;
- fetch target pane display snapshot through `chart.getRenderedBars({ paneId })`;
- normalize base bars/timeframe;
- decide merge eligibility;
- expose diagnostics such as base and merged bar counts.

Keep in `replay-display-window-controller.js`:

- replay display-window command ownership;
- bar-data `LOAD_WINDOW` dispatch;
- chart sync dispatch;
- replay state updates and event emission.

Acceptance:

- non-primary viewport demand still merges with existing pane bars;
- route UI still does not read chart snapshots or request bars;
- primary display-window behavior unchanged.

Step 507 result:

- added `v5/src/runtime/replay-pane-display-window-state.js`;
- moved replay pane id normalization, display-window demand key construction,
  target-pane rendered-bars snapshot reads, base display bars/timeframe
  resolution, merge eligibility, and display-window attempt summaries out of
  `replay-display-window-controller.js`;
- kept bar-data `LOAD_WINDOW` requests, chart sync writes, replay state
  updates, and replay display events in `replay-display-window-controller.js`;
- preserved the documented command boundary where non-primary pane merge logic
  reads target-pane snapshots through `chart.getRenderedBars({ paneId })`.

## Acceptance Criteria

Each refactor step must pass:

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `git diff --check`

For chart-runtime helper extraction, also run:

- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`

## Forbidden During Refactor

- Do not add new multi-pane features while extracting boundaries.
- Do not move bar requests into route UI.
- Do not let layout runtime write chart series or load bars.
- Do not let chart runtime decide replay cursor/reveal state.
- Do not add per-pane toolbar controls to hide active-pane state problems.
- Do not preserve confusing function names just because behavior is unchanged.

## Bottom Line

The current multi-pane implementation is salvageable, but it needs a deliberate
module split now. The first split should be route-level pane orchestration,
because that is where most accidental coupling is currently accumulating.
