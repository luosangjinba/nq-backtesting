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

Step 401 extends the original Step 374 contract with a manual replay viewport
anchor. Real drawing tools and split-layout behavior remain out of scope, but
native chart drag/zoom now has replay transport semantics.

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
- Initial load follows the replay cursor.
- Reset follows back to the start cursor.
- Manual drag/zoom pauses viewport follow and establishes a manual viewport
  anchor.
- While the chart is manually anchored, Next, Previous, and Play advance replay
  reveal state without resuming follow.
- While manually anchored, replay transport cursor deltas shift the manual
  visible range by the same delta so the newest replay bar keeps its screen
  anchor instead of snapping to the canvas right edge.
- Manual visible ranges may include empty right-side whitespace beyond the
  replay cursor. That whitespace is part of the user's viewport anchor, but
  chart runtime must still render only bars at or before the replay right-edge
  limit.
- Runtime-originated chart writes, including `setData()` and programmatic
  visible-range/logical-range updates, must not be reinterpreted as native user
  drag events. Native engine visible-range callbacks are user input only when
  they follow actual chart pointer/wheel/touch input.
- Native engine user input must preserve right-side logical whitespace. If an
  engine's visible time range excludes empty space after the latest data bar,
  the adapter must use the visible logical range to reconstruct the manual
  time-based visible range before sending it to chart runtime.
- The explicit reset/follow control resumes viewport follow and clears the
  manual anchor.
- Resuming viewport follow must also clear the chart runtime's stored
  `visibleRange`; otherwise chart sync can reapply a stale native/manual range
  after the follow logical range.
- Manual replay viewport anchoring is independent of the floating replay
  transport's screen position. Moving the transport controls must not alter
  follow/manual state, replay cursor, display bars, or bar-data windows.

## Manual Viewport Rule

Manual viewport movement pauses follow. Replay transport must preserve the
manual anchor until the user explicitly requests reset/follow cursor behavior.
This means replay runtime may keep sending cursor updates to chart runtime, but
chart runtime remains the owner of whether those updates are applied as follow
or as a manual anchor shift.

For Lightweight Charts, preserving right-side whitespace can require
`setVisibleLogicalRange` rather than `setVisibleRange`, because a time range
whose `to` is after the final rendered bar can otherwise be normalized back to
the last data timestamp. The adapter should keep that engine detail internal:
chart runtime state remains expressed as a time-based visible range, while the
adapter maps it to the engine representation needed to preserve the viewport.
The reverse mapping is also required for native drag: when Lightweight reports a
visible time range ending at the final data timestamp, the adapter should read
the visible logical range and extend the time range by the logical right offset.

## Runtime Contract

Chart runtime should expose a command for replay runtime to set follow state:

- enabled flag;
- cursor timestamp;
- estimated visible bar capacity.

`rightOffsetBars` is a chart presentation setting. Replay runtime should not
read presentation settings solely to sync follow state. Chart runtime applies
the current chart presentation/display context when deriving `visibleBars`.

The follow command may accept an explicit `rightOffsetBars` override for tests
or future chart-owned callers, but the default ownership remains chart
presentation, not replay state.

Chart runtime may store all received bars, but rendering should use the follow
state to derive `visibleBars`.

Replay runtime should call this command after:

- initial display render;
- Next;
- Play tick display render;
- Reset;
- display timeframe reload/projection.

Initial load and Reset should pass an explicit resume/follow intent. Next,
Previous, and Play ticks should not pass resume; chart runtime decides whether
the current viewport is follow mode or manual-anchor mode.

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
- manual drag followed by Next/Previous/Play preserves manual mode and shifts
  the manual visible range by replay cursor deltas;
- manual right-side whitespace survives Next/Previous/Play without rendering
  future bars after the replay cursor;
- replay `displayBars` length and cursor identity do not change because of
  viewport follow;
- `/v4/bars` request count does not increase solely from follow updates.

Expected checks:

- `node v5/tests/chart-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
