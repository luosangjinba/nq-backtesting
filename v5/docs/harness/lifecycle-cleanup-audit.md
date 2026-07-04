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

## Step 493 Resolved Items

### Pane Shell Controller Dispose

`v5/src/features/chart-replay/chart-replay-pane-shell.js`

Step 493 result:

- `createChartReplayPaneShellController` returns `dispose()`.
- `dispose()` removes delegated shell listeners.
- `dispose()` removes `window.resize`.
- `dispose()` cancels pending animation frame when available.
- `dispose()` clears split drag state and resize visual state.
- Chart route teardown calls `paneShellController.dispose?.()`.

### Replay Controls Controller Dispose

`v5/src/features/chart-replay/chart-replay-controls.js`

Step 493 result:

- `createChartReplayControlsController` returns `dispose()`.
- `dispose()` removes control listeners.
- `dispose()` clears `pendingNextTimer`.
- `dispose()` zeros pending Next step count and marks the controller disposed.
- Async command/timer continuations check disposed state before mutating route
  UI.
- Chart route teardown calls `replayControlsController.dispose?.()`.

## Step 494 Resolved Items

### Chart Route Controller Dispose Shape

Step 494 standardizes the remaining route controller cleanup shape:

- `chart-replay-layout.js` exposes `dispose()` and tracks Layout popover,
  mode, and sync listeners.
- `chart-replay-navigation.js` exposes `dispose()` and tracks Go-to,
  reset-view, and jump-cursor listeners.
- `chart-replay-truncate.js` exposes `dispose()` and tracks truncate pick
  listeners, error popover listeners, and Escape key handling.
- `replay-floating-controls.js` exposes `dispose()` and tracks floating
  transport pointer listeners.
- `chart-settings-modal.js` exposes `dispose()` and tracks Settings modal,
  cancel, backdrop, and tab listeners.
- Settings field binding adapters expose `dispose()` for draft field listeners.
- `chart-settings-panel.js` exposes `dispose()` and releases Settings modal,
  apply button, and field bindings.
- `chart-replay-route.js` owns a `controllerDisposers` stack and drains it
  during route teardown before timers/subscriptions are cleared.

## Step 495 Resolved Items

### Pane-Local Chart State Release

`v5/src/runtime/chart-runtime.js`

Step 495 result:

- `chart.releasePanes` is the chart-runtime-owned release command for layout
  pane removal.
- `chart-replay-route.js` dispatches `chart.releasePanes` with the current
  layout pane ids after layout rendering and host mounting.
- Chart runtime clears pane-local display state for non-primary pane ids no
  longer present in layout state.
- Chart runtime destroys non-retained pane adapters and removes stale pane host
  map entries.
- `chart-runtime.stop()` clears all pane-local display state, in addition to
  disconnecting observers and destroying adapters.

## Step 496 Resolved Items

### Bar Data Cache Scope Retention

`v5/src/runtime/bar-data-runtime.js`

Step 496 result:

- `barData.releaseScope` is the bar-data-runtime-owned release command for
  session/pane cache scope removal.
- Bar-data cache keys remain instrument/timeframe/range based so cross-pane
  reuse is preserved.
- Cached windows now track optional `sessionId` / `paneId` scope metadata from
  replay runtime requests.
- Releasing one pane scope keeps a shared cached window when another scope still
  references it.
- Releasing the final scope marks the window deferred by default, preserving the
  delayed release behavior required for smooth pan-back.
- `barData.pruneCache` is the capacity gate that removes deferred or least
  recently used windows.
- `barData.getCacheSummary` exposes `cacheScopes` and `releaseDeferred` for
  lifecycle smoke assertions.

## Remaining Cleanup Backlog

### 1. Browser Route Teardown Needs A Lifecycle Behavior Smoke

`v5/src/features/chart-replay/chart-replay-route.js`

Risk:

- Static checks prove disposal paths exist, but a browser smoke should still
  verify route switching cannot leave a pending controller timer/window listener
  mutating removed DOM.

Required follow-up:

- Add a browser route teardown smoke that enters chart route, creates controller
  state, switches routes, and verifies stale listeners/timers are inert.

## Step 493+ Priority

Recommended implementation order:

1. Add a browser route teardown smoke that switches away from chart route and
   verifies no pending controller timer/window listener can mutate removed DOM.
