# V6 Session - Step 200 Reset View HTF Projection Gate

Date: 2026-07-08

## Completed

Step 200 verified reset-view behavior for higher display timeframes.

Commits:

- `95533332 docs(v6): audit reset view HTF boundary`
- `7ed50cbb test(v6): cover reset view HTF display range`
- `7db017c6 test(v6): add reset view HTF regression guard`

## Changes

- Added a reset-view HTF boundary audit.
- Added static guard coverage proving reset view remains projection-owner
  agnostic and does not directly route bar-data, replay, or chart-data
  projection commands.
- Added browser coverage for 5m reset view using display chart-data length and
  applied chart-data revision.
- Added the 5m reset-view browser smoke to the chart browser regression pack.

## Verification

- `node v6/tests/reset-view-htf-projection-audit-step200-smoke.js`
- `node v6/tests/reset-view-htf-browser-step200-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step200-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/reset-view-kxg-flow-browser-step146-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Next

Step 201 should review the completed HTF projection chain before starting new
timeframe UI, indicators, or broader chart feature work.
