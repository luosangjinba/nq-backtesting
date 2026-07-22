# Session — Stage Code Review P1 Corrections

Date: 2026-07-22
Status: completed with automated evidence

## Trigger

The stage code review found three P1 correctness gaps: unsupported V4
instruments silently mapped to NQ, real chart mutations could survive a later
apply/stale failure, and a Pane transitioning from ready to empty retained its
old child adapter data and OHLC index. The user requested that all P1 findings
be corrected before P2 work.

## Delivered

- replaced the V4 adapter's non-ES fallback with an explicit NQ/ES map and an
  unsupported failure before network I/O;
- captured the last accepted single-Pane data, OHLC index, horizontal and
  vertical scale state, adapter revision, and visible metadata before each
  fallible chart mutation;
- restored that state after paint-time staleness, apply failure, or outer
  discard, while preventing a late older rollback from overwriting a newer
  mutation;
- changed multi-Pane apply from early-rejecting `Promise.all` to complete
  settlement plus all-child rollback before propagating the first failure;
- made empty Pane results apply an explicit reversible zero-data mutation,
  clearing stale OHLC and chart metadata while retaining one child adapter for
  the later empty-to-ready transition.

## Existing-Capability Decision

Official Lightweight Charts documentation confirms that `setData()` and
`update()` synchronously replace/update series data and that
`subscribeDataChanged()` reports those calls; it does not provide transaction
or rollback semantics. `removeSeries()` is irreversible. The official
awesome-tradingview catalog exposes no multi-chart atomic commit component.
The correction therefore remains inside V7's sole chart-writer adapter and
implements explicit prior-state restoration.

## Evidence

- V4 provider Harness rejects an unsupported MES identity with zero fetches;
- Pane-set Materialization Harness proves a child failure after visible
  mutation restores every child and prevents Pane surface commit;
- real Lightweight Charts Chrome Harness proves post-paint stale rollback,
  outer-discard rollback, and reversible ready/empty state including OHLC;
- Replay Pane Workspace and Replay Layout Chrome Harnesses preserve shared
  Replay, layouts, crosshair/OHLC, and existing interaction behavior;
- all 39 non-browser Harnesses pass;
- all six real-Chrome Harnesses pass, including the chart adapter, layout,
  multi-Pane RTH history, Pane Workspace, Replay Workspace performance, and
  Session Browser gates;
- architecture, source-quality, JSON parsing, and `git diff --check` gates
  pass.

## Deferred P2 Boundary

No GoTo change is included. The user reports that the current GoTo product
design differs from the intended interaction; a revised contract must be
recorded before modifying its shortcuts or disabled behavior.
