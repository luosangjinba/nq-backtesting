# Step 395 - Replay Transport Position Modularization

Status: completed on 2026-07-12.

## Outcome

Replay Transport floating-position ownership is now split into two focused
modules:

- `replay-transport-position.js` owns finite-number normalization, viewport
  clamping, and immutable persisted position snapshots;
- `replay-transport-position-controller.js` owns drag pointer listeners, DOM
  positioning, preference restore/save, and listener cleanup.

`replay-transport.js` remains the public mount/orchestration boundary and still
owns replay command dispatch, event synchronization, keyboard shortcuts, period
selection, speed controls, and lifecycle teardown. Its size fell from 703 to
571 lines without changing its public API.

The extracted position controller has no replay, chart-entry, command-bus, or
event-bus dependency.

## Verification

- position domain smoke passed;
- position-controller boundary smoke passed;
- replay transport controller smoke passed;
- Replay Transport browser pack passed `4/4` in `14210ms`;
- V6 boundary smoke passed;
- static architecture suite passed `127/127`;
- `git diff --check` passed.

The browser smoke now asserts that keyboard Next advances the replay cursor by
one and increases visible bars, rather than requiring the chart array to grow by
exactly one. Exact `+1` was an obsolete implementation-shape assertion because
accepted asynchronous display materialization may replace multiple display bars.

## Next recommendation

Step 396 should extract the Replay Transport period menu and keyboard-focus
controller. It should own option discovery, disabled-option filtering,
Arrow/Home/End/Escape behavior, focus return, and menu closing, while the main
transport continues to dispatch playback-period commands and consume period
events. Preserve the Step 395 `4/4` browser pack as the regression gate.
