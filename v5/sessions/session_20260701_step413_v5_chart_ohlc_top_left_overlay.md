# Step 413 - V5 Chart OHLC Top-Left Overlay

Date: 2026-07-01

Status: completed.

## Goal

Render the current-bar OHLC readout in the chart canvas top-left area, matching
V4 and FX Replay visual placement.

## Plan

1. Add a read-only OHLC overlay inside the chart viewport.
2. Populate it from the same current display-bar formatting used by the footer
   OHLC status.
3. Tie show/hide behavior to the existing `showStatusOhlc` presentation setting.
4. Style the overlay as non-interactive top-left canvas text.
5. Update browser smoke coverage, TODO, interaction contracts, and handoff.

## Implementation

- Added `[data-chart-ohlc-overlay]` inside the chart viewport.
- The overlay displays instrument, display timeframe, and formatted OHLC.
- `refreshStatusLineValues()` now updates both the footer OHLC row and the chart
  overlay from the same latest display bar.
- The overlay hides when `showStatusOhlc` is disabled or no display bar exists.
- Added CSS so the overlay sits at the chart top-left and does not intercept
  pointer interaction.
- Updated `chart-presentation-browser-smoke.js` to verify initial overlay
  visibility and hide behavior.

## Acceptance

- The chart canvas shows instrument, timeframe, and OHLC at top-left.
- The overlay hides when the OHLC presentation setting is disabled.
- The overlay is read-only and does not intercept chart mouse interaction.
- Replay cursor, display bars, bar-data windows, and chart runtime ownership are
  unchanged.

## Checks

- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Continue single-pane polish before layout split panes. Chart settings surface
refinement and setup route visual cleanup remain good next candidates.
