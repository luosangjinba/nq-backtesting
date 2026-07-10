# V6 Step 286 - High-Timeframe Target-History Activation Policy

Date: 2026-07-10

## Decision

Step 286 turns the Step 285 target-history opt-in path into the first real
activation policy. The chart-history input bridge now decides whether a
leftward-history request should include `targetHistory.enabled`.

The policy is explicit and local to chart-history input ownership. It does not
call target bar APIs, import target adapters, or mutate chart data.

## Activation Policy

- Fixed target timeframes activate at `1h` and above.
- Session-aware target timeframes activate for `1D`, `1W`, and `1M`.
- Lower timeframes such as `5m` remain on source-window projection.
- `targetHistoryActivation.enabled: false` disables the bridge policy and
  preserves the old request payload shape.
- The bridge obtains pane display timeframe through `PANE_COMMANDS.GET_BY_ID`
  and emits activation only through `CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION`.

## Implemented

- Added `v6/src/chart-history/leftward-target-history-activation.js`.
- Wired `leftward-history-input-bridge.js` to add target-history payloads for
  high display timeframes.
- Kept explicit disable support for tests and future UI/config controls.
- Added runtime fallback diagnostics so failed target-history attempts remain
  visible on the loaded source fallback state.

## Preserved Behavior

- Low timeframe leftward history remains source-window projection.
- Disabled activation keeps the old bridge payload shape.
- Target-history failures still fall back to source-window projection.
- Source bars remain source bars; target bars do not pollute high-TF-to-`1m`
  round trips.
- Replay remains source `1m` driven.

## Verification

- `node v6/tests/leftward-target-history-activation-step286-smoke.js`
- `node v6/tests/leftward-history-input-target-activation-step286-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/leftward-history-target-opt-in-step285-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/leftward-history-target-default-step285-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/display-target-history-boundary-step283-static-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 287 should validate the activated path in a browser/runtime integration
scenario, preferably proving that a high-TF drag through the real chart surface
produces target-history requests and remains responsive with source fallback.
