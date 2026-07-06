# V6 Step 56 - Standalone Session Surface

Date: 2026-07-05

## Summary

Step 56 converted the session dashboard from a chart-workstation overlay into a
standalone session surface.

V6 now boots into `surface=session`. The chart workstation is hidden until a
session is created or opened. The chart top-left back button returns to the
session surface. The previous `Open chart` forward button was removed, so chart
entry happens through session identity only.

The controller API now exposes session/workstation surface transitions rather
than overlay open/close semantics. Creating or opening a session still uses
session runtime commands only and does not load chart bars, replay windows,
viewport intent, adapter state, or bar-cache windows from route/shell code.

## Commits

- `3d4e901e docs(v6): scope step fifty six session surface`
- `ac345684 feat(v6): make session surface standalone`

## Verification

- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 57 should add the V5-style simplified Backtesting Session setup form:
`Start`, `End`, and an enter-chart action. Creating the session must still avoid
loading bars until the proper replay/chart owner is introduced.
