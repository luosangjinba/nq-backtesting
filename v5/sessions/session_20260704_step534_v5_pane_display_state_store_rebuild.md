# Step 534 V5 Pane Display State Store Rebuild

## Status

Active.

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

- Pending.
