# Step 396 - Replay Transport Period Menu Modularization

Status: completed on 2026-07-12.

## Outcome

Replay Transport period-menu ownership is now split into two focused modules:

- `replay-transport-period-navigation.js` owns pure Arrow Up/Down, Home, End,
  and Escape navigation decisions;
- `replay-transport-period-menu-controller.js` owns option discovery, disabled
  filtering, menu open/close state, focus movement/return, and option clicks.

The controller receives `onSelect(period)` from `replay-transport.js`. It does
not import playback-period contracts, dispatch commands, or subscribe to runtime
events, so playback-period command/event ownership remains in the main Replay
Transport boundary. The main file fell from 571 to 512 lines.

## Verification

- period navigation smoke passed;
- period-menu controller boundary smoke passed;
- replay transport controller smoke passed;
- Playback Period browser smoke passed;
- Step 396 combined browser pack passed `2/2` in `16082ms`, including the Step
  395 Replay Transport pack at `4/4` in `14218ms`;
- V6 boundary smoke passed;
- static architecture suite passed `127/127`;
- `git diff --check` passed.

## Next recommendation

Step 397 should extract Replay Transport DOM presentation. Move dataset, button
labels/disabled states, speed selection, period labels/options, and sync-toggle
rendering into a presentation renderer with no command/event dependencies.
Keep state creation, command dispatch, subscriptions, and lifecycle composition
in `replay-transport.js`, and preserve the Step 396 combined browser pack.
