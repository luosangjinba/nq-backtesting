# Step 378 - V5 Minimal Real Chart Drag Zoom

## Goal

Add the first real chart-surface drag/zoom input path so Phase 3 can move beyond
command-only visible range changes while preserving V5 runtime ownership.

This step advances Historical Replay Review: users need intentional chart
navigation without exposing future bars or turning the chart into a full-session
viewer.

## Planned Steps

### Step 378.1 - Plan

- Add Step 378 to `v5/TODO.md`.
- Create this session handoff.
- Keep the step scoped to Phase 3 chart interaction.

Status: complete.

### Step 378.2 - Adapter Fallback Input

- Add DOM fallback drag input for horizontal visible-range movement.
- Add DOM fallback wheel input for basic time-range zoom.
- Route both through the existing adapter `onVisibleRangeChange` callback.
- Do not expose chart-engine internals to UI, replay, or bar-data modules.

Status: pending.

### Step 378.3 - Runtime Invariants

- Preserve manual follow pause when adapter interaction reports a visible range.
- Preserve right-edge clamping through chart runtime.
- Add or update smoke coverage proving drag/zoom range changes do not request
  bars directly and do not mutate replay cursor/display state.

Status: pending.

### Step 378.4 - Browser Verification And Closeout

- Add browser verification for fallback drag/zoom behavior.
- Run relevant smoke checks and `git diff --check`.
- Update this handoff and TODO to mark Step 378 complete.

Status: pending.

## Manual Acceptance

- Dragging or wheel zooming the chart fallback surface emits a chart-runtime
  manual visible-range change.
- Manual interaction pauses viewport follow until explicit resume.
- Manual interaction remains clamped to the replay right-edge limit.
- Manual interaction may emit viewport demand, but it must not request bars
  directly.
- Replay runtime still owns cursor, reveal state, and no-future display
  invariants.
- UI modules do not import or call chart-engine APIs and do not slice chart bars.
- Crosshair, axis labels, go-to time, orders, journal, dashboard, AI, SaaS auth,
  billing, and production chart packaging remain out of scope.

## Checks

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
