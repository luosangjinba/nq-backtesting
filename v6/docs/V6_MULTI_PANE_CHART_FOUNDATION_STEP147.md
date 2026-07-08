# V6 Multi-Pane Chart Foundation - Step 147

Date: 2026-07-08

## Outcome

Step 147 establishes the multi-pane chart foundation after replay K-line and
reset view behavior were stabilized.

The implemented gates prove:

- workstation chart surface can mount multiple chart hosts selected by
  `data-v6-chart-engine-host`;
- each host is resolved by its `data-v6-pane-id`;
- chart-data bridge fan-out applies pane-local bars to the matching chart
  surface pane;
- chart-viewport bridge fan-out applies pane-local visible logical ranges to
  the matching chart surface pane;
- manual viewport intent on one pane does not overwrite another pane;
- single-pane chart surface behavior remains compatible.

## Ownership

- Pane runtime owns pane records and active pane identity.
- Chart-data owns pane-local bars.
- Chart-viewport owns pane-local viewport intent and projection.
- Chart-engine remains the only owner that writes chart series or visible
  logical ranges to Lightweight Charts.
- Replay remains the shared cursor owner; Step 147 does not add replay fan-out
  logic.

## Lightweight Charts Check

Before implementation, current Lightweight Charts capability was checked. The
pragmatic fit for this step is V6's existing chart-host-manager pattern: one
Lightweight Charts instance per pane host, coordinated through V6 pane-local
runtime records and bridges. This preserves V6 ownership rules and avoids
introducing plugin or custom-series ownership before the pane foundation is
ready.

## What Did Not Change

- no user-facing multi-pane layout controls were enabled;
- no simulated trading behavior was enabled;
- no comparison-symbol behavior was enabled;
- no chart overlays, custom series, primitives, or indicator panes were added;
- no bar requests were moved outside bar-data;
- no replay cursor mutation was moved outside replay runtime.

## Verification

- `node v6/tests/workstation-chart-surface-multi-pane-step147-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-step147-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/chart-viewport-pane-manual-isolation-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 148 should implement leftward historical K-line extension:

- trigger older-window demand only from canvas-left / visible-range boundary;
- cap each request at the canvas-left timeline boundary and
  `maxBarsPerWindow`;
- route requests and cache writes through bar-data only;
- prepend/merge older bars through chart-data;
- preserve replay cursor ownership and visible replay speed.
