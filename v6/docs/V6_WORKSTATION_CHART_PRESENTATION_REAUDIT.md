# V6 Workstation Chart Presentation Re-audit

Date: 2026-07-07

## Decision

The workstation chart presentation boundary still holds after the dashboard
row-action sequence.

No presentation ownership drift was found:

- the workstation shell still reserves `[data-v6-chart-engine-host]` with
  `data-v6-pane-id="main"`;
- `mountWorkstationChartSurface(root)` still owns the mounted chart adapter
  surface;
- `chart-data-surface-bridge.js` is still the only path that applies
  chart-data records to the mounted chart surface;
- `chart-viewport-surface-bridge.js` is still the only path that applies
  projected logical ranges to the mounted chart surface;
- the static chart visual remains fallback-only, reduced-opacity, and hidden
  from accessibility;
- dashboard row-action work did not add chart, bars, replay, or viewport
  ownership to dashboard/session paths.

## Boundary Notes

- No runtime behavior changed.
- No dashboard row-action visibility changed.
- Order and Calendar remain hidden.
- The chart runtime remains the only owner of chart series writes.
- Bar-data and replay ownership remain outside the chart presentation surface.

## Step 119 Direction

Step 119 should choose the next bounded workstation/chart implementation slice.

Scope:

- use the existing FXReplay UI guardrails and chart presentation audits as the
  starting point;
- preserve the real chart host/adapter/bridge ownership boundary;
- keep dashboard row-action visibility unchanged.

Acceptance:

- workstation chart presentation re-audit smoke passes;
- selected chart-engine/workstation browser smokes pass;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
