# V5 Session Handoff - Step 415 FXReplay Settings Modal

Date: 2026-07-01

## Status

Step 415 is complete.

## Goal

Upgrade Chart Settings toward the FXReplay settings dialog pattern and make the
top-left OHLC legend follow crosshair hover bars like V4.

## Changes

- Replaced the lightweight settings popover body with a formal modal structure:
  left-side sections, right-side grouped controls, and bottom `Cancel` / `Ok`.
- Added route-local settings draft state. Timezone and presentation controls no
  longer dispatch mutations until `Ok`; closing or cancelling discards edits.
- Kept only currently functional controls visible: display timezone, time
  format, OHLC/change/crosshair toggles, right offset, and compact margins.
- Styled the chart OHLC overlay as a segmented V4-like legend with grey labels
  and up/down colored values.
- Updated the OHLC overlay data source so active crosshair hover bar OHLC wins;
  otherwise it falls back to the latest replay display bar.
- Updated browser smokes for Settings draft/Ok behavior, timezone application,
  price-scale compact margins, crosshair readout toggling, and OHLC hover data.

## Invariants

- UI still dispatches commands and subscribes to events.
- Settings draft edits are route-local UI state until `Ok`.
- Chart runtime remains the only writer of chart series.
- Bar data runtime remains the only requester/cache owner for bars.
- Replay runtime remains the only owner of replay cursor and reveal state.
- The chart OHLC overlay remains read-only route UI and does not intercept
  pointer interaction.
- The chart route still exposes one active pane: `primary`.

## Verification

- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Candidates

- Add real candle body/border/wick color controls after defining presentation
  runtime contracts for candle style.
- Add canvas grid/crosshair style controls after defining chart-engine adapter
  ownership for those options.
- Continue setup route visual cleanup before layout split panes.
