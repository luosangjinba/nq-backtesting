# V6 Bottom Chrome Regression Audit

> Historical record only. Step 428 removed the bottom placeholder family and
> replaced presence assertions with cleanup absence coverage. Step 429 owns
> reclaimed-height and Replay transport placement regression.

Date: 2026-07-07

## Outcome

Step 124 re-audits the lower workstation chrome after the bottom
account/trading chrome reservation.

No implementation regression was found. The accepted lower workstation shape is:

- the chart work area remains above the bottom account/trading strip;
- the left drawing rail, chart host, and right utility rail still share the
  chart work area without overlap;
- the floating replay transport remains a separate shell transport surface
  above the bottom account/trading strip;
- the footer status bar remains below the bottom account/trading strip;
- Buy, Sell, quantity, account balance, PnL, and analytics remain placeholders;
- dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Boundary Result

The lower chrome audit does not add trading, account, analytics, replay, chart,
bar-data, default-wall, display-timeframe, or viewport behavior.

Forbidden paths remain out of scope:

- bottom account/trading chrome does not dispatch runtime commands;
- no bottom-chrome controller imports orders, chart-engine, chart-data,
  chart-viewport, replay, bar-data, default-wall, or account/analytics owners;
- Order and Calendar are not exposed from dashboard row actions;
- floating replay transport ownership does not move into account/trading
  chrome.

## Coverage

`bottom-chrome-regression-audit-browser-smoke.js` verifies:

- documentation/index registration for this audit;
- lower chrome source has no forbidden runtime command tokens;
- visible dashboard row-action identity;
- desktop and narrower workstation geometry for chart work area, bottom chrome,
  floating replay transport, and footer status bar;
- disabled placeholder state for Buy, Sell, quantity, and analytics;
- placeholder account balance and PnL readouts;
- chart host remains mounted and equal to the chart surface dimensions.

## Next Step

Step 125 should choose the next bounded workstation/chart slice now that the
left rail and lower workstation chrome are both reserved and regression-audited.
