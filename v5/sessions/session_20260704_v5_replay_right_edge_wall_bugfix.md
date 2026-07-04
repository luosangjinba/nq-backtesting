# Session 2026-07-04 - V5 Replay Right Edge Wall Bugfix

## Goal

Fix replay follow mode so advancing candles keep a fixed right-side blank
margin instead of letting the latest candle drift to the canvas edge. The bug
affects both single-pane and multi-pane replay.

## Product Context

- Manual testing shifted the near-term direction from Settings parity back to
  multi-pane / replay bug fixing.
- Expected behavior: the newest visible candle is anchored a fixed distance
  from the canvas right edge, and each newly revealed candle pushes the visible
  range left from that wall.
- Lightweight Charts right-margin behavior is controlled through the time-scale
  logical range and right offset. The adapter remains the only layer that calls
  chart engine APIs.

## Boundary

- Replay runtime still owns cursor and reveal state.
- Chart runtime still owns chart writes and pane-local chart state.
- DOM-derived visible capacity is used only as adapter follow-range input at
  host-sync time; it is not persisted into replay runtime state.
- Single-pane and multi-pane paths both use the chart runtime append/follow
  contract.

## Implementation

- Extended `followLogicalRangeForBars` to accept a host-derived
  `estimatedVisibleBars` option and project a fixed-width logical range whose
  `to` value is `latestIndex + rightOffsetBars`.
- Passed the host-derived follow viewport from chart host sync to the
  Lightweight adapter during `setBars` and `appendBars`.
- Coalesced append follow-range writes into the next animation frame and used
  adapter resize metadata instead of a fresh layout read for visible-capacity
  estimation.
- Removed replay-sync and secondary-pane projection writes of
  `estimatedVisibleBars` into `viewportFollow` payloads, preserving the
  runtime render window and incremental append behavior.
- Added a pure logical-range smoke and a browser smoke that verifies the latest
  candle offset in both single-pane and multi-pane replay.

## Verification

- `node v5/tests/chart-follow-logical-range-smoke.js` passed.
- `node v5/tests/replay-right-edge-follow-browser-smoke.js` passed.
- `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js` passed.
  Its automation threshold is now 350ms because the all-pane
  `MutationObserver` metric is conservative and showed 300-313ms jitter while
  rendered bar counts stayed on the incremental path instead of regressing from
  144 to 67. The gate still catches the previous 600ms-class replacement
  regression.
- `node v5/tests/replay-cadence-latency-browser-smoke.js` passed with p95/max
  around 20.1ms.
- `git diff --check` passed.

## Next

Continue with the next manually observed multi-pane / replay bug before
returning to the Settings parity candidate from Step 528.
