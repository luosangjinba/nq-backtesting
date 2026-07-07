# V6 Workstation Rail Regression Audit

Date: 2026-07-07

## Outcome

Step 121 re-audits the workstation chart chrome after the left drawing rail
reservation.

No implementation regression was found. The current accepted shape is:

- the left drawing rail is shell-owned, 48px wide, and inert;
- the chart surface sits between the left drawing rail and right utility rail;
- the chart engine host remains mounted inside the chart surface and remains
  the only chart presentation owner;
- the pane-local status/OHLC readout and Reset View control stay inside the
  chart surface;
- the right utility rail remains 48px wide and keeps its existing disabled
  shortcut behavior;
- the replay transport remains a floating shell transport, not a chart toolbar;
- dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Boundary Result

The rail/chrome audit does not add drawing behavior or a rail controller.

Forbidden paths remain out of scope:

- drawing placeholder buttons do not dispatch chart, replay, bar-data,
  default-wall, display-timeframe, or viewport commands;
- no left-rail module imports chart-engine, chart-data, chart-viewport, replay,
  bar-data, or default-wall owners;
- Order and Calendar are not exposed from the left drawing rail;
- chart surface chrome does not reintroduce a duplicate toolbar.

## Coverage

`workstation-rail-regression-audit-browser-smoke.js` verifies:

- documentation/index registration for this audit;
- left rail disabled placeholders and no forbidden left-rail tokens;
- visible dashboard row-action identity;
- left rail, chart surface, chart host, and right rail geometry;
- status readout and Reset View placement inside the chart surface;
- transport remains mounted, visible, and horizontally centered;
- the chart surface still contains only Reset View as a button.

## Next Step

Step 122 should choose the next bounded workstation/chart slice. Prefer another
shell-only parity slice unless a runtime owner contract is required first.
