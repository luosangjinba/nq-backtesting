# Session: Step 330 Large Module Decomposition

Date: 2026-06-22

## Goal

Reduce long-term maintenance risk from large V4 modules without changing user-visible behavior. This is a staged refactor track, not a feature track.

## Step 330.1 Audit

Largest current source modules:

- `v4/src/ui/inspector-sidebar.js` - 1290 lines. Multi-domain sidebar coordinator with many event subscriptions, panel routing, archive import/export actions, pick routing hooks, and comparison chart click forwarding.
- `v4/src/review/review-archive.js` - 1070 lines. Archive payload builder, export/import logic, schema normalization, and compatibility handling.
- `v4/src/live-record/tradovate-performance-importer.js` - 1061 lines. Tradovate CSV parsing, timestamp conversion, file alignment reporting, execution extraction, and archive building.
- `v4/src/pda/manual-annotation.js` - 968 lines. Main chart context menu, PDA/segment/chart-note creation flows, drawing state machine, editor UI, and global input handlers.
- `v4/src/time-reaction/daily-time-review-store.js` - 920 lines. Store plus persistence/normalization-heavy domain logic.
- `v4/src/ui/inspector/calendar-panel.js` - 917 lines. Calendar inspector rendering and day detail UI.
- `v4/src/ui/replay-controls.js` - 908 lines. Replay state machine, replay controls DOM, restore snapshot handling, history bridge, viewport/data sync, keyboard shortcuts, and replay pick state.
- `v4/src/ui/comparison-window-controller.js` - 580 lines. Comparison DOM/render, sliding geometry/drag, comparison data loading, replay source sync, status/placeholder UI, and crosshair sync.

## Priority

1. Start with `replay-controls.js`.
   - It is not the largest file, but it has the highest coupling to recent Comparison work through replay restore, progressive replay, history persistence, viewport state, and chart data sync.
   - Public exports are actively used by `app.js`, Inspector calendar helpers, chart-note/PDA renderers, objective gaps, and replay history restore.

2. Then split `comparison-window-controller.js`.
   - It is smaller, but the responsibilities are clearly separable after native price-axis stabilization.
   - Keep `initComparisonWindowController()` as the only app-level entry.

3. Triage the larger domain modules later.
   - `inspector-sidebar.js`, `review-archive.js`, `tradovate-performance-importer.js`, and `manual-annotation.js` need domain-specific test entry points before mechanical extraction.

## Replay Controls Split Candidates

Keep stable public exports from `v4/src/ui/replay-controls.js`:

- `initReplayControls`
- `syncReplayData`
- `restoreReplayToTimestamp`
- `getReplayRestoreSnapshot`
- `getReplayVisibleBars`
- `getReplayCursorTimestamp`
- `isReplayPicking`
- `didReplayPickJustHandleClick`

Candidate extraction boundaries:

- Pure replay time/bar helpers.
- Restore snapshot and range input helpers.
- Replay controls DOM rendering and click/key handlers.
- Replay history bridge and restore actions.
- Replay pick state helpers.

## Comparison Controller Split Candidates

Keep stable public export from `v4/src/ui/comparison-window-controller.js`:

- `initComparisonWindowController`

Candidate extraction boundaries:

- DOM template, selectors, and header control rendering.
- Sliding layout geometry, ResizeObserver refresh, and drag handlers.
- Comparison data loading and replay source sync.
- Main/comparison crosshair synchronization.
- Status and placeholder view helpers.

## Verification Baseline

Use existing narrow smoke tests while extracting:

- `node v4/tests/replay-history-restore-smoke.js` when available in the branch history, or the closest current replay history smoke.
- `node v4/tests/replay-history-comparison-smoke.js`
- `node v4/tests/comparison-replay-sync-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/secondary_progressive_replay_smoke.js` equivalent if present, otherwise the current progressive replay browser smoke path.
- `git diff --check`

Each extraction commit should be behavior-preserving. If a helper must change behavior, it should be split into a separate feature/fix step rather than hidden inside Step 330.
