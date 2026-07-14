# V6 Left Drawing Rail Reservation

> Historical record only. The traditional visible rail was removed by Step
> 426 under the Step 418 cleanup decision. The drawing/action-history owner
> contract remains current; no Semantic Drawing entry surface is selected.

Date: 2026-07-07

## Outcome

Step 120 reserves a shell-owned left drawing/tool rail on the workstation chart
surface.

The rail is intentionally inert:

- it is created by shell markup and CSS only;
- all drawing/tool placeholder buttons are disabled;
- it has no controller, imports, event bridge, or command dispatch path;
- it does not expose Order or Calendar controls.

## Layout Boundary

The workstation main grid now has three columns:

- a 48px left drawing rail;
- the chart surface and chart engine host;
- the existing 48px right utility rail.

The chart engine host remains mounted inside `data-v6-chart-surface` and keeps
owning chart presentation. The left rail does not write chart series, request
bars, move replay state, mutate viewport state, or connect to chart-control
bridges.

## Regression Coverage

`left-drawing-rail-browser-smoke.js` verifies:

- the left rail exists and remains 48px wide;
- drawing placeholders are disabled and labeled;
- clicking disabled placeholders does not move the chart surface or host;
- the chart host is mounted, visible, and backed by a canvas;
- the chart surface is between the left and right rails without overlap;
- dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Next Step

Step 121 should run a workstation rail regression audit now that both left and
right rails are present. It should keep the audit bounded to shell/chart chrome
coverage and avoid adding drawing behavior until a drawing/tool owner contract
exists.
