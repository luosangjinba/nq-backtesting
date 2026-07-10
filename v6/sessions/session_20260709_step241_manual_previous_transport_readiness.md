# Session 2026-07-09 - Step 241 Manual Previous Transport Readiness

## Scope

- Prepared shell transport Previous enablement without wiring the button.
- Kept replay, chart-entry, chart-data, and viewport ownership unchanged.

## Changes

- Added replay-domain `previousAvailable` state derived from replay cursor
  state.
- Added shell transport `previousAvailable` state that reads the replay-owned
  boolean without interpreting cursor fields.
- Updated transport DOM sync to expose readiness while keeping the Previous
  button disabled and actionless.
- Subscribed transport to `REPLAY_EVENTS.REWOUND` so readiness updates after
  direct manual Previous.
- Added browser coverage for at-start, after-next, and after-rewind readiness.
- Documented the direct chart-entry manual Previous owner path for future
  button wiring.

## Verification

- `node v6/tests/manual-previous-transport-readiness-step241-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/manual-previous-viewport-preservation-step240-smoke.js`
- `node v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

- Step 242 can wire the Previous transport button to
  `CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS` only when
  `previousAvailable` is true.
