# 2026-05-31 Large Range / 1m Performance Guard

## Phase 13 Step 162: Load Range Protection

Goal:

- Prevent accidental full-window loads that make 1m charts unusable for large ranges.
- Keep the semantics clear: this is a single chart-window limit, not a ban on viewing long-term 1m data.

Implemented:

- Added `v4/src/data/load-range-policy.js`.
- Added timeframe-specific single-window limits:
  - 1m: 45 days
  - 5m: 90 days
  - 15m: 180 days
  - 1H: 730 days
  - 4H: 1460 days
  - 1D: 3650 days
- Toolbar load now validates the requested range before calling `/v4/bars`.
- Calendar range/manual/history loads now validate through the same policy before calling `/v4/bars`.
- Over-limit requests emit a status message instead of freezing the chart with a very large `setData()`.

Main files:

- `v4/src/data/load-range-policy.js`
- `v4/src/ui/toolbar.js`
- `v4/src/ui/calendar-navigator.js`
- `v4/TODO.md`

Notes:

- Step 162 only blocks unsafe single-window loads.
- Step 164 should convert long 1m ranges into an outer research range plus a smaller loaded chart window.
