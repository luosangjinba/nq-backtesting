# V6 Step 54 - Simplify Session Dashboard Tabs

Date: 2026-07-05

## Summary

Step 54 simplified the session dashboard to the three V6 entry points requested
for the first user-facing session selector:

- `Backtesting session` creates a replay session.
- `Sessions` displays the existing session list.
- `Analytics` is a reserved placeholder for later session-segment analysis,
  including replay orders, live orders, and review statistics.

The previous generic Dashboard tab, Tutorials entry, Prop firm entry, promotion
surface, and premature performance/statistics panels are removed from the V6
surface. The dashboard remains shell-level and does not own chart bars, replay
cursor, viewport intent, adapter state, bar cache, analytics state, or session
persistence.

## Commits

- `ccfdf2a1 docs(v6): retarget step fifty four dashboard simplification`
- `a6735ff8 fix(v6): simplify session dashboard entries`
- `ebe5cca2 docs(v6): guard simplified session dashboard`

## Verification

- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 55 should define the session open/return contract: selecting or creating a
session should return to the chart workstation with active-session identity, but
route UI still must not load full chart data, replay windows, viewport intent,
or bar cache directly.
