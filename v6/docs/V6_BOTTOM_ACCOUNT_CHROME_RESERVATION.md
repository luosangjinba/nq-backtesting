# V6 Bottom Account/Trading Chrome Reservation

Date: 2026-07-07

## Outcome

Step 123 reserves a shell-owned bottom account/trading chrome strip on the
workstation surface.

The strip is intentionally inert:

- Buy, Sell, quantity, and analytics controls are disabled;
- account balance, realized PnL, and unrealized PnL are placeholder readouts;
- no bottom-chrome controller, runtime import, event bridge, or command
  dispatch path was added;
- Order and Calendar row actions remain hidden.

## Layout Boundary

The workstation shell now has a dedicated bottom account/trading row between the
chart work area and the footer status bar. The floating replay transport remains
a separate shell transport surface and is positioned above the bottom chrome.

The chart engine host remains mounted inside `data-v6-chart-surface` and keeps
owning chart presentation. The bottom strip does not place orders, write chart
series, request bars, move replay state, mutate viewport state, or connect to
chart-control bridges.

## Regression Coverage

`bottom-account-chrome-browser-smoke.js` verifies:

- the bottom account/trading chrome exists and remains inert;
- Buy, Sell, quantity, and analytics controls are disabled;
- account balance and PnL readouts are placeholders;
- clicking disabled controls does not move the chart surface or host;
- the chart host, left rail, right rail, status/readout, reset view, transport,
  bottom chrome, and footer status bar do not overlap;
- dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Next Step

Step 124 should run a bottom chrome regression audit now that account/trading
chrome and floating replay transport share the lower workstation area.
