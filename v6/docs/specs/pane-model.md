# Pane Model

## Purpose

V6 must not repeat V5's primary/non-primary multi-pane confusion.

The first pane may be named `primary` for DOM/test compatibility, but it is not
a privileged runtime owner. Every pane uses the same state shape, command path,
event path, chart host lifecycle, viewport intent model, and data application
path.

## Canonical Pane Record

Every pane is represented by one record shape:

```js
{
  id: string,
  instrument: string,
  displayTimeframe: number,
  chartBarsRevision: number,
  viewportIntentRevision: number,
  active: boolean
}
```

Additional pane-local fields may be added only if they apply to every pane.

## Ownership

Layout runtime owns:

- pane list;
- active pane id;
- layout mode;
- sync flags.

Chart data runtime owns pane-local bars for every pane through one store.

Chart viewport runtime owns pane-local viewport intent for every pane through
one store.

Replay runtime owns shared replay cursor/reveal state. It does not own a
primary pane.

## Rules

- Single-pane mode is just a layout with one pane record.
- Multi-pane mode adds pane records; it does not create secondary-specific
  runtime logic.
- Commands that target a pane always take `paneId`.
- If `paneId` is omitted, the command resolves the active pane or explicit
  default pane through layout runtime.
- Replay reveal fan-out must be coordinated from shared cursor state and pane
  records, not from primary update followed by secondary catch-up.
- Timeframe changes target the active pane unless interval sync is explicitly
  enabled.
- Viewport intent is pane-local unless time/date sync is explicitly enabled.

## Forbidden

- Separate `primaryState` and `secondaryState` stores.
- Primary-only display bars with non-primary projection as an afterthought.
- Secondary panes listening to primary replay events to catch up visually.
- Any file or helper whose main branch is `if primary else non-primary` for
  chart data, viewport intent, or replay reveal.
- Active-pane display timeframe fallback leaking into other panes.
- Tests that only assert primary behavior while assuming secondary will catch
  up later.

## Required Tests Before User-Facing Multi-Pane

- static audit for forbidden primary/non-primary state names and branches;
- two-pane same-timeframe replay Next visible on both panes from one fan-out;
- two-pane mixed-timeframe projection without active-pane leakage;
- pane-local drag/manual wall on one pane does not change another pane;
- active-pane timeframe changes do not blank or corrupt inactive panes.
