# V6 Settings Global Time Presentation - Step 416

Date: 2026-07-13

## Decision

Settings schema v8 owns one global time-presentation preference composed of:

- display timezone: Exchange/New York, UTC, or Local;
- hours format: 24-hour or 12-hour.

This is presentation only. Replay anchors, persisted Go-to preferences, API
requests, bar timestamps, and runtime cursor values retain their canonical
representations. In particular, Go-to values remain `HH:mm` New York wall-clock
values regardless of how an input is displayed.

V6 chart timestamps encode New York wall-clock components on a UTC-shaped axis.
The shared formatter therefore converts that wall clock to a real instant only
for UTC/Local display. Exchange display reads the chart components directly;
this prevents the previous `00:00` becoming `04:00` regression.

## Ownership

- `time-domain/time-presentation.js` owns formatting and controlled-input
  parsing;
- `chart-engine/time-presentation-options.js` maps preferences to Lightweight
  Charts `localization.timeFormatter` and `timeScale.tickMarkFormatter`;
- Chart Surface remains the only chart-options mutation path;
- Replay Navigation Settings owns DOM input behavior while persisting canonical
  values;
- Status Readout formats Start/Cursor/End through the same time domain.

Native `input type=time` was removed from Go-to because browsers do not provide
deterministic 12/24-hour presentation. The controlled text inputs accept the
active display syntax and normalize it before validation or persistence.

Official reference:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LocalizationOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TimeScaleOptions
- https://github.com/tradingview/awesome-tradingview

## Automated Acceptance

- schema v8 defaults, migration, validation, and durability;
- 12/24-hour boundary formatting and canonical parsing;
- EDT/EST Exchange-to-UTC conversion;
- chart time-axis and crosshair formatter mapping;
- immediate preview and Cancel restoration;
- controlled Go-to display with unchanged canonical navigation behavior;
- replay status Start/Cursor/End formatting;
- existing Canvas, Settings, Status Readout, and Go-to browser regressions.

## Visual Acceptance

Human visual acceptance passed for chart axis/crosshair, footer, and Go-to time
presentation. The accepted matrix covers 24-hour and 12-hour modes and confirms
that display changes do not alter Go-to behavior. Step 416 is closed.

## Next

Execute the Step 417 Settings scope closeout. Templates, Apply to all, and Pane
overrides are rejected for the current lightweight product; return selection to
the primary replay/validation/Journal loop.
