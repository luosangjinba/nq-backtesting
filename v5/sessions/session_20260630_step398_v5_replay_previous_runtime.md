# Step 398 - V5 Replay Previous Bar Runtime

Date: 2026-06-30

## Goal

Implement the `<|` previous-bar transport action as the inverse of `Next` for
already revealed replay bars.

## Scope

This step advances Historical Replay Review by replacing a disabled replay
transport placeholder with real command-driven runtime behavior.

In scope:

- `replay.previous` command and `replay:previous` event contracts;
- replay runtime previous behavior;
- session cursor persistence after rewind;
- UI enablement and click wiring for `data-replay-previous`;
- runtime and browser smoke coverage.

Out of scope:

- selected-bar truncation;
- active chart interval sync;
- new bar-loading strategy for previous;
- Layout split panes;
- drawing tools;
- order or journal workflows.

## Plan

- [x] Add command/event contracts.
- [x] Implement runtime previous using already revealed replay bars.
- [x] Pause playback before rewinding.
- [x] Persist rewound cursor and revealed count.
- [x] Enable `<|` only when `revealedCount > 0`.
- [x] Add runtime and browser smoke coverage.
- [x] Run targeted smokes, full V5 smoke, and `git diff --check`.

## Implementation Notes

- `previous` returns `{ rewound: false, reason: 'start-bar' }` at the start
  bar.
- For same-timeframe display, previous removes display bars after the rewound
  cursor and re-renders through chart runtime.
- For aggregate display timeframe, previous rewinds the replay cursor and
  re-projects display through the existing display-window path.
- Previous does not call bar-data runtime directly; it only uses already
  revealed cursor state.
- UI disables `data-replay-previous` when `revealedCount <= 0`.

## Manual Acceptance

- `<|` is disabled at the start bar.
- After `Next`, `<|` is enabled and rewinds one bar.
- The footer cursor/revealed count and persisted session cursor match the
  rewound state.
- Previous pauses playback before rewinding.
- Previous does not request new bars or reveal future bars.

## Checks

- `node v5/tests/replay-previous-smoke.js`
- `node v5/tests/replay-display-contracts-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-restore-browser-smoke.js`
- `node v5/tests/replay-restore-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

All checks passed before commit.
