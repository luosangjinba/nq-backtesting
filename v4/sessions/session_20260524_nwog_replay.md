# V4 NWOG Replay-Aware Session

## Branch
- `research/v4-review-notes-design`

## Goal
- Fix `Show/Hide This Week NWOG` when the chart is in Replay Bar mode and the full target week is not currently displayed.
- Keep NWOG reference-price calculation objective while making the rendered range respect the current replay slice.

## Problem
- The original NWOG overlay required the current visible bars to include the weekly Sunday 18:00 open.
- In a mid-week replay slice, the true weekly open can be outside the displayed chart data, so the NWOG range failed to render or could not get valid chart coordinates.
- Example user case: `20120120-20120122` with Replay Bar enabled.

## Implementation
- `v4/src/ui/replay-controls.js`
  - Added `getReplayVisibleBars()` so other modules can read the current replay slice without mutating replay state.
  - Emits `replay:changed` when replay slice changes, moves forward, or exits replay.
- `v4/src/pda/objective-gaps.js`
  - NWOG render bounds now use replay-visible bars when Replay Bar is on; otherwise they use normal display bars.
  - NWOG price bounds still come from the true Sunday 18:00 open and previous Friday close.
  - If the current loaded bars do not include those reference bars, the module fetches a small 1H reference window through `/v4/bars`.
  - Existing visible objective NWOG annotations are resynced on `replay:changed`, extending or shrinking the rendered right edge to the current replay slice.

## Behavior
- In Replay Bar mode, `Show/Hide This Week NWOG` can display as soon as the replay slice contains at least one bar in that week.
- The rectangle starts at the first currently replay-visible bar in that week and ends at the latest replay-visible bar in that week.
- Exiting Replay Bar restores the NWOG render range to the normal displayed chart range.

## Verification
- `node --check v4/src/pda/objective-gaps.js`
- `node --check v4/src/ui/replay-controls.js`
- Local `/v4/health` returned OK before implementation verification.

## Not Implemented
- NDOG remains unchanged; it still requires the session open in the visible range.
- No persisted archive schema change.
- No browser screenshot verification was run in this session.
