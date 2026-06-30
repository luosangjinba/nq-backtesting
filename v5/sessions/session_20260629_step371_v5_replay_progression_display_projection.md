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

Status: planned.

### Step 371.3 - Existing Replay Semantics

- Preserve one replay-timeframe bar per Next.
- Preserve Play repeated one-bar advancement.
- Preserve session-end behavior.
- Preserve reset/restart no-future behavior.
- Keep display projection bounded and cursor-filtered.

Status: planned.

### Step 371.4 - Browser Coverage And Handoff

- Extend browser coverage for a non-replay display timeframe progression path.
- Add the new smoke to `v5/scripts/smoke_all.js`.
- Run the Step 371 check set and update this handoff.

Status: planned.

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
