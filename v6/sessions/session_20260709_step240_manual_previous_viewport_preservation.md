# Session 2026-07-09 - Step 240 Manual Previous Viewport Preservation

## Scope

- Reaudited manual Previous viewport preservation before enabling the shell
  transport Previous button.
- Kept `data-v6-transport-step-back` disabled and unwired.

## Changes

- Subscribed chart viewport runtime to `REPLAY_EVENTS.REWOUND` so viewport
  intent cursor timestamps follow replay Previous events.
- Added browser coverage for default and manual viewport preservation after
  direct chart-entry manual Previous.
- Documented the owner-boundary decision in
  `v6/docs/V6_MANUAL_PREVIOUS_VIEWPORT_PRESERVATION_REAUDIT_STEP240.md`.

## Verification

- `node v6/tests/manual-previous-viewport-preservation-step240-smoke.js`
- `node v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`
- `node v6/tests/chart-entry-manual-previous-runtime-step238-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

- Step 241 should define and verify manual Previous transport enablement
  readiness without changing broader replay, indicator, trading, or journal
  behavior.
