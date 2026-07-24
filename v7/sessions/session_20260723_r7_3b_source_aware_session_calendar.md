# R7.3b — Source-Aware Session Calendar

Date: 2026-07-23  
Status: Awaiting human review

## Outcome

Create Session now derives selectable New York calendar dates from the bars in
the configured V4 DuckDB. A selected date must contain at least one source bar.
With multiple instruments, every selected instrument must contain data on that
date.

The Session picker also disables the grey previous/next-month placeholders.
This is an opt-in Calendar Surface behavior, so Exact GoTo and other calendar
consumers retain their existing cross-month behavior.

The calendar popover is a non-textual interaction surface. Rapid repeated
clicks on its time steppers no longer trigger browser text selection across
weekday, date, or clock labels; button focus and keyboard activation remain
unchanged.

## Edge-time rule

The first and latest source dates remain selectable even when they contain only
part of a day. On submit, Start must be no earlier than the latest shared first
bar and End must be no later than the earliest shared latest bar. For example,
if the selected instruments' shared latest bar is `07:00`, `07:00` is accepted
and `07:01` is rejected with a New York-time boundary message.

## Ownership

- `market_data_calendar_service.py` owns read-only DuckDB date discovery and
  file-signature cache invalidation.
- `market_data_calendar_handler.py` owns HTTP request/response translation.
- the V4 provider adapter maps capability instrument ids to source identities.
- `market-date-policy.js` owns pure multi-instrument intersection and shared
  edge-time calculations.
- Create Session owns loading/error presentation and injects a generic enabled-
  date predicate into Calendar Surface.

No chart, Bar Data Runtime, Replay Runtime, or Session Store owner reads the
date index or mutates another owner's state.

## Automated evidence

- `python3 -m unittest v4/tests/test_market_data_calendar.py`
- `node v7/tests/session-market-date-policy-harness.js`
- `node v7/tests/v4-bars-provider-adapter-harness.js`
- `node v7/tests/calendar-surface-harness.js`
- `node v7/tests/session-browser-browser-harness.js`
- `node v7/tests/architecture-boundary-harness.js`
- `node v7/tests/architecture-hardening-harness.js`
- `node v7/tests/source-quality-harness.js`
- `git diff --check`

The real configured database returned HTTP `200` from
`/v4/available_dates?instrument=NQ&instrument=ES`; the current V4 API on port
`8766` was restarted from this source against the canonical DuckDB.

## Human review focus

1. Open Create Session and select NQ; confirm dates without NQ bars are grey
   and cannot be clicked.
2. Select NQ+ES; confirm the enabled set can only shrink to their intersection.
3. Confirm grey previous/next-month cells cannot be clicked, then navigate to
   that month and confirm dates with data become selectable.
4. On the latest date, submit exactly at the latest available minute, then try
   one minute later and confirm the boundary error.
5. Update market data, reopen Create Session, and confirm the newly available
   date/minute is recognized without restarting the web page.
6. Rapidly click a time up/down arrow and confirm weekday, date, and clock text
   never enters the browser's blue text-selection state.
