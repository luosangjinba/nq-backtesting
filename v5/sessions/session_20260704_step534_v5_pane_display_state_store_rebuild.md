# Step 534 V5 Pane Display State Store Rebuild

## Status

Completed.

## Trigger

Manual testing after Step 533 still found that repeated multi-pane TF changes,
drag/wheel/reset, and replay Next can leave panes acting independently or
unresponsive. The remaining issue is architectural: primary and non-primary
display state still flow through different runtime paths.

## Goal

Delete the old primary/non-primary display-state architecture. Keep `primary`
only as the default pane id for layout compatibility; do not let it remain the
chart or replay display state owner.

## Substeps

1. Document the rebuild and commit this plan.
2. Add static and browser regression tests for old-architecture removal and
   TF-change followed by replay Next.
3. Replace chart runtime primary-global display state with one pane state store.
4. Remove replay display-window `primary` stateful loading and fan-out
   `primaryFullDisplayBars`.
5. Make pane display coordination initialize all panes through the same path.
6. Run targeted smokes and close this handoff.

## Acceptance

- No `paneDisplayStateByPaneId`, `primaryState`, `statefulLoad`, or
  `primaryFullDisplayBars` remains in the core display path.
- `primary` is allowed as a pane id/default layout id only.
- Changing active-pane TF and then pressing Next does not make all panes ignore
  replay advancement.
- Same-timeframe panes advance through one fan-out path; different-timeframe
  panes keep pane-local projections.

## Verification Log

- `node v5/tests/pane-display-state-store-static-smoke.js` passed.
- `node v5/tests/replay-chart-sync-fanout-smoke.js` passed.
- `node v5/tests/lifecycle-cleanup-static-smoke.js` passed.
- `node v5/tests/multi-pane-tf-change-next-fanout-browser-smoke.js` passed.
- `node v5/tests/multi-pane-continuous-interaction-isolation-browser-smoke.js` passed.
- `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js` passed.
- `node v5/tests/replay-right-edge-follow-browser-smoke.js` passed.
- `node v5/tests/replay-controls-browser-smoke.js` passed.
- `node v5/tests/replay-initial-browser-smoke.js` still fails because the
  initial start-resolve path requests `2025-06-02 10:00` to `2025-06-02 10:30`.
  The request list remains two calls, so this is not the removed duplicate
  default-pane display load; track it as a separate bootstrap/bar-data issue.
- `git diff --check` passed.

## Commits

- `2e70639 docs(v5): plan pane display state store rebuild`
- `6411025 test(v5): guard pane display store rebuild`
- `d6e485c refactor(v5): rebuild chart pane state store`
- `40a9196 refactor(v5): rebuild replay pane display fanout`
- `e947385 fix(v5): avoid duplicate default pane display load`

## Result

The old display-state split is removed from the core display path:

- chart runtime no longer keeps a primary global display state plus a separate
  non-primary map;
- replay display-window base resolution no longer reads primary replay
  `displayBars`;
- replay fan-out no longer accepts `primaryFullDisplayBars`;
- pane display coordination no longer exposes a non-primary-only ensure path;
- replay Next fan-out now uses replay timeframe, so a default `1H` pane cannot
  stop `1m` panes from advancing.
