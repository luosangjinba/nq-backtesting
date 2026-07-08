# V6 Right Rail Session Settings Panel Regression Audit

Date: 2026-07-07

## Outcome

Step 127 re-audits right-rail Session settings panel behavior after the panel
reservation.

No implementation regression was found. The accepted shape is:

- the Session settings entry opens a shell-owned panel from the right rail;
- Chart Settings and Session settings remain distinct surfaces;
- Session Info, Balance & Assets, Spreads & Commissions, and Date Range remain
  disabled placeholder groups;
- opening the panel does not move the chart surface, chart host, bottom
  account/trading chrome, floating replay transport, or footer status bar;
- dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Boundary Result

The audit does not add session-settings, settings, orders, calendar, chart,
replay, bar-data, default-wall, display-timeframe, viewport, account, or
analytics behavior.

Forbidden paths remain out of scope:

- Session settings panel source does not dispatch runtime commands;
- no panel controller imports settings, orders, calendar, chart-engine,
  chart-data, chart-viewport, replay, bar-data, default-wall, or
  account/analytics owners;
- the panel does not persist values;
- Order and Calendar are not exposed from dashboard row actions;
- the chart settings modal is not reused as the Session settings surface.

## Coverage

`right-rail-session-settings-panel-regression-audit-smoke.js` verifies:

- documentation/index registration for this audit;
- Session settings panel source has no forbidden runtime command tokens;
- visible dashboard row-action identity;
- desktop and narrower workstation panel geometry;
- disabled placeholder state for every panel input, select, and button;
- distinct Chart Settings and Session settings surfaces;
- chart host, bottom chrome, floating transport, and footer status geometry
  remain stable when opening the panel.

## Next Step

Step 128 should choose the next bounded workstation/chart slice after right-rail
Session settings panel stabilization.
