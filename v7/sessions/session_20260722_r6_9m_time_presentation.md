# Session — R6.9m Shared Time Presentation

Date: 2026-07-22
Status: human accepted

## Delivered

- recorded the user's R6.9l live-preview acceptance and advanced global
  Workstation Settings from schema version 5 to version 6;
- added New York/UTC/browser-local, four date orders, optional detailed
  weekday, and 12/24-hour presentation;
- centralized epoch-to-text formatting under Workstation Settings and reused
  it for native chart formatters, Replay Workspace, Exact GoTo Calendar, and
  Session Browser;
- kept Session creation and Quick GoTo New York domain semantics unchanged;
- kept Replay cursor, visibility cutoff, Session bounds, bars, series data,
  Pane intent, Workspace revision, and Viewport revision unchanged;
- retained Settings live preview, OK persistence, and complete Cancel/failure
  restoration across all current and future Panes;
- added an explicit AM/PM toggle to the reusable Calendar's 12-hour clock.

## Reference Decision

Official Lightweight Charts 5.2 exposes the required Crosshair and time-axis
formatter ports through `LocalizationOptions.timeFormatter` and
`TimeScaleOptions.tickMarkFormatter`. The awesome-tradingview ecosystem audit
found no ownership-compatible replacement needed here, so R6.9m uses native
options and adds no plugin or dependency.

## Automated Evidence

- strict schema/default/migration/timezone/DST formatter evidence passes;
- real chart formatter changes preserve series-data and adapter revisions;
- Replay Workspace browser evidence covers live preview, Cancel, Exact GoTo,
  AM/PM, persistence, hard reload, another Session, and future Panes;
- Session Browser create/open/delete and updated visuals pass;
- all headless Harnesses and all six real-Chrome Harnesses pass;
- architecture, source-quality, visual baselines, and `git diff --check` pass
  before commit.

## Human Review Result

Accepted by the user on 2026-07-22 after review of the Settings live-preview and
Cancel restoration behavior. R6.10 Layout Sync is unblocked.
