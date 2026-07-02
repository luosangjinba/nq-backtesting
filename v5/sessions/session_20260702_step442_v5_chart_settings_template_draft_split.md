# Step 442 - V5 Chart Settings Template And Draft Helper Split

Status: completed.

Date: 2026-07-02

## Goal

Continue Settings modular cleanup by separating static Settings markup and
draft/clone helpers from the route-local Settings controller.

## Plan

1. Identify the static template and draft-helper responsibilities inside
   `chart-settings-panel.js`.
2. Add `chart-settings-template.js` for modal HTML only.
3. Add `chart-settings-draft.js` for clone helpers, draft creation, and apply
   draft cloning.
4. Keep command/runtime mutation ownership unchanged through route-provided
   `onApply` and `onCancel` callbacks.
5. Update TODO/session handoff documentation, run focused smokes, full smoke
   suite, and `git diff --check`.

## Implementation

- Added `features/chart-replay/chart-settings-template.js` with
  `renderChartSettingsPopover()`.
- Added `features/chart-replay/chart-settings-draft.js` with style clone
  helpers, candle style helpers, settings draft creation, and apply draft
  cloning.
- Updated `chart-replay-template.js` to import the Settings markup from the new
  template module.
- Updated `chart-settings-panel.js` to import draft helpers and re-export the
  existing clone helper API used by `chart-replay-route.js`.
- Reduced `chart-settings-panel.js` from 690 lines to 389 lines.

## Boundary Notes

- `chart-settings-template.js` owns static Settings markup only.
- `chart-settings-draft.js` owns pure draft/clone helpers only.
- `chart-settings-panel.js` remains the route-local Settings controller for DOM
  queries, render wiring, event binding, open/close, and apply/cancel handling.
- Settings modules still do not dispatch runtime commands directly. Presentation
  and timezone changes continue through route callbacks and the existing runtime
  command path.

## Verification

- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node --check v5/src/features/chart-replay/chart-settings-template.js`
- `node --check v5/src/features/chart-replay/chart-settings-draft.js`
- `node --check v5/src/features/chart-replay/chart-replay-template.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 443 should continue `chart-settings-panel.js` cleanup by splitting section
render/event binding adapters while preserving the draft-only apply/cancel flow.
