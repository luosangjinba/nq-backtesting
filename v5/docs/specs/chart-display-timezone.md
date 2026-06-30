# Chart Display Timezone

V5 separates replay time identity from display timezone before adding more
chart, order, journal, and annotation workflows.

## Time Concepts

### Canonical Time

Canonical time is the internal identity for bars, replay cursor, no-future
guards, and cache ordering.

Current V4 data stores NQ/ES timestamps as `America/New_York` exchange
wall-clock values in naive DuckDB timestamps. The API exposes chart timestamps
as epoch seconds whose UTC fields match that exchange wall-clock value. For
example, `2026-06-01 09:30` is exposed as a chart timestamp whose UTC fields are
`2026-06-01T09:30:00Z`.

Those chart timestamps are not treated as real UTC instants until display
formatting explicitly maps exchange wall-clock time to a display timezone.

### Request Time

Requests to `/v4/bars` use exchange wall-clock strings:

- `YYYY-MM-DD HH:mm`
- no timezone suffix;
- no conversion through browser local timezone or UTC.

Changing display timezone must not alter request ranges.

### Display Timezone

Display timezone is a presentation preference for labels such as chart axis,
tooltips, status timestamps, and replay progress.

Supported initial values:

- `Exchange`
- `UTC`
- selected IANA timezone strings such as `America/New_York`,
  `America/Chicago`, and `America/Los_Angeles`.

For the current NQ/ES MVP, `Exchange` maps to `America/New_York` because that is
the current V4 data convention.

## Rules

- Display timezone changes must not mutate replay cursor.
- Display timezone changes must not request bars.
- Display timezone changes must not change `displayBars`.
- Display timezone changes must not change bar-data cache keys.
- No-future checks use canonical cursor/bar timestamps, not formatted labels.
- Higher-timeframe completion checks use canonical timestamps.
- UI changes timezone through commands/events, not direct state mutation.

## Verification

- `v5/tests/timezone-contracts-smoke.js`
  - validates command/event names;
  - validates `Exchange` default;
  - validates daylight-saving conversion from canonical exchange wall-clock to
    real display instants;
  - validates Exchange/UTC/Los Angeles formatting.
- `v5/tests/display-timezone-runtime-smoke.js`
  - verifies runtime state and events;
  - verifies timezone change does not request bars or mutate replay display
    state.
- `v5/tests/display-timezone-browser-smoke.js`
  - verifies visible labels change while bars/cursor/request counts remain
    unchanged.
