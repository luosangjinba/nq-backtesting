# Step 483 - V5 Fast Replay Next

## Goal

Fix replay advancement feeling slow in both single-pane and multi-pane layouts.
Rapidly clicking Next should not reveal bars one-by-one with an API/render delay
between each bar.

## Result

- Bar-data runtime can satisfy a requested window from a larger cached
  same-instrument/timeframe window by slicing cached bars.
- Replay start-bar resolution now loads a bounded forward reveal window so the
  first several Next operations can use cache without putting future bars into
  chart/display state.
- Replay `next` handles `stepCount > 1` as a batched advance:
  - loads/uses one forward reveal window;
  - persists the final cursor once;
  - appends all newly revealed bars to display state;
  - renders the chart once at the final cursor.
- Chart replay controls coalesce rapid Next clicks into one `stepCount`
  command instead of queueing one full command per click.
- A browser regression simulates 120ms bars API latency and verifies ten rapid
  Next clicks reach ten revealed bars without additional forward requests after
  initial load.

## Boundaries

- Future bars are cached only in bar-data runtime.
- Replay runtime still reveals bars only through Next/Play and never exposes
  future bars in display state.
- Chart runtime remains the only chart writer.
- The route UI still dispatches replay commands; it does not request bars or
  write chart series directly.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-controls.js`
- `node --check v5/src/runtime/bar-data-runtime.js`
- `node --check v5/src/runtime/replay-bootstrap-controller.js`
- `node --check v5/src/runtime/replay-navigation-controller.js`
- `node --check v5/src/runtime/replay-runtime-state.js`
- `node v5/tests/bar-data-runtime-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-cursor-persistence-smoke.js`
- `node v5/tests/replay-session-end-smoke.js`
- `node v5/tests/replay-display-progression-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`

## Next

Step 484 should measure multi-pane playback and resize write counts in browser
before adding more split-pane behavior.
