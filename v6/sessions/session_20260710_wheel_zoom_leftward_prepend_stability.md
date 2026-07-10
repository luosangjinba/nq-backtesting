# V6 Wheel-Zoom Leftward Prepend Stability

Date: 2026-07-10

Status: completed as an inserted stability fix before Step 258 selection.

## Context

Manual right-drag leftward extension already preserves the visible K-line
position by compensating the logical range after older bars are prepended.
Wheel zoom out can also expose canvas-left empty space and request older bars,
but Lightweight Charts may continue settling the zoom range after `setData`.
That can make existing K-lines look like they jump while older bars are loaded.

## Changes

- Chart surface now records recent pane-local wheel range input.
- Older-bar prepend still immediately applies the shifted logical range.
- When that prepend follows recent wheel input, chart surface schedules a short
  measured-range check and reapplies the shifted range only if the library
  drifted away from the compensated target.
- Drag/manual paths do not get the delayed reapply, so active dragging is not
  pulled back by a wheel-specific guard.

## Verification

- `node v6/tests/chart-surface-wheel-prepend-range-stability-smoke.js`
- `node v6/tests/chart-surface-prepend-visible-range-stability-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/leftward-history-htf-stability-browser-step198-smoke.js`
- `node v6/tests/chart-drag-release-lifecycle-browser-smoke.js`
