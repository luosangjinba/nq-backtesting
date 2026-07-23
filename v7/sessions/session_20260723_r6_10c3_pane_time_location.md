# Session — R6.10c3 Explicit Pane Time Location

Date: 2026-07-23
Status: executable; awaiting human interaction and visual review

## Delivered

- added an exact-candle right-click menu with stable P1-P4, instrument, and
  timeframe target labels;
- added single-target and `All other panes` one-shot market-time location;
- preserved target zoom/span while centering its containing candle;
- routed missing target history through bounded Workspace Transaction and Bar
  Data owners;
- rejected future whitespace, inter-bar gaps, and unavailable target times
  without selecting unrelated candles;
- retained source focus and left Replay, Pane configuration, ETH/RTH, and
  non-target Viewports unchanged.

## Automated Evidence

- pure domain and fixture-backed negative Harnesses pass;
- controller Harness proves mixed instrument/timeframe targeting, one bounded
  history extension, partial unavailability, and unchanged active source;
- real chart-adapter Chrome proves exact hit testing, whitespace rejection,
  span preservation, target centering, and no unavailable-plan mutation;
- real four-Pane Chrome proves P1-P4 labels, `All other panes`, NQ 1m / ES 4h
  targeting, unchanged Replay/Workspace revisions, and target-only manual
  Viewports;
- the dedicated `layout-time-location-menu-1440x900.png` visual is bound to the
  Harness;
- complete architecture/source-quality/regression and `git diff --check` gates
  pass before commit.

## Human Review Gate

Follow `docs/V7_PANE_TIME_LOCATION_R6_10C3.md`, especially exact-candle versus
blank-space selection, one/all targets, older unloaded target history, RTH
gaps, source focus/Replay invariants, and dismissal behavior.

Do not mark H066 accepted and do not start R6.10d Date-range synchronization
until the user reports this interaction and visual review complete.
