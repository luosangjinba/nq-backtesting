# Step 399 - V5 Replay Truncate To Selected Bar

Date: 2026-06-30

## Goal

Implement the `|<-` transport action using the current crosshair-inspected bar
as the selected replay bar.

## Scope

This step advances Historical Replay Review by replacing the selected-bar
truncation placeholder with real command-driven replay runtime behavior.

In scope:

- `replay.truncateToTimestamp` command and `replay:truncated` event contracts;
- replay runtime truncation to a timestamp within the already revealed range;
- session cursor persistence after truncation;
- UI enablement and click wiring for `data-replay-truncate-to-selection`;
- runtime and browser smoke coverage.

Out of scope:

- active chart interval sync;
- persistent selected-bar state independent of crosshair;
- Layout split panes;
- drawing tools;
- order or journal workflows.

## Plan

- [x] Add command/event contracts.
- [x] Implement runtime truncate-to-timestamp behavior.
- [x] Pause playback before truncating.
- [x] Persist truncated cursor and revealed count.
- [x] Enable `|<-` only for a valid crosshair-selected replay bar between start
  and cursor.
- [x] Add runtime and browser smoke coverage.
- [x] Run targeted smokes, full V5 smoke, and `git diff --check`.

## Implementation Notes

- The first selected-bar source is the current chart crosshair inspect payload.
- `data-replay-truncate-to-selection` remains disabled unless crosshair time is
  within `[startBarTimestamp, cursorTimestamp]`.
- `replay.truncateToTimestamp` returns a no-op reason when the selected
  timestamp is outside the revealed range.
- Same-timeframe display truncates `displayBars` through replay runtime and
  re-renders via chart runtime.
- Aggregate display timeframe re-projects through the existing display-window
  path.
- UI does not mutate replay state directly; it dispatches the replay command.

## Manual Acceptance

- `|<-` is disabled without a valid crosshair-selected replay bar.
- Inspecting an already revealed bar enables `|<-`.
- Clicking `|<-` moves cursor to the selected bar and removes displayed bars
  after it.
- Truncation persists cursor/revealed count and pauses playback.
- Truncation does not request new bars for same-timeframe display.

## Checks

- `node v5/tests/replay-truncate-smoke.js`
- `node v5/tests/replay-display-contracts-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

All checks passed before commit.
