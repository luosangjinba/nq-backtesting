# Lifecycle Cleanup Audit

Date: 2026-07-03

Related spec: `v5/docs/specs/runtime-lifecycle-cleanup.md`

## Scope

Step 492b audited high-risk V5 resource creation paths:

- route lifecycle;
- command/event bus registration;
- chart runtime host and adapter lifecycle;
- Lightweight Charts subscriptions and interaction listeners;
- fallback chart input listeners;
- multi-pane shell listeners and split-resize frame scheduling;
- replay viewport-demand debounce timer;
- replay playback interval timer;
- chart replay controls pending Next batching timer.

## Current Safe Paths

### Router

`v5/src/runtime/router.js`

- Calls `currentElement?.dispose?.()` before replacing the current route.
- Route-level teardown can therefore be reached when a route element exposes a
  `dispose` method.

### Command And Event Bus

`v5/src/runtime/commands.js`

- `registerCommand` returns an unregister function.

`v5/src/runtime/events.js`

- `subscribeEvent` returns an unsubscribe function.

### Chart Runtime

`v5/src/runtime/chart-runtime.js`

- Stores command unregister callbacks and event unsubscribe callbacks.
- `stop()` disconnects its `MutationObserver`.
- `stop()` unregisters command/event callbacks.
- `stop()` destroys every mounted chart adapter.
- Replacing a pane host destroys the previous adapter for that pane.

`v5/src/runtime/chart-runtime-host-sync.js`

- `pruneDisconnectedHosts()` destroys adapters for disconnected hosts and
  removes stale host references from runtime maps.

### Chart Engine Adapters

`v5/src/runtime/chart-engine-lightweight-adapter.js`

- `destroy()` unbinds Lightweight interaction listeners.
- `destroy()` unsubscribes visible-range and crosshair subscriptions.
- `destroy()` detaches watermark when available.
- `destroy()` calls the Lightweight chart `remove()` API.
- `destroy()` clears host callback references and local bar/range state.

`v5/src/runtime/chart-engine-lightweight-interaction.js`

- Keeps native interaction settle timer local to the tracker.
- `reset()` clears the settle timer.
- `unbind()` removes canvas and document listeners.

`v5/src/runtime/chart-engine-fallback-adapter.js`

- `destroy()` removes fallback canvas listeners.
- `destroy()` clears local callbacks, bars, visible range, and drag state.

### Replay Timers And Viewport Demand

`v5/src/runtime/replay-playback-controller.js`

- `pause()` clears the playback interval.
- `reset()` calls `pause()` and clears playback state.

`v5/src/features/chart-replay/viewport-demand-wiring.js`

- `stop()` unsubscribes from `CHART_EVENTS.VIEWPORT_DEMAND`.
- `stop()` clears pending debounce timer and demand maps.

### Chart Route

`v5/src/features/chart-replay/chart-replay-route.js`

- Route element exposes `dispose`.
- `dispose` clears the initial load timer.
- `dispose` stops the viewport-demand bridge.
- `dispose` unsubscribes route event subscriptions.
- `dispose` dispatches replay pause so playback interval cleanup is reachable.

## Cleanup Backlog

### 1. Pane Shell Controller Needs Dispose

`v5/src/features/chart-replay/chart-replay-pane-shell.js`

Risk:

- Adds delegated listeners to the pane shell.
- Adds `window.resize` listener.
- Schedules handle positioning with `requestAnimationFrame`.
- Holds drag state and active pane state in closure.
- Currently returns only `renderState`, so route dispose cannot call pane-shell
  cleanup directly.

Required follow-up:

- Return `dispose()` from `createChartReplayPaneShellController`.
- Remove shell listeners or use tracked cleanup helpers.
- Remove `window.resize` listener.
- Cancel any pending animation frame if the environment supports
  `cancelAnimationFrame`.
- Clear drag state.
- Call `paneShellController.dispose?.()` from chart route `dispose`.

### 2. Replay Controls Controller Needs Dispose

`v5/src/features/chart-replay/chart-replay-controls.js`

Risk:

- Adds listeners to replay controls.
- Owns `pendingNextTimer`, `pendingNextStepCount`, and `nextBatchRunning`.
- Async queue may finish after route disposal.
- Currently returns control methods but no `dispose`.

Required follow-up:

- Return `dispose()` from `createChartReplayControlsController`.
- Clear `pendingNextTimer`.
- Zero pending step count.
- Mark controller disposed so delayed flushes and async command completions
  stop mutating removed route DOM.
- Call `replayControlsController.dispose?.()` from chart route `dispose`.

### 3. Other Route Controllers Should Standardize Dispose

Current route controllers rely mostly on DOM removal and route closure
unreachability. That is acceptable only when there are no timers, global
listeners, observers, or bus subscriptions.

Required follow-up:

- Make controller return shape consistent: every route controller may expose
  `dispose`, even if it is a no-op today.
- Prioritize controllers that add root/document/window listeners or timers.

Initial candidates:

- `chart-replay-layout.js`
- `chart-replay-navigation.js`
- `chart-replay-truncate.js`
- `replay-floating-controls.js`
- `chart-settings-modal.js`
- `chart-settings-panel.js`

### 4. Chart Runtime Should Release Pane-Local Display State For Removed Panes

`v5/src/runtime/chart-runtime.js`

Risk:

- `paneDisplayStateByPaneId` can retain pane-local bars/ranges for panes that
  are no longer in the current layout.
- Host pruning removes disconnected hosts/adapters, but pane display state
  release is not yet explicitly tied to layout pane removal.

Required follow-up:

- Add a chart-runtime command or layout-change bridge that clears pane-local
  chart state for pane ids no longer present.
- Keep primary/global replay state intact.

### 5. Bar Data Cache Retention Needs A Lifecycle Test Gate

`v5/src/runtime/bar-data-runtime.js`

Risk:

- Bar-data runtime owns cache/retention policy, but lifecycle checks should
  assert cache release remains bounded as multi-pane display windows grow.

Required follow-up:

- Add or extend smoke coverage around release/retention after session or pane
  changes.

## Step 493+ Priority

Recommended implementation order:

1. Add controller dispose for pane shell and replay controls.
2. Call controller disposers from chart route `dispose`.
3. Add a route teardown smoke that switches away from chart route and verifies
   no pending controller timer/window listener can mutate removed DOM.
4. Add pane-local chart state release when panes disappear from layout.
5. Add/extend bar-data cache retention checks for multi-pane workloads.

