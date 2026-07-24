# Session — R7.3a Maximized Pane Timeframe Pointer Correction

Date: 2026-07-23
Status: executable; awaiting human interaction review

## Review Finding

In a multi-Pane layout, each Pane could change timeframe independently until
the active Pane was maximized. The timeframe menu still opened, but clicking an
option did nothing.

## Root Cause

The toolbar timeframe menu and the transiently maximized Pane both used
stacking level `8`. Menu options extend downward over the chart area, and the
later Pane Canvas therefore won browser pointer hit-testing even though the
menu remained visually present.

## Correction

- raised only the timeframe menu to the established toolbar-menu stacking
  layer;
- retained maximize as transient outer-DOM presentation state;
- retained active-Pane routing and independent per-Pane timeframe ownership;
- retained the other Pane timeframe and the maximized state through the active
  Pane replacement;
- added real CDP mouse movement/press/release plus `elementFromPoint` evidence,
  because programmatic DOM clicks cannot detect an occluding Canvas.

Official Lightweight Charts and awesome-tradingview review still supports the
existing boundary: V7 product Panes use independent charts, and this defect is
host DOM layering rather than chart-series or runtime ownership.

## Automated Evidence

- `node v7/tests/replay-layout-workspace-browser-harness.js`
- `node v7/tests/replay-pane-workspace-browser-harness.js`
- `node v7/tests/architecture-boundary-harness.js`
- `node v7/tests/source-quality-harness.js`
- `node v7/tests/module-host-harness.js`
- `git diff --check`

## Human Gate

Use two Panes with Interval synchronization off. Give them different
timeframes, maximize either Pane, change that active Pane's timeframe twice,
then restore. The selected Pane must update, the other Pane must not, and both
maximize and restored split geometry must remain stable.
