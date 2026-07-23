# Session — R6.10b Symbol And Interval Layout Sync

Date: 2026-07-22
Status: human accepted on 2026-07-23

## Delivered

- added Symbol and Interval switches beside the accepted Crosshair switch;
- retained Symbol-on and Interval/Crosshair-off defaults and durable per-
  Session restoration;
- made switches future-command policy only, so enabling one does not silently
  converge an existing mixed layout;
- added pure local/all-Pane Symbol and Interval transitions under Pane
  Workspace Domain;
- routed each actual synchronized choice through one complete desired Pane set
  and one existing Workspace Transaction;
- kept Replay/ETH-RTH always Session-wide and kept Replay-control `Sync
  timeframe` independent;
- retained primary NQ Replay authority even when every visible Pane is ES by
  resolving bounded primary-source visibility evidence through Bar Data
  Runtime without creating a hidden Pane.

## Reference Decision

Official Lightweight Charts crosshair/range APIs remain the proven basis for
later Time/Date-range projection. Symbol and Interval change Pane data identity,
so V7 uses its existing atomic materialization owner instead. The audited
awesome-tradingview ecosystem supplied no compatible replacement owner.

## Automated Evidence

- Pane Workspace Domain harness passes 24 negative controls and proves local/
  all-Pane transitions preserve every Viewport intent;
- Replay Navigation harness passes 25 negative/race controls and proves a
  comparison-only visible set cannot become Replay clock authority;
- source traversal harness proves bounded hidden authority lookup and cached
  first-cutoff evidence;
- Replay Layout Workspace browser harness proves policy-only zero transaction,
  one atomic Symbol/Interval complete-set commit, Pane-local restoration,
  durable re-entry, and the updated Layout menu visual;
- full architecture/module/source-quality/Harness and `git diff --check` gates
  pass before commit.

## Next Boundary

Stop for human review. After acceptance, R6.10c activates Time synchronization
as an adapter/Viewport projection. It must not move Replay, persist native chart
coordinates, or become a per-Pane command chain.
