# V6 Dashboard Summary/Stats/Copy Browser Coverage Audit

Date: 2026-07-07

## Decision

The visible dashboard row actions have browser coverage aligned with their
owner contracts.

No coverage mismatch was found:

- Summary is covered by `session-summary-surface-browser-smoke.js`.
- Stats is covered by `session-analytics-surface-browser-smoke.js`.
- Copy is covered by `session-copy-action-browser-smoke.js`.
- Summary and Stats browser tests verify read-only metadata surfaces and confirm
  chart, bar-data, chart-entry, and replay snapshots remain unchanged.
- Copy browser coverage verifies metadata-only duplication and confirms chart,
  bar-data, chart-entry, and replay snapshots remain unchanged.
- Order, Journal, and Calendar remain hidden until their owner surfaces have
  browser coverage.

## Boundary Notes

- No runtime behavior changed.
- Summary remains owned by `session-summary`.
- Stats remains owned by `session-analytics`.
- Copy remains owned by `session-repository`.
- The browser coverage does not route visible row actions through chart,
  bar-data, replay, viewport, orders, journal, or calendar ownership paths.

## Step 108 Direction

Step 108 should audit the dashboard/session browser regression pack as a whole
before exposing any additional row actions.

Scope:

- verify the selected dashboard/session browser smoke pack still covers create,
  open, recent sessions controls, Summary, Stats, Copy, persistence, delete, and
  quick-session flow;
- keep Order, Journal, and Calendar hidden until their owner surfaces have
  explicit browser coverage.

Acceptance:

- visible row-action browser coverage audit smoke passes;
- dashboard row-action isolation re-audit smoke passes;
- selected dashboard/session browser smokes pass;
- boundary smoke passes.

## Verification

- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
