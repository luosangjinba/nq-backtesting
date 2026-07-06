# V6 Step 57 - Backtesting Session Setup Form

Date: 2026-07-05

## Summary

Step 57 added the V5-style simplified Backtesting Session setup flow to the
standalone V6 session surface.

The Backtesting Session entry is now a form with:

- `Start` datetime-local input;
- `End` datetime-local input;
- `Enter chart` submit action.

Submitting valid Start/End values creates a V6 session with `startTime` and
`endTime`, then enters the chart workstation through session runtime identity.
Invalid date/time values or Start >= End show form status and keep the user on
the session surface.

The form intentionally does not expose symbol or timeframe yet; those continue
using V6 defaults until their own owners are introduced. Creating the session
still does not request chart bars, replay loads, viewport mutations, adapter
writes, or bar-cache windows from route/shell code.

Follow-up correction: the standalone session surface now fully hides the
workstation header, chart area, transport, and status bar. The session dashboard
browser smoke asserts actual computed visibility, not only the `hidden`
attribute.

## Commits

- `e3de8392 docs(v6): scope step fifty seven session setup`
- `0e5fd68f feat(v6): add session setup form model`
- `e6cc06bd feat(v6): add backtesting session setup form`
- `de92a0f0 fix(v6): hide workstation on session surface`

## Verification

- `node v6/tests/session-setup-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 58 should define the chart-entry activation owner: which runtime observes
the active session identity and performs the first replay/chart data load,
without allowing the session surface or route shell to own that data flow.
