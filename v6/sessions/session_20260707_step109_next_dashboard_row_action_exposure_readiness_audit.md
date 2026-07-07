# V6 Session - Step 109 Next Dashboard Row Action Exposure Readiness Audit

Date: 2026-07-07

## Summary

Step 109 audited readiness for exposing the next hidden dashboard row action.

Decision:

- no hidden row action is ready to expose yet;
- Journal is the nearest candidate because command surface and persistence are
  already ready;
- Journal remains hidden until a journal-owned surface and dedicated browser
  row-action smoke exist;
- Order and Calendar remain later candidates because their owner contracts lack
  ready command and persistence paths.

## Boundary Notes

- Dashboard row action visibility did not change.
- Visible actions remain Summary, Stats, and Copy.
- Order, Journal, and Calendar remain hidden and disabled.
- Owner contracts still block `session-dashboard` as an integration path and
  cannot load bars, open charts, advance replay, or touch viewport state.

## Commits

- `6a521368 docs(v6): audit next row action exposure readiness`

## Verification

- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `git diff --check`

## Next

Step 110 should audit Journal row-action owner surface readiness while keeping
the Journal row action hidden.
