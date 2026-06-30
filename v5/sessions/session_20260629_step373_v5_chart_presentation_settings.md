# Step 373 - V5 Chart Presentation Settings Foundation

## Goal

Establish a small FXReplay-inspired chart presentation settings foundation
without copying the full settings panel or creating V4-style frontend coupling.

The foundation should make time label format, status line fields, chart margins,
right offset, and crosshair readout behavior explicit before later order,
journal, annotation, and axis work depends on scattered display decisions.

## Planned Steps

### Step 373.1 - Spec And Plan

- Add `v5/docs/specs/chart-presentation-settings.md`.
- Update specs index.
- Add Step 373 to `v5/TODO.md`.
- Create this session handoff.

Status: complete.

### Step 373.2 - Contracts And Runtime

- Add presentation settings command/event contracts.
- Add a runtime that owns normalized presentation settings.
- Add smoke coverage proving settings events do not mutate bars/replay state.

Status: pending.

### Step 373.3 - Chart And Status Consumers

- Let chart runtime consume margins, right offset, time format, and crosshair
  readout state.
- Let chart replay status consume status field visibility and time format.
- Preserve chart/runtime ownership boundaries.

Status: pending.

### Step 373.4 - UI And Verification

- Add lightweight chart-route controls for key presentation settings.
- Add browser smoke proving presentation changes do not reload bars or alter
  replay state.
- Run full V5 smoke and update this handoff.

Status: pending.

## Manual Acceptance

- Presentation settings changes do not request bars.
- Presentation settings changes do not mutate replay cursor.
- Presentation settings changes do not mutate `displayBars`.
- Chart runtime owns chart presentation rendering.
- UI dispatches commands and subscribes to events.
- Time labels continue to use the Step 372 display timezone contract.

## Checks

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
