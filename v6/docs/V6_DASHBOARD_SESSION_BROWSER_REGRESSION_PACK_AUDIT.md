# V6 Dashboard Session Browser Regression Pack Audit

Date: 2026-07-07

## Decision

The dashboard/session browser regression pack is complete enough to hold the
current dashboard surface before exposing additional row actions.

The selected pack covers:

- app shell mounting and session dashboard availability;
- session create/open and workstation transition;
- recent sessions controls, including search, sort, pagination, Summary, Stats,
  Copy, and Journal row actions;
- Summary, Stats, Copy, and Journal browser behavior;
- session metadata persistence across reload;
- session delete behavior for inactive and active sessions;
- quick-session modal flow;
- product baseline screenshot/layout checks.

## Boundary Notes

- No runtime behavior changed.
- Order and Calendar remain hidden until their owner surfaces have
  explicit browser coverage.
- The pack keeps dashboard/session behavior separate from hidden chart, bars,
  replay, viewport, orders, journal, and calendar ownership paths.

## Step 109 Direction

Step 109 should audit readiness for exposing the next dashboard row action.

Scope:

- compare Order, Journal, and Calendar owner contracts and browser coverage;
- identify which hidden row action can be exposed next without violating V6
  ownership rules;
- do not expose a row action until its owner surface has browser coverage.

Acceptance:

- dashboard/session browser regression pack audit smoke passes;
- dashboard row-action isolation and visible row-action coverage audit smokes
  pass;
- selected dashboard/session browser smokes pass;
- boundary smoke passes.

## Verification

- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
