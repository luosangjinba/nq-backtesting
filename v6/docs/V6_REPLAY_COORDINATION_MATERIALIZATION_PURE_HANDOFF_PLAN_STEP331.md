# V6 Replay Coordination Materialization Pure Handoff Plan - Step 331

## Status

Accepted.

## Outcome

Step 331 defines the pure handoff plan selected by Step 330:

`replay-coordination-materialization-pure-handoff-plan`

New plan module:

`v6/src/replay/replay-coordination-materialization-pure-handoff-plan.js`

New coverage:

- `v6/tests/replay-coordination-materialization-pure-handoff-plan-step331-smoke.js`
- `v6/tests/replay-coordination-materialization-pure-handoff-boundary-step331-static-smoke.js`

## Plan

The plan maps display materialization intent to existing owner surfaces without
runtime wiring:

- Display-Timeframe Runtime expresses `targetDisplayWindowIntent`.
- Bar Data Runtime plans the target display window through
  `barData.planTargetWindow`.
- Bar Data Runtime loads target display bars through `barData.loadTargetWindow`.
- Replay coordination materialization applies the Step 329 target-bar reveal
  policy against source `1m` replay cursor state.
- Chart Data Runtime applies visible target display bars through
  `chartData.replaceBars` and preserves source bars through
  `chartData.getSourceBars`.
- Chart Viewport Runtime may reapply its existing viewport intent after chart
  data revision changes.

Forbidden surfaces remain explicit: replay cursor commands, chart-engine direct
series/range writes, shell target-history dispatch, and direct viewport
mutation are not part of this plan.

## Future Wiring Point

First future wiring point:

`display-timeframe-target-materialization-handoff`

Owner:

`display-timeframe-runtime`

Preconditions:

- `pure-handoff-plan-accepted`
- `target-window-plan-owner-surface-available`
- `target-window-load-owner-surface-available`
- `chart-data-replace-owner-surface-available`
- `source-1m-replay-cursor-available`
- `target-bar-reveal-policy-covered`

## Boundary

This step added a pure handoff plan, static boundary coverage, documentation,
and TODO/index/handoff updates.

It did not change replay cursor movement, no-bar gap skipping, bar-data
requests, chart-data projection, chart-history runtime loading, target-history
request sizing, chart viewport intent, chart-engine behavior, shell behavior,
journal, order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/replay-coordination-materialization-pure-handoff-plan-step331-smoke.js`
- `node v6/tests/replay-coordination-materialization-pure-handoff-boundary-step331-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-handoff-slice-selection-step330-smoke.js`
- `node v6/tests/replay-coordination-materialization-handoff-boundary-step330-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-handoff-closeout-step330-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 332 should select the first bounded runtime wiring slice for the accepted
pure handoff plan. The recommended first slice is a read-only wiring readiness
audit for `display-timeframe-target-materialization-handoff`, not behavior
wiring yet.
