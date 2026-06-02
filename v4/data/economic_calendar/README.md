# Economic Calendar Data

This directory contains normalized ForexFactory USD calendar data for V4 review
and Inspector Calendar review.

## Files

- `economic_calendar_usd_events.csv`
  - Normalized USD economic-calendar events.
  - Generated from `v4/forex_factory_usd/forex_factory_usd_*.csv`.

## Regeneration

```bash
python3 v4/tools/normalize_forex_factory_usd.py
```

The normalizer is deterministic and does not modify source CSV files.

## Time Semantics

- Timed events are parsed as `America/New_York`.
- `event_time_et` stores the local ET timestamp with offset.
- `event_time_utc` stores the same instant in UTC.
- All-day rows are date events:
  - usually `event_type=holiday`
  - `all_day=true`
  - `event_time_et` and `event_time_utc` are ignored even if present
  - V4 Locate uses `09:30` on `event_date` for the chart flash

## Columns

- `event_date`: corrected calendar date in `YYYY-MM-DD`
- `event_time_et`: timed-event timestamp in America/New_York, blank for all-day rows
- `event_time_utc`: timed-event timestamp in UTC, blank for all-day rows
- `currency`: currently `USD`
- `title`: event name
- `impact`: ForexFactory impact label from the source CSV
- `event_type`: `economic`, `holiday`, or `all_day`
- `all_day`: `true` for date-only events
- `default_visible`: first-pass UI visibility hint
- `actual`, `forecast`, `previous`: retained in the CSV but intentionally ignored by V4

## Cleaning Rules

- Each yearly source file has a year-end rollback from December into January.
  The normalizer repairs this by incrementing the following row years.
- Overlap duplicates keep the row from the event date's native source year.
- Remaining exact duplicates are removed.
- Low-impact timed events are retained but default hidden.
- High/Medium timed events and Bank Holiday rows are default visible.

## V4 Usage

- Economic calendar events are shown in the Inspector Calendar only.
- Economic events are not rendered as persistent chart markers.
- Locate can move the chart and trigger a temporary time-range flash.
- Impact dots:
  - `High`: red
  - `Medium`: orange
  - `Low`: yellow
  - `holiday` / `all_day=true`: gray
- Default filters:
  - High: on
  - Medium: on
  - Low: off
  - Holiday / all-day: on

## Current Dataset

- Source rows: 22054
- Normalized rows: 21768
- Corrected date range: `2007-01-01` to `2025-01-05`
- Event type counts:
  - `economic`: 21588
  - `holiday`: 180
- Impact counts:
  - `High`: 6735
  - `Medium`: 9086
  - `Low`: 5947
