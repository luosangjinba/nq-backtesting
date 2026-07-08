# V6 Session - Step 168 Symbol/Interval Sync Boundary

Date: 2026-07-08

## Completed

Step 168 decided the owner boundary for future Symbol/Interval layout sync.

Commits:

- `0df39952 docs(v6): define symbol interval sync boundary`
- `377d7466 test(v6): guard symbol interval sync boundary`

## Changes

- Documented that Symbol and Interval sync are not chart-only effects.
- Kept `layout-sync-surface-bridge` limited to `dateRange`, `time`, and
  `crosshair` chart-only sync.
- Selected a future dedicated sync runtime boundary for Symbol/Interval fan-out.
- Reserved pane-runtime for explicit pane-local symbol/interval intent state.
- Added a boundary smoke that prevents Symbol/Interval reload logic from
  entering the chart-only layout sync bridge.

## Verification

- `node v6/tests/symbol-interval-sync-boundary-step168-smoke.js`
- `node v6/tests/layout-sync-effects-model-step166-smoke.js`
- `node v6/tests/layout-sync-surface-bridge-step166-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 169 should add explicit pane-local Symbol/Interval intent state before any
sync fan-out or data reload behavior is implemented.
