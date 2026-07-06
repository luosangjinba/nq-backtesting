# V6 Step 79 - Transport Drag Position Persistence

Date: 2026-07-06

## Summary

Step 79 persisted the floating replay transport position after drag.

The transport still owns only shell-local DOM behavior. It does not directly
read or write browser storage. Instead, `mountReplayTransport` accepts an
injected `positionPreference` adapter with `load` and `save` methods.

The app shell injects `createReplayTransportPositionPreference`, which stores
only:

- `left`;
- `top`;
- `width`;
- `height`.

## Behavior

- Default transport position remains centered until the user drags it.
- Drag end saves the current transport rectangle.
- Reload restores the saved position.
- Restore clamps the position to the current browser viewport.
- Invalid or missing storage values are ignored.

## Boundary

This step kept transport position persistence out of:

- replay cursor ownership;
- chart data ownership;
- bar loading/cache ownership;
- viewport intent ownership.

`replay-transport.js` still passes the boundary smoke that forbids direct
`localStorage` usage inside the transport UI module.

## Commits

- `b07f23bf docs(v6): scope step seventy nine transport persistence`
- `d6a6aad0 feat(v6): persist transport drag position`
- `32e1df68 test(v6): verify transport position persistence`

## Verification

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/replay-transport-position-persistence-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/replay-transport-focus-keyboard-browser-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

## Next

Step 80 should define the session dashboard persistence boundary before making
session lists durable. The important rule is that listing sessions must not load
full chart bar ranges or enter chart/replay ownership.
