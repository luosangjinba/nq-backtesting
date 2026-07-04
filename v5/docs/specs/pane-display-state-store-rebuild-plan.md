# Step 534 Pane Display State Store Rebuild Plan

## Phase

Phase 3 replay workstation multi-pane correctness.

## Problem

Step 529-533 reduced several visible multi-pane bugs, but the old ownership
shape still exists:

- chart runtime keeps a global primary display `state` and a separate
  non-primary `paneDisplayStateByPaneId`;
- replay display-window loading still treats `primary` as a stateful load and
  other panes as stateless chart snapshots;
- replay fan-out still passes `primaryFullDisplayBars`;
- pane display coordination still skips the default pane.

That dual path is the likely root cause behind panes appearing to "play
separately" after active-pane TF changes, drag/wheel/reset, and replay Next.

## Decision

Step 534 must delete the primary/non-primary display-state architecture.
`primary` may remain as the default pane id for layout compatibility, but it
must be just another pane in the chart and replay display pipeline.

The new architecture is:

- chart runtime stores every pane, including `primary`, in one pane state map;
- chart writes target a pane id and use one implementation path for replace,
  append, visible range, viewport follow, right-edge limits, and display
  context;
- replay display-window loading resolves its base from the target pane chart
  snapshot for every pane;
- replay fan-out appends same-timeframe reveal batches to all matching panes
  through the same chart command path;
- different-timeframe panes are projected/reloaded by pane-local display
  loading, not by borrowing active-pane state;
- pane display coordination may initialize any pane, including the default pane,
  through the same public command path.

## Forbidden

- No chart display state split between primary global state and non-primary map.
- No `statefulLoad` branch keyed to `primary`.
- No `primaryFullDisplayBars` fan-out parameter.
- No same-feature implementation branch where `primary` writes chart state one
  way and other panes write it another way.
- No route-local or feature-local direct chart series writes.

## Detailed Substeps

1. Add structural regression coverage:
   - a static smoke that rejects the old dual-path identifiers in the runtime
     display path;
   - a browser smoke for TF-change followed by replay Next, asserting the
     replay cursor advances and mounted panes remain populated without TF
     leakage.
2. Rebuild chart runtime pane state:
   - replace global display `state` plus `paneDisplayStateByPaneId` with one
     pane state store;
   - make `primary` an initialized pane record, not a special state owner;
   - route replace/append/range/follow/context commands through the same pane
     helpers.
3. Rebuild replay display-window and fan-out:
   - resolve base bars and display revisions from the target pane chart state
     for every pane;
   - append same-timeframe reveal batches to all matching panes through one
     append path;
   - remove primary full-display fallback.
4. Rebuild pane display coordination:
   - allow default pane initialization through the same ensure path;
   - keep active-pane toolbar behavior in layout state, not chart/replay
     ownership.
5. Run targeted replay and multi-pane smokes, then update TODO and session
   handoff.

## Verification

- Static smoke fails if old architecture identifiers remain in core display
  runtime files.
- Browser smoke covers the reported class: active pane TF changes plus manual
  interactions followed by Next must keep every mounted pane responsive.
- Existing multi-pane and replay smokes continue to pass.
- `git diff --check` passes before each code commit.
