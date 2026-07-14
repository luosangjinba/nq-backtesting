# V6 Right Rail Session Settings Panel Reservation

> Historical record only. The visible reservation was removed by Steps
> 423-424 under the Step 418 workspace cleanup decision. The independent
> `session-settings` owner contract remains current.

Date: 2026-07-07

## Outcome

Step 126 reserves a shell-owned right-rail Session settings panel on the
workstation surface.

The panel is intentionally inert:

- it opens from the right-rail Session settings entry through native shell
  markup;
- Session Info, Balance & Assets, Spreads & Commissions, and Date Range groups
  are placeholder groups;
- all fields and buttons inside the panel are disabled;
- no session-settings controller, runtime import, event bridge, persistence, or
  command dispatch path was added;
- Chart Settings and Session settings remain distinct surfaces.

## Layout Boundary

The Session settings panel is anchored to the right rail and opens leftward as a
floating shell panel. It does not replace the chart settings modal and does not
own chart, replay, order, calendar, account, or session-settings state.

The chart engine host remains mounted inside `data-v6-chart-surface` and keeps
owning chart presentation. The panel does not place orders, persist settings,
write chart series, request bars, move replay state, mutate viewport state, or
connect to chart-control bridges.

## Regression Coverage

`right-rail-session-settings-panel-browser-smoke.js` verifies:

- the right-rail Session settings entry opens the shell panel;
- the expected placeholder groups are present;
- all panel inputs, selects, and buttons are disabled;
- opening the panel does not move the chart surface, chart host, or bottom
  account/trading chrome;
- the chart settings modal is not used as the Session settings surface;
- dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Next Step

Step 127 should run a right-rail Session settings panel regression audit before
selecting another workstation/chart slice.
