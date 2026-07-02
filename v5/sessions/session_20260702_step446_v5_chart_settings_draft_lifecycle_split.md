# Step 446 - V5 Chart Settings Draft Lifecycle Split

Status: completed.

Date: 2026-07-02

## Goal

Continue Settings modularization by moving draft lifecycle and apply/cancel flow
out of `chart-settings-panel.js`.

## Plan

1. Define the split boundary as Settings draft lifecycle, not runtime mutation
   or persistence.
2. Add a lifecycle module for draft creation, lookup, rendering, discard, apply
   clone, and successful apply cleanup.
3. Keep `chart-settings-panel.js` as the composition layer for modal shell,
   field bindings, and lifecycle wiring.
4. Preserve apply success ordering: route apply completes, modal hides, then
   current route state is rendered.
5. Update TODO/session handoff documentation and run syntax checks, focused
   smokes, full smoke suite, and `git diff --check`.

## Implementation

- Added `chart-settings-lifecycle.js`.
- Moved Settings draft creation, current draft lookup, current rendering,
  discard/cancel, apply cloning, and successful apply cleanup out of
  `chart-settings-panel.js`.
- Reduced `chart-settings-panel.js` from 82 lines to 62 lines.
- Preserved the existing modal apply behavior: failed route apply keeps the
  modal open and the draft editable; successful apply hides the modal before
  re-rendering current route state.

## Boundary Notes

- `chart-settings-lifecycle.js` may call route-provided apply/cancel callbacks.
- `chart-settings-lifecycle.js` must not dispatch runtime commands directly,
  emit events, write chart adapters, persist settings, or touch replay/bar-data
  state.
- `chart-settings-panel.js` composes lifecycle, modal, and bindings only.
- Settings field bindings still mutate only the active draft object exposed by
  the lifecycle module.

## Verification

- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node --check v5/src/features/chart-replay/chart-settings-lifecycle.js`
- `node --check v5/src/features/chart-replay/chart-settings-bindings.js`
- `node --check v5/src/features/chart-replay/chart-settings-modal.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 447 should continue Settings cleanup only if a clear boundary remains.
Otherwise move to the next larger file with a stronger product/runtime boundary.
