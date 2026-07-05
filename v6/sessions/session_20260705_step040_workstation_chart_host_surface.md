# V6 Step 40 - Workstation Chart Host Surface

Date: 2026-07-05

## Scope

Step 40 reserved an engine-owned chart host inside the workstation chart surface
and demoted the static shell candles, price scale, and time scale to fallback
status.

## Commits

- `b33c25d feat(v6): reserve workstation chart host`
- `cf0ed6d docs(v6): update chart presentation audit`

## Implementation Notes

- Added `[data-v6-chart-engine-host]` with `data-v6-pane-id="default"` inside
  the workstation chart surface.
- Wrapped static candles and static scale labels in `[data-v6-chart-fallback]`.
- Reduced fallback visual prominence and kept it hidden from accessibility.
- Updated product baseline screenshot smoke to verify the host owns the chart
  surface layer.
- Added `v6/tests/workstation-chart-host-browser-smoke.js`.
- Updated `v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md` to reflect that the
  next gap is adapter mounting, not host reservation.

## Verification

- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 41 should mount a real chart adapter into the workstation chart host
through an explicit shell/chart boundary without giving route or shell code
ownership of chart data, replay cursor, or viewport intent.
