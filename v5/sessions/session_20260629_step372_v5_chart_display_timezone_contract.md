# Step 372 - V5 Chart Display Timezone Contract

## Goal

Freeze V5 timezone semantics before additional chart, order, journal, and
annotation work depends on implicit time behavior.

The key rule is that display timezone is a presentation preference only. It must
not change replay identity, cursor progression, bar requests, or no-future
guards.

## Product Decision

V5 has three separate time concepts:

- Canonical time: internal replay/cursor/bar identity. Current V4 data maps
  exchange wall-clock values to chart timestamps.
- Request time: `/v4/bars` request values. These remain exchange wall-clock
  strings, `YYYY-MM-DD HH:mm`.
- Display timezone: user preference for labels. It can be `Exchange`, `UTC`, or
  an IANA timezone, but it must not mutate canonical/request time.

For the current NQ/ES MVP, `Exchange` maps to `America/New_York` because the V4
database stores ET wall-clock timestamps as naive DuckDB timestamps.

## Planned Steps

### Step 372.1 - Spec, Contracts, Formatter

- Add `v5/docs/specs/chart-display-timezone.md`.
- Add pure timezone contracts.
- Add a pure formatter that maps canonical chart timestamps to display labels.
- Add `v5/tests/timezone-contracts-smoke.js`.

Status: complete.

Completed:

- Added `v5/docs/specs/chart-display-timezone.md`.
- Added pure display timezone command/event contracts.
- Added display timezone formatting helpers.
- Added `v5/tests/timezone-contracts-smoke.js`.

### Step 372.2 - Runtime Preference

- Add display timezone runtime commands/events.
- Default display timezone to `Exchange`.
- Changing display timezone must emit an event but not request bars or mutate
  replay display state.
- Add `v5/tests/display-timezone-runtime-smoke.js`.

Status: complete.

Completed:

- Added `createDisplayTimezoneRuntime`.
- Registered display timezone runtime in the V5 app shell.
- Added `v5/tests/display-timezone-runtime-smoke.js`.
- Verified timezone changes emit events without changing bar requests, chart
  bars, replay cursor, or replay display bars.

### Step 372.3 - UI Formatting

- Add compact chart-route timezone controls.
- Format replay start/cursor/end labels through display timezone preference.
- Add browser coverage that timezone changes update labels but do not trigger
  `/v4/bars` requests or alter cursor/display bars.

Status: planned.

### Step 372.4 - Final Verification

- Add timezone smokes to `v5/scripts/smoke_all.js`.
- Run full V5 smoke and `git diff --check`.
- Update this handoff with completed status.

Status: planned.

## Manual Acceptance

- Internal replay/cursor/bar identity remains canonical and does not change when
  display timezone changes.
- `/v4/bars` requests continue to use exchange wall-clock `YYYY-MM-DD HH:mm`.
- `Exchange` defaults to the current V4 data convention:
  `America/New_York` wall-clock for NQ/ES.
- Display timezone affects labels only: axis/status/tooltip-style text can
  change, but `displayBars`, cursor timestamp, cache keys, and request ranges do
  not.
- Timezone changes dispatch commands/events; UI does not mutate runtime state
  directly.
- Higher-timeframe no-future checks continue to use canonical cursor/bar
  timestamps, not formatted display labels.

## Checks

- `node v5/tests/timezone-contracts-smoke.js`
- `node v5/tests/display-timezone-runtime-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
