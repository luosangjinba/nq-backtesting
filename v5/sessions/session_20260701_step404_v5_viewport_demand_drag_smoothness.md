# Step 404 - V5 Viewport Demand Drag Smoothness

Date: 2026-07-01

Status: completed.

## Goal

Investigate why dragging the chart left feels stuttery and define a bounded
implementation plan before changing code.

## Observation

The symptom is hard to quantify visually, but the code path shows a plausible
cause: native drag events are coupled too tightly to viewport demand loading and
chart data replacement.

Relevant path:

- Lightweight Charts emits `subscribeVisibleTimeRangeChange` while the user is
  dragging.
- Chart runtime records the native visible range, computes viewport demand, and
  emits `chart:viewportDemand`.
- The replay viewport demand bridge immediately dispatches
  `replay.loadDisplayWindow`.
- Replay runtime loads/merges bounded display windows and calls
  `chart.replaceBars`.
- The Lightweight adapter calls `series.setData`.

When dragging left near the loaded-history boundary, this can interleave native
drag movement with bounded history loads, display merges, and full chart data
replacement. That is a likely explanation for uneven new K-line rendering.

## Root Cause Hypothesis

The performance issue is not primarily a CSS/layout issue or a simple
Lightweight Charts rendering problem. The higher-probability cause is excessive
work caused by this chain:

`native visible range event -> viewport demand -> load display window -> merge
display bars -> replaceBars -> series.setData`

The current demand bridge also keys demands with high-frequency range details,
so tiny drag movements can be treated as separate demand events.

## Decision

Native drag should stay native and responsive. Chart runtime may update manual
visible range state immediately, but replay-owned history loading should be
settled, coalesced, or debounced. Demand identity should be based on the bounded
load window, not every observed visible range.

Cached or duplicate display windows must not trigger another full chart data
replacement when the merged display bars have not changed.

## Implementation

1. Added a coalescing/debounce layer around viewport demand consumption.
   The replay viewport demand bridge now uses trailing demand dispatch with a
   default 140ms settle window.

2. Normalized demand identity around stable load-window fields:
   session id, instrument, display timeframe, direction, anchor, and normalized
   count. It no longer keys by high-frequency `visibleFrom`/`visibleTo`.

3. Kept chart manual range updates immediate.
   The user should see native pan movement without waiting for replay/bar-data
   work.

4. Avoided redundant data replacement.
   If a loaded/cached window merges to the same display bar timestamp sequence,
   replay runtime does not call `chart.replaceBars`; the adapter therefore does
   not call `series.setData`.

5. Added measurement-focused coverage.
   The viewport demand wiring smoke now verifies drag-frame jitter coalesces
   into one replay load. The display timeframe smoke verifies cached unchanged
   display windows do not call `chart.replaceBars` again.

## Success Criteria

- Left drag remains visually smooth while the pointer is moving.
- History loads happen after drag settles or in coarse batches, not for every
  native range event.
- Cached duplicate demand does not repeatedly call `series.setData`.
- Replay runtime remains the only owner of display history growth.
- Bar data runtime remains the only owner of bounded bar requests/cache.
- Existing no-future and right-edge clamp rules remain intact.

## Checks

- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Continue with manual visual validation of left drag. If stutter remains, add a
browser-level drag performance harness that records native visible-range event
counts, replay load counts, and `series.setData` counts during a synthetic drag.
