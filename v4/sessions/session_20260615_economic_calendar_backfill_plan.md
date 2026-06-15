# Step 291: Economic Calendar Backfill Importer

## Boundary

The existing V4 economic calendar file is:

- `v4/data/economic_calendar/economic_calendar_usd_events.csv`

The current checked-in dataset covers:

- `2007-01-01` through `2025-01-05`
- 21,768 normalized USD rows

Step 291 adds a repeatable importer for ForexFactory USD economic-calendar
events. It must be append-only by default and must not overwrite the existing
historical file content.

## Write Rules

- Default behavior is dry-run/report only.
- Real writes require `--write --confirm-write`.
- The script creates a backup before modifying the main CSV.
- The normal backfill start is the day after the current max date:
  `2025-01-06`.
- Existing rows are not replaced automatically.
- Overlap rows may be reported for comparison but are not used to rewrite old
  history.
- The output schema remains:

```text
event_date,event_time_et,event_time_utc,currency,title,impact,event_type,all_day,default_visible,actual,forecast,previous
```

## Source Findings

The tested ForexFactory page flow can retrieve historical and future month
pages when using URL selectors such as `jan.2025`, `feb.2025`, `jun.2026`, and
`jul.2026`.

The upstream open-source scraper's README claims `YYYY-MM` support, but the
current implementation does not parse `YYYY-MM`. V4 must implement its own
month selector handling.

The list page currently exposes reliable date/time/currency/impact/title and
actual values. Forecast and previous values were empty in the tested list-page
DOM. V4 must preserve those columns but accept blank values unless a later data
source fills them.

## Substeps

1. Freeze data boundary and append-only write rules.
2. Add ForexFactory month selector support.
3. Add a standalone fetch script for raw ForexFactory CSV output.
4. Add V4 CSV conversion logic.
5. Add dry-run comparison/reporting.
6. Add append-only write with backup.
7. Add economic-calendar verification.
8. Add data-maintenance API/UI actions.
9. Add user documentation.
10. Run full backfill verification and closeout.

