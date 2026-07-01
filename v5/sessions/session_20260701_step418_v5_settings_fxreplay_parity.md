# V5 Session Handoff - Step 418 Settings FXReplay Parity Pass

Date: 2026-07-01

## Status

Step 418 is complete.

## Goal

Improve Chart Settings parity with FXReplay by adding low-risk presentation
controls while preserving V5 runtime ownership boundaries and Settings
Ok/Cancel draft semantics.

## Changes

- Added `showStatusTitle` and `showOpenMarketStatus` presentation settings.
- Wired those status settings to the chart canvas top-left OHLC overlay:
  - title controls instrument/timeframe text;
  - open-market status controls the status dot.
- Added explicit Settings margin inputs for top and bottom chart margins while
  keeping the existing compact margin shortcut.
- Added `backgroundStyle` and `scaleStyle` presentation settings:
  - chart background color;
  - scale text color;
  - scale line color;
  - scale font size.
- Extended presentation runtime normalization:
  - background/scale colors normalize to `#rrggbb`;
  - scale font size is bounded.
- Carried background/scale style through chart runtime display context.
- Applied background/scale style in the chart-engine adapter:
  - Lightweight layout background/text/font options;
  - Lightweight time-scale and price-scale border colors;
  - DOM fallback metadata and fallback style fields.
- Updated Chart Settings browser smoke so new controls remain draft-only until
  `Ok` and do not change replay cursor, display bars, or `/v4/bars` requests.
- Updated chart presentation spec and TODO.

## Invariants

- UI dispatches presentation/display-context commands and does not call chart
  engine APIs directly.
- Chart runtime remains the only writer of chart series and chart presentation.
- Presentation changes do not mutate replay cursor, reveal state, display bars,
  bar-data cache, or loaded windows.
- Bar data runtime remains the only requester/cache owner for bars.
- Replay runtime remains the only owner of replay cursor and reveal state.
- The chart route still exposes one active pane: `primary`.

## Non-Goals

- No price-scale mode/placement implementation.
- No watermark or session-break implementation.
- No template persistence system.
- No split-pane layout or chart sync work.

## Verification

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Candidates

- Plan the remaining Settings parity items before implementation:
  price-scale modes/placement, time-scale date format, watermark/session breaks,
  and template behavior.
- Continue single-pane chart polish before split panes.
