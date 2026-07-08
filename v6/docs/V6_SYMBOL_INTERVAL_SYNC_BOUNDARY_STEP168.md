# V6 Symbol/Interval Sync Boundary - Step 168

Date: 2026-07-08

## Decision

Symbol and Interval sync are not chart-only effects.

The Step 166/167 layout sync bridge may keep handling chart-only effects:

- `dateRange`
- `time`
- `crosshair`

The bridge must not implement Symbol or Interval reload behavior. Those toggles
change pane data intent and can require bar-data windows, chart-data replacement,
viewport re-projection, and replay no-future guards.

## Owner Contract

### Layout Runtime

Owns:

- sync toggle state;
- active layout mode and visible pane ids.

Does not own:

- pane symbol intent;
- pane display timeframe intent;
- bar requests;
- chart-data writes;
- replay cursor or reveal state.

### Pane Runtime

Owns the pane-local target state that Symbol/Interval sync will eventually
mutate.

Required before implementation:

- explicit pane-local symbol intent;
- explicit pane-local interval or display-timeframe intent;
- events for symbol/interval target changes.

### Future Symbol/Interval Sync Runtime

Step 168 selects a dedicated future runtime boundary for fan-out:

- listens to layout sync state;
- receives one pane-local source change;
- fans out target symbol/interval intent to other eligible visible panes;
- delegates K-line request planning to bar-data runtime;
- delegates chart-data mutation to chart-data runtime;
- delegates viewport projection to chart-viewport/chart-entry owners.

This runtime may orchestrate commands, but it must not fetch bars directly,
write series directly, or mutate replay cursor state.

### Bar Data Runtime

Remains the only owner that requests and caches K-line windows.

### Chart Data Runtime

Remains the only data-state owner for pane chart bars.

### Chart Engine

Remains the only owner that writes chart series through Lightweight Charts.

Lightweight Charts exposes chart/series APIs such as chart series creation and
series data replacement/update, but Symbol/Interval sync must reach those only
through existing chart-data and chart-engine owner paths.

### Replay Runtime

Remains the only owner of replay cursor, reveal state, and no-future-bars
semantics. Symbol/Interval sync must not reveal future bars or move the replay
cursor as a side effect.

## Forbidden Paths

- `layout-sync-surface-bridge` must not import or dispatch bar-data commands.
- `layout-sync-surface-bridge` must not import or dispatch chart-data commands.
- `layout-sync-surface-bridge` must not import or dispatch replay commands.
- `layout-sync-surface-bridge` must not implement Symbol or Interval reloads.
- UI controls must not directly fan out Symbol/Interval reloads.
- Chart-engine must not become the owner of symbol/interval intent.

## Next

Step 169 can add the pane intent model needed for future Symbol/Interval sync,
or add the dedicated sync runtime skeleton. It should still avoid implementing
data reloads until the pane intent contract is test-covered.
