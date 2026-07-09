# V6 Session - 2026-07-09 - Step 236 Replay Previous Domain Command

## Scope

Step 236 implemented the replay-owned previous cursor command only.

## Changes

- Added `REPLAY_COMMANDS.PREVIOUS` and `REPLAY_EVENTS.REWOUND`.
- Added `previousReplayState` in replay domain.
- Registered runtime handling for `replay.previous`.
- Extended replay domain/runtime smokes.
- Added `v6/tests/replay-previous-domain-command-step236-smoke.js`.
- Updated the Step 235 guard smoke so it continues to protect UI/chart-entry
  wiring while allowing the accepted replay-owned command.

## Behavior

- Previous cursor movement decrements one replay step.
- Previous clamps at cursor index `0`.
- Previous returns `ready` status.
- Runtime previous stops internal playback before rewinding.
- Runtime emits `replay:rewound`; leaving `playing` or `ended` also emits
  `replay:playbackChanged`.

## Non-Goals

- Did not enable the transport Previous button.
- Did not add chart-entry manual previous orchestration.
- Did not mutate chart-data, viewport, bar-data, pane, indicator, trading, or
  journal behavior.
