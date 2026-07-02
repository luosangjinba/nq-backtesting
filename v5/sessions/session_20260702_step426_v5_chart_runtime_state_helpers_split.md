# Step 426 - V5 Chart Runtime State Helpers Split

Date: 2026-07-02

Status: completed.

## Trigger

User asked to continue modularizing with clean boundaries so future V5 features
do not inherit large mixed-responsibility files or hidden technical debt.

## Plan

- Step 426.1: Split only pure chart runtime helpers first.
- Step 426.2: Move state shape, timestamp/range normalization, bars,
  crosshair, and host metrics into a state helper module.
- Step 426.3: Move rendered-bar, prefix-demand, viewport-demand, go-to, zoom,
  pan, and manual-anchor calculations into a viewport helper module.
- Step 426.4: Keep command registration, event subscriptions, mounted host
  management, and adapter writes inside `chart-runtime.js`.
- Step 426.5: Run chart runtime and interaction smokes plus the full V5 smoke
  suite.

## Implementation

- Added `v5/src/runtime/chart-runtime-state.js`.
- Added `v5/src/runtime/chart-runtime-viewport.js`.
- Updated `v5/src/runtime/chart-runtime.js` to import pure helpers and keep
  runtime orchestration local.
- Reduced `chart-runtime.js` from 1069 lines to 606 lines.

## Guardrails

- New helper modules do not register commands or subscribe to events.
- New helper modules do not mount DOM hosts or write chart adapters.
- `chart-runtime.js` remains the chart runtime command/event owner.
- Chart adapter writes are still performed only by the chart runtime.

## Verification

- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/runtime/chart-runtime-state.js`
- `node --check v5/src/runtime/chart-runtime-viewport.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
