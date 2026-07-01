# Step 402 - V5 Replay Interval Sync

Date: 2026-07-01

## Goal

Make the floating replay interval dropdown and active-chart interval sync toggle
usable replay transport controls while preserving V5 runtime ownership
boundaries.

## Decision

Replay interval is replay transport step size, not chart display timeframe. On a
1m replay session, selecting `5m` means Next, Previous, and Play advance five
1m session bars per transport step. The route converts the selected replay
interval into `stepCount` and passes it through replay commands. Replay runtime
owns cursor and reveal mutation.

The sync toggle is explicit. When enabled, chart display interval changes copy
into the replay interval selection. Changing replay interval by itself must not
change chart display interval.

## Plan

- Document the replay interval versus chart display interval decision.
- Add replay runtime `stepCount` support for Next, Previous, and Play.
- Enable the floating replay interval dropdown and sync toggle after initial
  replay load.
- Dispatch `stepCount` from the route instead of mutating chart display state.
- Add runtime and browser smoke coverage.
- Run targeted smokes, full V5 smoke, and `git diff --check`.

## Implementation

- `v5/src/runtime/replay-runtime.js`
  - added `stepCount` validation;
  - `replay.next` and `replay.previous` now support multi-step transport while
    keeping the one-bar default;
  - `replay.play` stores `stepCount` in playback state and applies it per tick.
- `v5/src/features/chart-replay/chart-replay-route.js`
  - enables replay interval and sync controls when replay is loaded;
  - keeps interval/sync as route-local UI state;
  - dispatches `stepCount` in Next, Previous, and Play command payloads;
  - updates replay interval from display interval only when sync is enabled.
- `v5/tests/replay-next-smoke.js`
  - covers multi-step Next.
- `v5/tests/replay-play-smoke.js`
  - covers `stepCount` in playback state.
- `v5/tests/replay-floating-controls-browser-smoke.js`
  - verifies interval controls are enabled, 5m advances five 1m bars, and sync
    follows display interval changes.

## Manual Acceptance

- Floating replay interval defaults to the replay session timeframe.
- Selecting `5m` on a 1m session makes Next advance five session bars.
- Previous and Play use the same selected replay interval step size.
- Turning sync on makes replay interval follow active chart display interval.
- Changing replay interval alone does not change chart display interval.
- No replay interval control directly requests bars or writes chart series.

## Checks

- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-previous-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Plan the Layout split-pane contract before implementation. The next step should
define active chart identity, chart/replay sync scope, display interval sync
rules, and runtime ownership for multiple chart panes.
