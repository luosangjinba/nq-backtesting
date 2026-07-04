# Step 510 - Pane Replay Follow Visible Range

Date: 2026-07-04

## Trigger

Manual testing still reproduced the Step 509 scenario:

- open a two-pane vertical layout;
- do not interact with either pane;
- click replay `Next` immediately;
- the right/secondary pane could still appear blank even though pane data was
  present.

The missing guard was not data loading. The non-primary pane append path could
increase `fullBarCount` without advancing that pane's own viewport-follow
cursor, so browser coverage that only checked bar counts could miss a visible
blank pane.

## Fix

- `chart-replay-pane-orchestrator.js` now reads pane-local viewport metrics
  before same-timeframe replay append.
- Non-primary pane replay append now passes pane-local `viewportFollow` with
  the replay cursor timestamp into `chart.appendBars`.
- Chart runtime still remains the only chart writer; the route/pane
  orchestrator only dispatches chart commands.
- `replay-workstation-layout-browser-smoke.js` now verifies that the secondary
  pane has rendered visible bars after the immediate `Next` path, not only that
  its backing bar count increased.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-pane-orchestrator.js`
- `node --check v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`
- `git diff --check`

## Status

Completed.
