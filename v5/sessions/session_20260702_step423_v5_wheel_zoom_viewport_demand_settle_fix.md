# Step 423 - V5 Wheel Zoom Viewport Demand Settle Fix

Date: 2026-07-02

Status: completed.

## Trigger

User reported that wheel zoom could expose blank canvas space to the left of
loaded K-lines without automatically extending older bars. A later left-click
or drag sometimes stimulated the chart, but sometimes the K-lines stayed pinned
at the pre-zoom leftmost candle.

## Root Cause

Wheel input was treated as an active Lightweight native interaction for only
the default short settle window. That was shorter than the viewport-demand
bridge debounce. In some wheel/zoom timing, older-bar demand and chart writes
were not reliably coalesced into the same settled flush path used by mouse drag.

Also, after a native interaction settled, chart runtime did not re-emit an
already-computed viewport demand. If the initial demand event was missed or
arrived too early for the replay bridge timing, no final settled demand
guaranteed the left extension load.

## Fix

- Wheel input now keeps Lightweight native interaction active for 260ms.
- Native interaction settle re-emits the current viewport demand when one
  exists. The replay viewport-demand bridge de-dupes by demand key, so repeated
  settled emissions do not create duplicate loads.
- Adapter smoke verifies wheel remains active past 150ms and then settles.
- Runtime/adapter smoke verifies a wheel-origin native visible range emits
  viewport demand again after settle.

## Verification

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
