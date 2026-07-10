# V6 Session - Step 260 Chart Foundation Next Slice Selection

Date: 2026-07-10

## Context

Step 260 followed the Manual Next Session Gap Regression Pack. The current
foundation has focused packs for replay/transport, multi-pane behavior,
date-range entry, visible K-line latency, and single-step manual-next session
gap continuation.

## Decision

Step 260 selected Step 261 as **Playback Period Session Gap Regression Pack**.

The next slice should preserve replay continuation across no-bar session breaks
when playback period settings make one manual `Next` advance multiple source
bars. This stays inside replay, playback-period, chart-entry, chart-data, and
display-timeframe chart foundation behavior.

## Verification

- `node v6/tests/chart-foundation-next-slice-selection-step260-smoke.js`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-static-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Notes

No runtime behavior, data loading, replay semantics, chart-data projection,
viewport logic, indicators, trading simulation, order tickets, prop firm rule
engines, or journal workflows changed in this selection step.
