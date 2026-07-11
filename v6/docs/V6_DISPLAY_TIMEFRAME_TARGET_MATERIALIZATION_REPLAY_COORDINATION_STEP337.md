# V6 Display-Timeframe Target Materialization Replay Coordination - Step 337

## Status

Accepted.

## Outcome

Step 337 verifies replay coordination after display-timeframe target
materialization is active.

New coverage:

- `v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js`
- `v6/tests/display-timeframe-target-materialization-replay-coordination-boundary-step337-static-smoke.js`

Runtime fix:

- `v6/src/chart-entry/chart-entry-manual-next-runtime.js` now uses the replay
  source cursor timestamp as the chart-data append cursor. This keeps appended
  source `1m` bars from being filtered out when the visible HTF bar timestamp is
  an earlier projected bucket timestamp.

## Browser Verification

The Step 337 browser smoke starts with `8h` target materialization active and
verifies:

- manual next advances source `1m` replay cursor while the pane remains `8h`;
- the high-TF projected display bar updates from source cursor movement;
- a source `1m` no-bar gap skips from `16:59` to `18:00`;
- target-data-missing fallback returns to source projection with
  `target-history-no-visible-bars`;
- autoplay continues through the same gap to `18:01` without using target bars
  as replay cursor authority.

## Boundary

Replay remains source `1m` driven. Target bars are display materialization
inputs only.

Manual next and autoplay do not plan or load target windows. Target API calls
remain inside Display-Timeframe Runtime and Bar Data Runtime owner surfaces.
This step does not change target-history request sizing, chart-history fast-path
scheduling, direct viewport intent, chart-engine APIs, shell behavior, journal,
order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-replay-coordination-boundary-step337-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-browser-step336-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/auto-play-session-gap-browser-step263-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-browser-closeout-step336-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 338 should re-select the next target-timeframe materialization slice after
manual next and autoplay coordination are covered. A good bounded candidate is a
small readout/diagnostic or pack-integration slice that makes Step 337
coordination coverage easier to run selectively before any broader replay
materialization behavior changes.
