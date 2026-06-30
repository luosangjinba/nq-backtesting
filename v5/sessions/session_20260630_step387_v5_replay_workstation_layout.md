# Step 387 - V5 Replay Workstation Layout Consolidation

## Goal

Consolidate the chart replay route from stacked engineering rows into a denser
replay workstation layout while preserving chart/replay/bar-data runtime
ownership boundaries.

This step advances Historical Replay Review. It is a product layout step, not a
runtime ownership, replay cursor, or bar-loading change.

## Planned Steps

### Step 387.1 - Plan And Specs

- Add Step 387 to `v5/TODO.md`.
- Update chart interaction specs with workstation layout requirements.
- Create this session handoff.

Completed:

- Added Step 387 to `v5/TODO.md`.
- Updated `v5/docs/specs/chart-interaction-contracts.md`.
- Created this session handoff.

Status: complete.

### Step 387.2 - Workstation Route Layout

- Replace engineering shell copy with product-facing replay workstation copy.
- Consolidate replay, timeframe, timezone, presentation, and go-to controls
  into one compact toolbar.
- Preserve existing command/event wiring and data selectors.

Completed:

- Replaced `Chart Replay Shell` with `FX Session Replay`.
- Replaced `Chart Route` with `Historical Review`.
- Added `data-replay-workstation-toolbar` wrapping the existing control groups.
- Kept existing buttons, command handlers, and selectors intact.

Status: complete.

### Step 387.3 - Status And Chart Priority

- Move session/status/load information into a compact footer band.
- Keep the main chart as the dominant desktop surface.
- Give the bottom chart navigation toolbar enough bottom clearance.

Completed:

- Added `data-replay-footer` with session, status, and load-state content.
- Updated chart panel CSS to use a compact grid layout.
- Increased desktop chart priority and moved chart navigation toolbar away from
  the bottom edge.

Status: complete.

### Step 387.4 - Verification

- Add browser smoke coverage for workstation layout.
- Keep chart display, presentation, navigation, and native interaction smoke
  coverage passing.
- Run full V5 smoke and `git diff --check`.

Completed:

- Added `replay-workstation-layout-browser-smoke.js`.
- Added the new smoke to `v5/scripts/smoke_all.js`.
- Ran related checks, full V5 smoke, and `git diff --check`.

Status: complete.

## Manual Acceptance

- The chart route no longer shows `Chart Replay Shell` or `Chart Route`.
- Replay controls, timeframe, timezone, presentation, and go-to controls are
  consolidated into a compact workstation toolbar.
- The main chart remains the dominant surface on desktop.
- The bottom zoom/pan/reset toolbar is not flush with the bottom edge.
- Session/status/load information is visible in a compact footer band.
- Existing chart navigation, native Lightweight interaction, go-to time, and
  presentation controls still use commands/events and do not mutate replay or
  bar data directly.

## Checks

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 387 is complete.
- Recommended next step: Step 388 should tune chart scale/readability,
  especially initial price placement and empty vertical space, without breaking
  Lightweight native interactions.
