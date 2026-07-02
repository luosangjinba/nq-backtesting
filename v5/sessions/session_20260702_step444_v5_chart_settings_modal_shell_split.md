# Step 444 - V5 Chart Settings Modal Shell Split

Status: completed.

Date: 2026-07-02

## Goal

Continue splitting `chart-settings-panel.js` by extracting Settings modal shell
behavior into its own route-local controller.

## Plan

1. Identify modal shell responsibilities still inside `chart-settings-panel.js`.
2. Add `chart-settings-modal.js` for popover open/close, cancel/backdrop, tab
   selection, and focus restoration.
3. Keep `chart-settings-panel.js` focused on composing draft helpers, field
   bindings, modal lifecycle hooks, apply, and route callbacks.
4. Update TODO/session handoff documentation.
5. Run syntax checks, focused browser smokes, full smoke suite, and
   `git diff --check`.

## Implementation

- Added `features/chart-replay/chart-settings-modal.js` with
  `createChartSettingsModalController(...)`.
- Moved modal open/cancel/backdrop/tab bindings and focus restoration from
  `chart-settings-panel.js` into the modal controller.
- Updated `chart-settings-panel.js` to provide `onOpen` and `onClose` hooks for
  draft creation/discard while keeping apply wiring in the composition
  controller.
- Reduced `chart-settings-panel.js` from 110 lines to 82 lines.

## Boundary Notes

- `chart-settings-modal.js` owns modal shell DOM behavior only.
- The modal shell may call lifecycle hooks supplied by the panel controller.
- The modal shell must not mutate Settings field values, dispatch runtime
  commands, write chart adapters, or touch replay/bar-data state.
- `chart-settings-panel.js` remains the route-local Settings composition
  controller.

## Verification

- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node --check v5/src/features/chart-replay/chart-settings-modal.js`
- `node --check v5/src/features/chart-replay/chart-settings-bindings.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 445 should decide whether to split `chart-settings-bindings.js` into
section-specific adapters or move to the next large file with a stronger
product-facing boundary.
