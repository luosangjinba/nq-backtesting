# V6 Step 53 - Session Dashboard Shell

Date: 2026-07-05

## Summary

Step 53 reserved a separate session dashboard/list surface. The chart
workstation remains the default first screen, and the chart top-left back arrow
now opens the dashboard shell. Returning to the chart happens from the dashboard,
without reintroducing a chart-forward arrow.

The dashboard is intentionally shell-level:

- it can create/list replay sessions through session commands;
- it can return to the chart workstation;
- it does not own chart bars, replay cursor, viewport intent, adapter state, bar
  cache, or durable routing.

## Commits

- `e1592af5 docs(v6): clarify step fifty three dashboard scope`
- `b15c51ed feat(v6): add session dashboard shell`
- `544179d9 docs(v6): guard session dashboard shell`

## Verification

- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 54 should define the session dashboard navigation contract: how opening a
session returns to the chart workstation and how active-session identity is
represented, without loading chart data or replay windows from route UI.
