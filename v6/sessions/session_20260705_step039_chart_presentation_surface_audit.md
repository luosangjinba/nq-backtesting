# V6 Step 39 - Chart Presentation Surface Audit

Date: 2026-07-05

## Scope

Step 39 audited the real chart presentation path before adding more replay UI
behavior. The audit confirms the chart adapter and chart host manager are
functional, while the workstation shell still presents static placeholder
candles as the default chart visual.

## Commits

- `87ac595 docs(v6): audit chart presentation surface`
- `4aeffe1 test(v6): protect chart presentation audit`

## Implementation Notes

- Added `v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md`.
- Linked the audit from `v6/docs/INDEX.md`.
- Documented current presentation paths:
  - shell static chart placeholder;
  - Lightweight chart adapter;
  - pane-local chart host manager.
- Recorded that the next chart-facing step should reserve an engine-owned host
  inside the workstation chart surface and demote/remove competing static
  placeholder visuals.
- Added `v6/tests/chart-presentation-audit-smoke.js`.

## Verification

- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 40 should add an engine-owned chart host surface to the workstation shell
and ensure static placeholder visuals no longer compete as the primary chart.
