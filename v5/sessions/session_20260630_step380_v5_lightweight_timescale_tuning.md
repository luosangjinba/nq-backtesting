# Step 380 - V5 Lightweight TimeScale Interaction Tuning

## Goal

Tune the real Lightweight Charts timeScale and interaction defaults so native
pan/zoom behaves like a replay workstation while preserving chart runtime
ownership and replay no-future boundaries.

This step advances Historical Replay Review: the real chart engine should feel
stable enough for replay navigation before crosshair, axis/tooltip, order,
journal, dashboard, AI, or SaaS work.

## Planned Steps

### Step 380.1 - Plan

- Add Step 380 to `v5/TODO.md`.
- Update `v5/docs/specs/chart-engine-adapter.md` with the real timeScale tuning
  rules.
- Create this session handoff.

Status: complete.

### Step 380.2 - Lightweight TimeScale Defaults

- Tune adapter-owned Lightweight Charts options for horizontal pan/zoom.
- Preserve the chart presentation `rightOffsetBars` setting as the source of
  right offset.
- Add stable bar spacing and resize behavior defaults appropriate for replay.
- Keep these options behind the chart-engine adapter boundary.

Completed:

- Added adapter-owned Lightweight timeScale defaults for stable replay chart
  spacing, resize behavior, right-bar scroll behavior, and no automatic new-bar
  shifting.
- Added adapter-owned scroll/scale defaults that favor horizontal drag and zoom
  while keeping vertical touch drag out of the replay MVP.
- Kept the chart presentation `rightOffsetBars` setting as the source of the
  engine timeScale right offset.

Status: complete.

### Step 380.3 - Runtime Boundary Preservation

- Ensure user-originated engine visible-range changes are converted into
  chart-runtime manual visible-range state.
- Preserve right-edge clamping through chart runtime, not UI.
- Preserve explicit resume-follow behavior.
- Do not let chart interaction request bars directly.

Completed:

- Kept user-originated Lightweight visible-range changes routed through the
  existing chart-runtime manual visible-range callback.
- Preserved chart-runtime right-edge clamping and explicit resume-follow
  behavior.
- Preserved the rule that chart interaction emits demand only through chart
  runtime events and does not request bars directly.

Status: complete.

### Step 380.4 - Verification

- Strengthen adapter smoke coverage for timeScale/interaction options.
- Strengthen runtime/browser coverage for Lightweight engine use, manual mode,
  resume follow, and no direct bar requests from chart interaction.
- Keep DOM fallback smoke coverage deterministic.

Completed:

- Extended `chart-engine-adapter-smoke.js` to assert create/apply options for
  timeScale, handleScroll, and handleScale.
- Extended `chart-interaction-browser-smoke.js` to assert normal browser use
  applies the real Lightweight engine and Step 380 interaction defaults.
- Re-ran boundary, runtime, replay manual follow, browser, and full smoke
  coverage.

Status: complete.

### Step 380.5 - Closeout

- Run relevant smoke checks and `git diff --check`.
- Run full `v5/scripts/smoke_all.js`.
- Update TODO and this handoff.
- Commit.

Completed:

- Ran relevant smoke checks and full V5 smoke.
- Ran `git diff --check`.
- Updated TODO and this handoff.

Status: complete.

## Manual Acceptance

- Normal browser use still reports `data-chart-engine="lightweight-charts"`.
- Lightweight timeScale has replay-workstation defaults for horizontal
  drag/zoom, stable spacing, right offset, and resize behavior.
- User-originated Lightweight visible-range changes become chart-runtime manual
  visible-range state.
- Manual chart movement pauses viewport follow until explicit resume.
- Manual chart movement remains clamped to the replay right-edge limit.
- Chart interaction may emit viewport demand, but it does not request bars
  directly.
- Replay runtime still owns cursor, reveal state, and no-future display
  invariants.
- DOM fallback remains available for deterministic unit/runtime tests.
- Crosshair, axis labels, tooltips, go-to time, order, journal, dashboard, AI,
  SaaS auth, billing, and production packaging remain out of scope.

## Checks

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 380 is complete.
- The Lightweight adapter now owns replay-workstation timeScale defaults:
  stable bar spacing, minimum spacing, right-bar scroll behavior, resize lock,
  no automatic new-bar shift, horizontal drag, and wheel/pinch scaling.
- The engine timeScale right offset remains sourced from chart presentation
  settings, not replay or UI feature state.
- The visible UI remains an engineering shell.
- Recommended next step: Step 381 should continue Phase 3 with crosshair readout
  and time/price inspection before axis/tooltip formatting, go-to time, orders,
  journal, dashboard, AI, or SaaS work.
