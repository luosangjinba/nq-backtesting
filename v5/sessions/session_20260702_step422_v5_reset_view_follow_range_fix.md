# Step 422 - V5 Reset View Follow Range Fix

Date: 2026-07-02

Status: completed.

## Trigger

User reported that after creating a replay session, dragging/zooming the chart,
and clicking the top-right Reset View button, the chart did not reliably return
to the expected cursor-follow view. Further wheel zoom or right drag could make
the left extension disappear or reappear unpredictably.

## Root Cause

`chart.resumeViewportFollow` set interaction mode back to `follow` but did not
clear the chart runtime's previous `state.visibleRange`. During chart host sync,
V5 applied the follow logical range and then wrote the stale manual/native range
back into the adapter.

`SET_VIEWPORT_FOLLOW({ resume: true })` already cleared `visibleRange`, so the
bug was specific to the direct command used by Reset View / jump-to-cursor UI.

## Fix

- `RESUME_VIEWPORT_FOLLOW` now clears `state.visibleRange`.
- It also clears stale prefix/viewport demand because explicit follow has no
  manual visible range.
- Chart host sync now calls `adapter.setVisibleRange(...)` only in manual
  interaction mode.
- Added smoke coverage for direct `chart.resumeViewportFollow` after a manual
  range and for interaction state returning with `visibleRange: null`.

## Verification

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
