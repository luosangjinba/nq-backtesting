# Step 391 - V5 Floating Replay Controls And Hidden Go To

## Goal

Restructure the replay workstation controls so replay actions live in a floating
chart control bar and Go to time is hidden behind an explicit popover, matching
the FXReplay interaction model more closely.

This step advances Historical Replay Review. It is a UI composition step, not a
replay runtime, bar-loading, chart-engine, layout-splitting, drawing, order, or
journal step.

## User Reference

The user provided FXReplay screenshots showing:

- replay controls as a floating chart bar near the lower middle of the chart;
- Go to as a hidden lower-screen entry that opens a modal/popover;
- Layout as a right-side/top entry with multi-pane templates and sync toggles;
- drawing tools as a later concern, where V5 should eventually reuse its own V4
  drawing model instead of copying the reference blindly.

## Planned Steps

### Step 391.1 - Plan And Docs

- Add Step 391 to `v5/TODO.md`.
- Create this session handoff.
- Keep multi-pane Layout and drawing tools explicitly out of scope.

Completed:

- Added Step 391 to `v5/TODO.md`.
- Created this session handoff.
- Kept multi-pane Layout and drawing tools explicitly out of scope.

Status: complete.

### Step 391.2 - Floating Replay Bar

- Move Next/Play/Pause/Reset into a floating bar inside the chart viewport.
- Move display timeframe controls into the same floating replay bar.
- Preserve existing data selectors and command/event wiring.

Completed:

- Moved Next/Play/Pause/Reset into `data-replay-floating-controls` inside the
  chart viewport.
- Moved display timeframe controls into the same floating replay bar.
- Preserved existing replay and timeframe data selectors.

Status: complete.

### Step 391.3 - Hidden Go To

- Replace the permanent top-toolbar date/time input with a Go to entry button.
- Add a chart-centered popover/modal containing date/time, Go, Cancel, and
  Cursor actions.
- Keep navigation routed through chart runtime commands.

Completed:

- Replaced the permanent top-toolbar date/time input with a Go to entry button.
- Added a chart-centered popover with date/time, Go, Cancel, and Cursor
  actions.
- Preserved `CHART_COMMANDS.GO_TO_TIME` and `CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW`
  as the navigation paths.

Status: complete.

### Step 391.4 - Layout Placeholder

- Add a visible Layout entry point in the top toolbar.
- Do not implement multi-pane chart surfaces, sync settings, or split layout
  persistence in this step.

Completed:

- Added a visible disabled Layout entry point in the top toolbar.
- Did not implement multi-pane chart surfaces, sync settings, or split layout
  persistence.

Status: complete.

### Step 391.5 - Verification

- Add browser smoke coverage for floating replay controls and hidden Go to.
- Keep existing chart navigation, responsive visual, and workstation layout
  smoke passing.
- Run full V5 smoke and `git diff --check`.

Completed:

- Added `replay-floating-controls-browser-smoke.js`.
- Updated `chart-go-to-time-browser-smoke.js` to open the hidden Go to popover.
- Kept existing chart navigation, responsive visual, and workstation layout
  smoke passing.
- Ran full V5 smoke and `git diff --check`.

Status: complete.

## Manual Acceptance

- The top workstation toolbar no longer carries primary replay controls or a
  permanent date/time input.
- Next, Play, Pause, Reset, and timeframe selection remain command-driven and
  work from the floating chart replay bar.
- The floating replay bar stays inside the chart viewport and clear of the
  right price axis and time-axis area.
- Go to opens only after an explicit action, can be cancelled, and still uses
  chart runtime commands for navigation.
- Layout is visible only as a future entry point; split panes, sync settings,
  and drawing tools remain out of scope.
- Replay cursor, reveal state, native Lightweight interactions, and bar-data
  ownership remain unchanged.

## Checks

- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 391 is complete.
- Do not start Layout split-pane implementation until a dedicated step defines
  multi-chart runtime ownership, sync rules, and persistence boundaries.
