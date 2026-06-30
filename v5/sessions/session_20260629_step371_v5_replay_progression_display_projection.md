# Step 371 - V5 Replay Progression Display Projection

## Goal

Keep display timeframe semantics clean when replay progression advances.

Next/Play should move the replay cursor by exactly one replay-timeframe bar and
then project the current display timeframe up to that cursor. They must not
append a replay-timeframe bar into display bars when the chart is showing a
different display timeframe.

## Context

Step 370 wired real chart viewport demand into replay display-window loading and
merged same-timeframe display windows. The remaining semantic gap is replay
progression while `displayTimeframe !== replayTimeframe`.

Current risk:

- `Next` advances the replay cursor and appends the next replay-timeframe bar to
  `displayBars`.
- If the chart is displaying 5m, 1H, or 1D bars, appending a 1m replay bar mixes
  timeframes in chart state.

Product rule:

- `session.timeframe` controls replay progression.
- `displayTimeframe` controls chart bars.
- The replay cursor is the right-side visibility boundary.
- The chart should display only bars from the active display timeframe that are
  allowed by the current replay cursor.

## Planned Steps

### Step 371.1 - Progression Projection Smoke

- Add `v5/tests/replay-display-progression-smoke.js`.
- Create a 1m replay session.
- Switch display timeframe to 5m.
- Run Next.
- Assert replay cursor advances by one 1m bar.
- Assert display bars remain 5m bars only and do not include the 1m next bar.

Status: complete.

Red check:

- `node v5/tests/replay-display-progression-smoke.js` fails because `Next`
  currently appends the 1m replay bar into 5m display bars.

### Step 371.2 - Projection Runtime Path

- Refactor replay progression so Next persists the cursor after selecting the
  next replay bar.
- Reload/project the active display timeframe through bounded display-window
  loading after cursor movement.
- Keep chart writes inside chart runtime commands.
- Keep bar requests inside bar data runtime.

Status: complete.

Completed:

- Added display anchor alignment to display timeframe boundaries.
- `Next` now advances and persists the replay cursor before display projection.
- When display timeframe differs from replay timeframe, `Next` reloads/projects
  the active display timeframe through bounded display-window loading.
- When display timeframe equals replay timeframe, existing append behavior is
  preserved.

### Step 371.3 - Existing Replay Semantics

- Preserve one replay-timeframe bar per Next.
- Preserve Play repeated one-bar advancement.
- Preserve session-end behavior.
- Preserve reset/restart no-future behavior.
- Keep display projection bounded and cursor-filtered.

Status: complete.

Completed:

- Existing 1m replay/display Next, Play, Reset, and session-end semantics remain
  covered by existing smokes.
- Reset now projects the active non-replay display timeframe at the start cursor
  instead of replacing chart state with replay-timeframe prefix bars.
- The display progression smoke covers reset under a 5m display timeframe.

### Step 371.4 - Browser Coverage And Handoff

- Extend browser coverage for a non-replay display timeframe progression path.
- Add the new smoke to `v5/scripts/smoke_all.js`.
- Run the Step 371 check set and update this handoff.

Status: complete.

Completed:

- Added `replay-display-progression-smoke.js` to `v5/scripts/smoke_all.js`.
- Extended the display timeframe browser smoke so the UI Next button advances a
  1m replay cursor while the chart remains on 5m display bars.
- Browser coverage verifies the display projection requests a bounded 5m window
  and does not request the full session range.

## Manual Acceptance

- `session.timeframe` remains the replay progression timeframe; Next/Play reveal
  exactly one replay-timeframe bar per step.
- When `displayTimeframe !== replayTimeframe`, Next/Play must not append
  replay-timeframe bars into the display bars.
- Display bars after cursor movement are derived from the current
  `displayTimeframe` and filtered by the replay cursor.
- Higher display timeframes still require complete bars before the cursor unless
  a future documented exception allows partial bars.
- The projection path uses bounded bar-data windows and cache; it does not load
  the full session range or session-to-end future.
- Reset returns the cursor to the start and projects display state at the start
  without leaking future bars.
- UI remains command/event driven and does not request bars or write chart
  series directly.

## Checks

- `node v5/tests/replay-display-progression-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-reset-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Completed

- Added Step 371 plan to `v5/TODO.md`.
- Added `v5/tests/replay-display-progression-smoke.js`.
- `Next` now advances and persists the replay cursor first.
- When `displayTimeframe !== replayTimeframe`, replay progression projects the
  active display timeframe through bounded display-window loading.
- When `displayTimeframe === replayTimeframe`, existing one-bar append behavior
  remains intact.
- Display projection aligns bar-window anchors to display timeframe boundaries.
- Reset now projects non-replay display timeframe state at the start cursor.
- Legacy prefix-demand loading is ignored while a non-replay display timeframe
  is active, so old 1m prefix chunks cannot mix into 5m/1H/1D display bars.
- Extended browser display timeframe coverage to click Next while displaying 5m
  bars and verify no 1m replay bar appears in display state.
- Added the display progression smoke to `v5/scripts/smoke_all.js`.

## Verified

- `node v5/tests/replay-display-progression-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-reset-smoke.js`
- `node v5/tests/replay-session-end-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/prefix-demand-load-smoke.js`
- `node v5/tests/prefix-retention-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Notes For Next Session

Step 371 is complete. The next V5 slice can move back to product surface work:
make panning/viewport controls more realistic than command-only visible range
simulation, or add a small chart interaction layer that emits visible-range
changes from actual user drag gestures while keeping chart runtime as the only
viewport observer and chart writer.
