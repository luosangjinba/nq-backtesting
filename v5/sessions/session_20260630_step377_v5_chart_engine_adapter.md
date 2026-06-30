# Step 377 - V5 Chart Engine Adapter Foundation

## Goal

Introduce a chart-engine adapter boundary so Phase 3 can move toward real chart
interaction without letting UI, replay, or bar-data modules own chart internals.

This step must preserve the V5 ownership model:

- chart runtime owns chart instance lifecycle and rendered visible bars;
- replay runtime owns cursor/reveal state and `displayBars`;
- bar data runtime owns `/v4/bars` requests and cache;
- UI dispatches commands and subscribes to events.

## Planned Steps

### Step 377.1 - Spec And Plan

- Add `v5/docs/specs/chart-engine-adapter.md`.
- Update specs index.
- Add Step 377 to `v5/TODO.md`.
- Create this session handoff.

Completed:

- Added the chart-engine adapter spec.
- Updated specs index and TODO.
- Created this Step 377 handoff.

Status: complete.

### Step 377.2 - Adapter Module

- Add a chart-engine adapter module.
- Support DOM fallback for deterministic static smoke tests.
- Support a fake/real `LightweightCharts` implementation through a narrow
  adapter contract.
- Add adapter smoke coverage.

Completed:

- Added `v5/src/runtime/chart-engine-adapter.js`.
- Added DOM fallback rendering behind the adapter contract.
- Added optional `window.LightweightCharts`/fake-engine integration behind the
  same contract.
- Added `v5/tests/chart-engine-adapter-smoke.js`.
- Added the adapter smoke to `v5/scripts/smoke_all.js`.

Status: complete.

### Step 377.3 - Chart Runtime Wiring

- Route chart runtime mount/render operations through the adapter.
- Preserve existing chart commands, events, and readback payloads.
- Preserve viewport follow and manual visible-range behavior.

Status: pending.

### Step 377.4 - Browser And Boundary Verification

- Add boundary coverage that only chart runtime/adapter references chart-engine
  APIs.
- Add or update browser coverage for adapter-backed chart rendering.
- Run full V5 smoke and `git diff --check`.
- Update this handoff.

Status: pending.

## Manual Acceptance

- Chart runtime remains the only runtime that creates or calls chart-engine
  instances.
- UI, replay, and bar-data modules do not import or call chart-engine APIs.
- Adapter can use `window.LightweightCharts` when available and DOM fallback
  when unavailable.
- Existing chart commands/events and interaction readback continue to work.
- Manual visible range and viewport follow behavior remain chart-owned.
- Engine visible range changes may emit viewport demand, but do not request bars
  directly.
- Full drag/zoom polish, crosshair, go-to time, orders, journal, SaaS auth, and
  billing remain out of scope.

## Checks

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
