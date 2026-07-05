# V6 Step 21 - Settings Baseline

Date: 2026-07-05

## Scope

Step 21 established the first Settings owner and UI boundary. It intentionally
did not wire settings values into chart, replay, data, or viewport behavior.
That keeps Settings from becoming another cross-runtime ownership shortcut.

## Commits

- `61453e7 feat(v6): add settings runtime`
- `82f3b49 feat(v6): register settings runtime`
- `28ebfda feat(v6): mount settings panel`
- `3090181 test(v6): enforce settings boundaries`
- `a195d7c test(v6): verify settings panel browser flow`

## Implementation Notes

- Added `v6/src/settings/` with a settings model, store, and runtime.
- Added settings contracts for snapshot, update, reset, updated, and reset.
- Registered `runtime.settings` during V6 app startup.
- Added a Settings panel that dispatches settings commands only.
- Added boundary rules for settings modules and settings UI.
- Added browser coverage for opening Settings and updating theme, timezone,
  grid, and watermark settings.

## Verification

- `node v6/tests/settings-runtime-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/settings-panel-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 22 should polish replay transport behavior while preserving the existing
command-only UI boundary and replay visible-latency gates.
