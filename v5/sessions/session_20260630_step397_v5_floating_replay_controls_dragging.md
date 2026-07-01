# Step 397 - V5 Floating Replay Controls Dragging

Date: 2026-06-30

## Goal

Make the replay transport drag handle move the floating control bar inside the
chart viewport.

## Scope

This step advances Historical Replay Review by making the FXReplay-style
transport behave like a movable chart overlay.

In scope:

- pointer-driven dragging from the transport drag handle;
- viewport clamping with padding for chart axes;
- route-local overlay position;
- browser smoke coverage for drag movement, bounds, and post-drag controls.

Out of scope:

- persisted overlay position;
- selected-bar truncation runtime behavior;
- previous-bar stepping runtime behavior;
- active chart interval sync runtime behavior;
- Layout split panes;
- drawing tools;
- order or journal workflows.

## Plan

- [x] Add Step 397 plan and drag-handle decision to `v5/TODO.md`.
- [x] Add `data-replay-drag-handle`.
- [x] Implement pointer drag on the handle only.
- [x] Clamp the floating controls inside the chart viewport.
- [x] Keep position as route-local UI state.
- [x] Extend browser smoke coverage for drag movement and no replay mutation.
- [x] Run targeted smokes, full V5 smoke, and `git diff --check`.

## Implementation Notes

- `v5/src/features/chart-replay/chart-replay-route.js` tracks a route-local
  `floatingPosition` and applies explicit `left/top` coordinates only after the
  user drags the handle.
- Dragging is started only from `data-replay-drag-handle`; body drag does not
  move the overlay.
- Drag events stop propagation so the chart does not interpret the handle drag
  as chart pan.
- The overlay is clamped inside `.chart-viewport` with right and bottom padding
  reserved for chart axes.
- Dragging does not dispatch replay commands and does not request bars.

## Manual Acceptance

- Dragging the handle moves the replay controls.
- Dragging the control body outside the handle does not initiate movement.
- The control bar remains inside the chart viewport after drag.
- Next/Play/Pause still work after moving the overlay.
- Dragging does not advance replay, request bars, or bypass runtime ownership.

## Checks

- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

All checks passed before commit.
