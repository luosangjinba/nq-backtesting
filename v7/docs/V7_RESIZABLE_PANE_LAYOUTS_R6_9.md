# V7 Resizable Pane Layouts — R6.9

Status: human accepted as part of the combined Pane gate (2026-07-21)

## Product Layout Set

R6.9 exposes exactly the reviewed one-to-four Pane set:

- one: single;
- two: columns and rows;
- three: columns, rows, two-left/one-right, and one-left/two-right;
- four: grid, three-left/one-right, one-left/three-right,
  one-top/three-bottom, and three-top/one-bottom.

Every product Pane retains one independent Lightweight Charts host. Existing
Pane identities remain stable when the count changes, so a retained Pane keeps
its instrument, timeframe, Viewport owner, and chart instance.

R6.10c1 subsequently defines the exact user-facing P1-P4 geometry and replaces
the original reading-order leaves. See `V7_PANE_PRIORITY_IDENTITY_R6_10C1.md`.

## Existing-Capability Decision

Lightweight Charts has native vertical panes, draggable pane separators, and a
`PaneApi.setHeight` API. Those panes live inside one chart and share its time
scale, which fits a main series plus indicator sub-panes but not V7 product
Panes with independent instruments, timeframes, and Viewports. R6.9 therefore
uses one chart host per product Pane and an outer DOM split tree owned by Replay
Workspace UI.

Reference:

- https://tradingview.github.io/lightweight-charts/tutorials/how_to/panes

## Ownership And Transitions

`core.pane-layout-domain` is pure. It owns the registered layout variants,
immutable binary split tree, versioned wire schema, deterministic leaf order,
and measured resize constraints. It owns no DOM, chart, Pane intent, Replay,
bars, Viewport, or persistence state.

Replay Workspace UI owns only the layout picker, DOM split tree, and transient
drag preview. Session Store remains the durable owner and stores the accepted
layout through an explicit Session id. Chart Snapshot Application remains the
sole chart-series writer.

- switching between variants with the same Pane count performs no bar request,
  Replay change, or Workspace transaction;
- accepting a mouse or keyboard resize persists only the next layout ratio;
- changing Pane count uses the existing complete Pane-set materialization and
  publishes the new layout only with an accepted visible result;
- failed count materialization preserves the last accepted Pane set and layout;
- ETH/RTH and Replay actions still target every Pane, including mixed
  instruments and timeframes.

## Resize And Persistence Contract

Each split uses a `5px` separator. Pointer dragging and focusable arrow-key
resizing are supported. The pure domain clamps every split against the measured
subtree so each Pane keeps at least `280px` width and `120px` height. Accepted
ratios serialize as `v7.pane-layout` version 1 inside the Session workspace
envelope and restore when that Session is re-entered.

This step persists layout variant and ratios only. Broader Pane intent and hard
refresh restoration remain R7 work.

## Gate

- the pure Harness binds all 12 variants, ordered leaves, exact schema
  round-trip, nested minimum constraints, and negative controls;
- Session Store Harness binds Session isolation, reconstruction, and layout
  persistence without changing activation identity;
- real Chrome binds the grouped `1/2/3/4` picker, one-to-four materialization,
  same-count switching, mouse and keyboard resizing, minimum geometry, mixed
  NQ/ES plus `1m/4h`, all-Pane RTH and Next, and Session re-entry restoration;
- all 39 non-browser and six serial real-Chrome Harnesses pass, including the
  architecture, source-quality, visual, Session Browser, and retained
  performance gates; `git diff --check` also passes.

The review-required Crosshair portion is implemented by R6.9a and the Canvas
overlay plus transient Pane maximize corrections by R6.9b. Remaining Symbol/
Interval/Time/Date-range sync is deliberately deferred to R6.10. Economic
Calendar remains an optional second-phase business module.
