# FX Replay Viewport Follow

Phase: Phase 2 - Viewport And Display Semantics.

Phase gate: display bars may retain revealed history, but the chart viewport
must follow the replay cursor with right-side offset and older bars rolling out
of view during replay progression.

## Scope

This spec covers auto-follow behavior while a replay session is active:

- initial chart entry;
- Next;
- Play;
- Reset;
- display timeframe projection after cursor movement.

This step does not implement full manual drag/zoom interaction. Real drag/zoom,
crosshair navigation, and user-controlled visible range editing belong to Phase
3. Step 374 only defines the runtime contract and default auto-follow behavior
needed for replay progression.

## Concepts

- `displayBars`: replay-owned revealed display history. It may contain more bars
  than the chart currently renders.
- `visibleBars`: chart-owned rendered subset of `displayBars`.
- `cursorTimestamp`: replay-owned right-side reveal boundary.
- `rightOffsetBars`: presentation setting for empty/right-side space after the
  cursor.
- `estimatedVisibleBars`: chart viewport capacity derived from chart metrics.

## Rules

- Replay runtime owns when the cursor moves.
- Chart runtime owns which bars are rendered in the current viewport.
- UI must not slice `displayBars` or directly mutate chart runtime internals.
- Auto-follow changes must not request bars by themselves.
- Auto-follow changes must not mutate replay cursor.
- Auto-follow changes must not mutate `displayBars`.
- When auto-follow is active, the cursor bar should remain near the right side
  of the rendered chart with `rightOffsetBars` reserved.
- If there are more revealed bars than fit the visible capacity, older left-side
  bars roll out of the rendered viewport.
- Reset follows back to the start cursor.

## Manual Viewport Rule

Until Phase 3 implements real drag/zoom:

- auto-follow is always active after initial load, Next, Play, and Reset;
- manual pan/zoom does not have a user-facing contract in Step 374.

Phase 3 must explicitly decide whether manual viewport movement pauses
auto-follow, and how the user resumes following the replay cursor.

## Runtime Contract

Chart runtime should expose a command for replay runtime to set follow state:

- enabled flag;
- cursor timestamp;
- estimated visible bar capacity;
- right offset bars.

Chart runtime may store all received bars, but rendering should use the follow
state to derive `visibleBars`.

Replay runtime should call this command after:

- initial display render;
- Next;
- Play tick display render;
- Reset;
- display timeframe reload/projection.

## Forbidden

- Slicing display bars in feature route code.
- Treating visible bars as replay state.
- Loading more bars solely because auto-follow moved the viewport.
- Replacing `displayBars` with only the visible subset.
- Implementing Phase 3 drag/zoom behavior inside Step 374.

## Verification

Step 374 should add or update harnesses proving:

- chart runtime keeps full bars state but renders a visible subset when follow
  capacity is smaller than the bar count;
- Next/Play keep cursor near the right side and roll older bars out of the
  rendered chart;
- replay `displayBars` length and cursor identity do not change because of
  viewport follow;
- `/v4/bars` request count does not increase solely from follow updates.

Expected checks:

- `node v5/tests/chart-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
