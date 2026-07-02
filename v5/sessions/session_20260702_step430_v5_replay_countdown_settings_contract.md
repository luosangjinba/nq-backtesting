# Step 430 - V5 Replay Countdown Settings Contract

Status: completed.

## Trigger

Implement the first high-risk Settings backlog item through an explicit runtime
contract instead of direct route UI behavior.

## Plan

1. Define the countdown ownership contract before adding UI.
2. Add replay runtime derived countdown state.
3. Add a presentation visibility setting for the countdown row.
4. Wire Settings draft/apply behavior to the visibility setting.
5. Render the countdown label from replay state in the chart route.
6. Add smoke coverage and run full V5 verification.

## Implementation

- Added `v5/docs/REPLAY_COUNTDOWN_CONTRACT.md`.
- Updated `v5/docs/SETTINGS_BACKLOG_MATRIX.md` to mark bar countdown as
  implemented through a replay-runtime contract.
- Added `showBarCountdown` to chart presentation settings.
- Added `countdown` to `REPLAY_COMMANDS.GET_STATE` snapshots with
  `active`, `remainingSeconds`, `closeTimestamp`, and `label`.
- Added a `Bar countdown` Settings checkbox in the Status line section.
- Added a footer countdown row that renders the replay-provided label.

## Guardrails

- Route UI does not calculate countdown remaining time.
- The countdown snapshot does not request bars, mutate replay cursor, mutate
  display bars, write chart series, or update persistence.
- Presentation state controls only countdown visibility.
- Countdown close timestamp is capped at session end.

## Verification

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/chart-presentation-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node --check v5/src/features/chart-replay/chart-replay-template.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 431 should plan another high-risk settings contract before UI. Good
candidates are lock price-to-bar ratio or session breaks because both need
explicit runtime/adapter behavior and visual acceptance.
