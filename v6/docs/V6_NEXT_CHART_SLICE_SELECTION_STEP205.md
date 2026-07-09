# V6 Next Chart Slice Selection - Step 205

## Decision

The next bounded chart-facing slice should be Pane-Local Display-Timeframe UI
Readiness.

This is a readiness slice, not full TF UI implementation and not indicator
work. It should prepare the ownership boundary so a visible interval control can
target the selected pane explicitly instead of relying on global or active-pane
behavior.

## Why This Slice

Step 203 normalized pane runtime ids to chart-surface ids, and Step 204 removed
active-pane compatibility fallback from exact-pane chart-facing paths. The next
weak spot is the shell display-timeframe control:

- it is currently a top-toolbar control mounted by shell UI;
- it dispatches `DISPLAY_TIMEFRAME_COMMANDS.APPLY` without a `paneId`;
- the runtime intentionally treats missing `paneId` as current active pane;
- there is runtime coverage for pane isolation, but the shell UI does not yet
  have a pane-local target contract.

That makes pane-local display timeframe readiness the right next bridge before
any richer TF menu, multi-pane interval sync, or indicators.

## Owner Boundaries

- Shell UI may own DOM events, menu open/close state, and display labels.
- Pane runtime owns pane identity, active pane, symbol intent, and display
  timeframe intent.
- Display-timeframe runtime owns projection from source bars to selected
  display timeframe bars.
- Chart-data runtime owns pane-local bar replacement.
- Chart-engine/chart-surface render already-applied chart-data.
- Layout runtime may expose visible pane state, but Step 206 should not
  implement layout sync semantics.

## Step 206 Recommendation

Implement a small owner boundary for pane-local display-timeframe UI readiness:

- make the shell display-timeframe control resolve an explicit target `paneId`;
- default the target to `main` or the active pane through a named helper, not
  hidden runtime fallback;
- dispatch `DISPLAY_TIMEFRAME_COMMANDS.APPLY` with `paneId`;
- keep existing top-toolbar visual behavior stable;
- add browser coverage proving selecting `5m` updates only the targeted pane;
- do not add custom interval creation, multi-pane interval sync, or indicators.

## Non-Goals

- Do not implement custom intervals.
- Do not implement indicator UI or indicator rendering.
- Do not implement Pine Script or user-defined indicators.
- Do not implement layout sync for interval/time/date-range.
- Do not change chart-data projection ownership.
- Do not add trading/order behavior.

## Acceptance For This Selection

- The next slice is documented with owner boundaries and non-goals.
- Existing display-timeframe runtime pane isolation is acknowledged.
- Existing chart browser regression pack and boundary smoke pass.
