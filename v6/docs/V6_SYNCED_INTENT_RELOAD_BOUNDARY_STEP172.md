# V6 Synced Intent Reload Boundary - Step 172

Date: 2026-07-08

## Decision

Synced Symbol/Interval intent changes must not directly request bars from
`pane-intent-sync-runtime`.

Step 172 defines a separate reload trigger boundary:

- `pane-intent-sync-runtime` owns Symbol/Interval fan-out only.
- A future `pane-intent-reload-runtime` owns deciding that a pane intent change
  needs chart data reload work.
- Bar-data runtime remains the only runtime that can request/cache K-line
  windows.
- Chart-data runtime remains the only runtime that can mutate pane chart bars.
- Chart-viewport/chart-entry owners remain responsible for viewport projection.
- Replay runtime remains the only owner of cursor and reveal/no-future state.

## Trigger Inputs

The future reload trigger boundary may listen to:

- `pane:symbolIntentChanged`
- `pane:intervalIntentChanged`
- `paneIntentSync:applied`

It may produce reload-intent records for affected panes, but it must not request
bars or write chart data itself.

## Reload Intent Record

A reload-intent record should contain:

- `paneId`
- `reason`: `symbol` or `interval`
- `instrument`
- `displayTimeframe`
- `source`: manual pane intent or synced fan-out

This record is not a bar-data request. It is a handoff input for a later owner
that can plan windows under replay no-future constraints.

## Required Future Guards

Before real reload implementation:

- replay cursor and visible no-future constraints must be read from replay owner;
- bar windows must be planned through bar-data owner;
- chart-data replacement must happen through chart-data owner;
- viewport reset/projection must happen through chart-viewport/chart-entry owner;
- synced target panes must not reveal future bars.

## Forbidden In Step 172

- No `BAR_DATA_COMMANDS.LOAD_WINDOW`.
- No `CHART_DATA_COMMANDS.REPLACE_BARS`.
- No `CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION`.
- No `REPLAY_COMMANDS.LOAD_SESSION`, `NEXT`, or cursor mutation.
- No chart-engine series writes.
- No UI route fan-out reload behavior.

## Next

Step 173 can add the reload trigger runtime skeleton that emits reload-intent
records. It should still avoid actual bar-data requests and chart-data writes.
