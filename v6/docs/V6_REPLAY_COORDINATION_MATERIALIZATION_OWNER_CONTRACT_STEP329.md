# V6 Replay Coordination Materialization Owner Contract - Step 329

## Status

Accepted.

## Outcome

Step 329 establishes the read-only owner contract for replay coordination
materialization before runtime behavior changes.

New contract module:

`v6/src/replay/replay-coordination-materialization-owner-contract.js`

New coverage:

- `v6/tests/replay-coordination-materialization-owner-contract-step329-smoke.js`
- `v6/tests/replay-coordination-materialization-owner-contract-boundary-step329-static-smoke.js`

## Contract

Owner:

`replay-coordination-materialization-contract`

The contract keeps source `1m` replay state as the cursor authority while
allowing target-timeframe bars to become display materialization inputs.

Participants:

- Replay Runtime writes source cursor/reveal/playback state and must not
  request bars, write chart series, or mutate viewport intent.
- Bar Data Runtime owns source and target bar requests/caches and must not
  mutate replay cursor, write chart series, or mutate viewport intent.
- Chart Data Runtime owns pane display bars and no-future filtering before
  render input.
- Chart History coordinates target-history request intent and diagnostics, but
  does not own cursor, viewport, or chart series writes.
- Display-Timeframe Runtime may express display materialization intent, but
  does not write chart series or cursor state.
- Chart Viewport Runtime owns viewport intent and must not request bars,
  mutate replay cursor, or write chart series.

## No-Future Target-Bar Policy

Materialized target bars are evaluated against the source `1m` replay cursor:

- if the source cursor is before the target bucket start, the target bar is not
  visible;
- if the source cursor is inside the target bucket, the target bar may be
  visible but is incomplete and cursor-capped;
- if the source cursor is at or after the target bucket end, the target bar is
  complete;
- none of these states may move the replay cursor or viewport intent.

## Acceptance Gates

- `source-1m-replay-cursor-authority`
- `target-bars-display-materialization-input-only`
- `no-replay-cursor-mutation`
- `no-viewport-intent-mutation`
- `chart-data-no-future-filtering`
- `bar-data-target-cache-owner`
- `chart-history-request-coordination-only`

## Boundary

This step added a pure owner contract, no-future target-bar reveal policy,
static boundary coverage, documentation, and TODO/index/handoff updates.

It did not change replay cursor movement, no-bar gap skipping, bar-data
requests, chart-data projection, chart-history runtime loading, target-history
request sizing, chart viewport intent, chart-engine behavior, shell behavior,
journal, order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/replay-coordination-materialization-owner-contract-step329-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-boundary-step329-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-transition-selection-step328-smoke.js`
- `node v6/tests/replay-coordination-materialization-transition-boundary-step328-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-transition-closeout-step328-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 330 should select the first bounded runtime handoff slice for replay
coordination materialization. The recommended first slice is a pure handoff
plan that maps target materialization intent to existing bar-data/chart-data
commands without changing replay cursor, no-bar gap, viewport intent, or
chart-history fast-path behavior.
