# V6 Step 38 - Replay Chart Readiness Re-Audit

Date: 2026-07-05

## Scope

Step 38 returned from workflow-shell polish to replay/chart readiness. It reran
the visible-latency, default wall, manual wall, display timeframe, multi-pane,
chart engine, and boundary gates that protect V6 from V5's core failures.

## Commits

- `3122ff9 docs(v6): audit replay chart readiness`
- `9ff7f11 test(v6): protect replay chart readiness audit`

## Implementation Notes

- Added `v6/docs/V6_REPLAY_CHART_READINESS_AUDIT.md`.
- Linked the audit from `v6/docs/INDEX.md`.
- Recorded passing gates for:
  - visible latency;
  - default and manual wall replay;
  - display timeframe;
  - multi-pane behavior;
  - chart engine browser behavior;
  - boundary ownership.
- Added `v6/tests/replay-chart-readiness-audit-smoke.js`.

## Verification

- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 39 should audit the chart presentation surface and make sure the real chart
host/engine path, not static placeholder UI, is the main visual path before more
replay UI behavior is added.
