# Step 383 - V5 Go-To Time And Cursor Navigation

## Goal

Add chart-owned intentional time navigation so users can inspect a known time
and return to the replay cursor without mutating replay state or bypassing
runtime boundaries.

This step advances Historical Replay Review: after Step 382 made inspection
labels readable, Step 383 lets users navigate to a specific revealed/prefix time
and then resume cursor follow.

## Planned Steps

### Step 383.1 - Plan

- Add Step 383 to `v5/TODO.md`.
- Update chart interaction specs with go-to time / jump-to-cursor rules.
- Create this session handoff.

Status: complete.

### Step 383.2 - Chart Runtime Go-To Command

- Add a chart runtime `goToTime` command.
- Derive a manual visible range around the requested timestamp using current
  bar spacing and visible capacity.
- Clamp the range to the replay right-edge limit.

Completed:

- Added `chart.goToTime`.
- Derived a manual visible range around the target using current bar spacing and
  visible capacity.
- Reused chart runtime clamping so go-to cannot move beyond the replay
  right-edge limit.

Status: complete.

### Step 383.3 - Route Controls

- Add route controls for go-to time and jump-to-cursor.
- Dispatch chart commands only from UI.
- Keep replay cursor, display bars, and bar cache owned by their runtimes.

Completed:

- Added chart route controls for go-to time and jump-to-cursor.
- UI dispatches chart commands only.
- Jump-to-cursor resumes chart viewport follow without advancing replay cursor.

Status: complete.

### Step 383.4 - Boundary Preservation

- Preserve viewport demand emission after go-to time.
- Do not request bars directly from chart or UI.
- Ensure jump-to-cursor resumes follow explicitly through chart runtime.

Completed:

- Go-to time emits the same visible-range and viewport-demand events as manual
  movement.
- Chart/UI do not request bars directly.
- Replay cursor remains unchanged. If viewport demand is consumed, replay
  runtime may grow display bars through its bounded display-load path.

Status: complete.

### Step 383.5 - Verification And Closeout

- Add or update runtime/browser smoke coverage.
- Run relevant checks, full V5 smoke, and `git diff --check`.
- Update TODO and this handoff.
- Commit.

Completed:

- Extended `chart-interaction-contracts-smoke.js`.
- Added `chart-go-to-time-browser-smoke.js`.
- Added the new browser smoke to `v5/scripts/smoke_all.js`.
- Ran relevant checks, full V5 smoke, and `git diff --check`.

Status: complete.

## Manual Acceptance

- Entering a time moves the chart viewport to a manual visible range around the
  requested time.
- Go-to input is interpreted in the selected display timezone and converted to
  chart canonical time before dispatching the chart command.
- Go-to time pauses viewport follow and does not directly mutate replay cursor
  or `displayBars`; replay runtime may grow `displayBars` if viewport demand is
  consumed.
- Go-to time remains clamped to the replay right-edge limit.
- Jump-to-cursor resumes follow through chart runtime commands.
- Go-to time may emit viewport demand, but it must not request bars directly.
- Order, journal, dashboard, AI, SaaS auth, billing, and full settings
  templates remain out of scope.

## Checks

- `node v5/tests/timezone-contracts-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 383 is complete.
- Go-to time is chart-owned and creates a manual visible range around the target
  timestamp.
- Post-review fix: Go input now converts from selected display timezone to chart
  canonical time, and future requests report the clamped cursor edge.
- Jump-to-cursor resumes chart follow explicitly through chart runtime.
- Recommended next step: Step 384 should continue Phase 3 with replay toolbar
  and interaction-control polish before order, journal, dashboard, AI, or SaaS
  work.
