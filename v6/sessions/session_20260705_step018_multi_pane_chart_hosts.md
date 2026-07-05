# V6 Step 18 - Multi-Pane Chart Hosts

Date: 2026-07-05

## Scope

Step 18 established the first multi-pane chart host path. It did not introduce
mixed timeframe behavior yet. The goal was to prove that multiple panes can use
one chart host lifecycle and that same-timeframe replay Next advances all panes
from one coordinated command result.

## Commits

- `375a810 feat(v6): add chart host manager`
- `ec0c89d feat(v6): fan out default wall panes`
- `48830d1 test(v6): verify multi pane chart hosts`
- `7334195 fix(v6): preserve default wall append alias`

## Implementation Notes

- Added `v6/src/chart-engine/chart-host-manager.js` to mount, update, measure,
  and destroy pane chart hosts through one API.
- Kept chart host manager focused on adapter lifecycle. It does not own replay,
  chart-data, viewport intent, or session state.
- Updated default-wall runtime internals from a single pane state to a list of
  pane states.
- Preserved existing single-pane return aliases: `state`, `chartRecord`,
  `viewportRecord`, and `activeProjection`.
- Kept `next.chartRecord` as the append payload compatibility alias while
  `chartRecords` carries full pane chart-data records.
- Added multi-pane return arrays: `states`, `chartRecords`, and
  `viewportRecords`.
- One `defaultWall.next` command now advances replay once and fans out chart
  data updates to all loaded same-timeframe panes.

## Verification

- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 19 should add mixed-timeframe pane behavior. The main gate is preventing
active-pane display timeframe from leaking into inactive panes while measuring
mixed-timeframe visible latency separately.
