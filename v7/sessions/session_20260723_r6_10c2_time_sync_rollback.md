# Session — R6.10c2 Real-time Time Sync Rollback

Date: 2026-07-23
Status: executable; human interaction and visual review pending

## Delivered

- removed the Time row from Layout Sync;
- removed ordinary-click time projection and its chart-adapter/domain helper;
- retained the independent two-pixel drag threshold so an ordinary click does
  not publish a manual Viewport/history-boundary request;
- retained `layoutSync.time` only as inert persistence compatibility data;
- preserved accepted Symbol/Interval/Crosshair behavior and P1-P4 identity.

## Automated Evidence

- focused controller and chart-adapter Harnesses no longer expose a Time
  consumer;
- real Chrome proves an ordinary click emits no Viewport/history-boundary
  intent while a native drag still emits both;
- real Chrome exposes exactly three Layout Sync controls and retains all Pane
  priority/count-reduction behavior;
- regenerated shared visuals contain the accepted P1-P4 placement without the
  rejected Time row;
- the complete Harness suite and `git diff --check` pass before commit.

## Next Boundary

Stop for human review. After acceptance, specify the right-click time-location
command and its P1-P4 target menu before implementing it. Date-range sync stays
deferred.
