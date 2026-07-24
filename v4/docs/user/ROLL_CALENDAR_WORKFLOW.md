# V4 Roll Calendar Workflow

> Superseded write path: the legacy `--confirm-roll --write` command and V4
> `confirm_roll_write` maintenance action are disabled. New calendar changes
> must use **V7 → Data acquisition → Contract Roll**, which requires complete
> CME trade-date Scan evidence, hash-bound Preview, exact typed confirmation,
> backup, atomic replacement, and audit. The legacy commands below remain
> useful only for read-only reports, scans, and patch previews.

V4 does not use Databento continuous futures symbols as the write authority.
The local DB is stitched from raw quarterly contracts through
`v4/data_config/futures_roll_calendar.yml`.

Why:

- Databento continuous symbols did not match the existing DB roll behavior in tested windows.
- The existing DuckDB remains authoritative for rows already present.
- Databento refresh is insert-only and must not rewrite historical rows.
- Roll dates are configuration, not an import log.

## Status Model

Write-eligible statuses:

- `validated`: directly validated against local DB overlap.
- `volume_validated`: accepted from raw contract volume evidence.
- `manual_validated`: accepted from explicit manual trading roll confirmation.

Blocked statuses:

- `future_candidate`: candidate that still needs volume scan and manual confirmation.
- `inferred_no_db_overlap`: inferred because the local DB has no overlap to validate.
- `inferred_volume_conflict`: volume evidence conflicts with the current candidate date.
- unknown or blank status.

`update_databento_1m.py --write` only accepts write-eligible roll segments. For NQ, use preflight and dry-run first, and only write an explicitly selected range whose segments are all write-eligible.

## Reminder Report

Run the roll reminder report before quarterly maintenance:

```bash
python3 v4/scripts/scan_roll_volume_candidates.py --report-calendar
```

The report shows old/new contracts, roll date, status, write eligibility, attention flag, recommended action, and note.

The same workflow is available through `http://127.0.0.1:8001/data-maintenance.html`. Page-specific help is in `v4/docs/user/DATA_MAINTENANCE_PAGE.md`.

## Volume Scan

Use raw contract volume to find candidate roll dates:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/scan_roll_volume_candidates.py \
  --instrument NQ \
  --old-contract NQH6 \
  --new-contract NQM6 \
  --start 2026-03-10 \
  --end 2026-03-18 \
  --min-consecutive-days 2
```

The scanner is advisory. Volume crossover does not edit the calendar by itself.

## Manual Confirmation

Preview a calendar change first:

```bash
python3 v4/scripts/scan_roll_volume_candidates.py \
  --confirm-roll \
  --instrument NQ \
  --old-contract NQH6 \
  --new-contract NQM6 \
  --confirmed-roll-date 2026-03-16 \
  --confirmed-status volume_validated \
  --confirmed-note "Volume audit resolved conflict: NQM6 first overtakes NQH6 on 2026-03-16."
```

After reviewing the legacy patch preview, repeat the evidence through the V7
Contract Roll workflow. Direct legacy writes fail intentionally.

## NQ Preflight

Check whether a range is write-eligible before any Databento dry-run:

```bash
python3 v4/scripts/update_databento_1m.py \
  --instrument NQ \
  --start 2026-03-16T00:00:00 \
  --end 2026-06-14T00:00:00 \
  --roll-status-preflight
```

Current state:

- `NQZ5 -> NQH6` is resolved as `2025-12-15`, `volume_validated`.
- `NQH6 -> NQM6` is resolved as `2026-03-16`, `volume_validated`.
- NQ has been refreshed through `2026-06-12 16:59` by a guarded selected-range write ending before the June roll boundary.
- Full default NQ refresh remains blocked by `NQM6 -> NQU6` `future_candidate` coverage.
- No NQ write should run until the selected range is write-eligible, Databento dry-run is clean, and the user explicitly confirms.

## Quarterly Checklist

1. Run `--report-calendar`.
2. For each `future_candidate`, scan old/new raw contract volume around the roll window.
3. Compare the candidate date with actual trading roll practice.
4. Optionally inspect the legacy patch preview with `--confirm-roll`.
5. Run V7 Contract Roll Scan, Preview, and exact typed Commit.
6. Run `update_databento_1m.py --roll-status-preflight` for the intended refresh range.
7. Run Databento dry-run with `DATABENTO_API_KEY` and inspect rows, duplicates, existing keys, timestamps, and warnings.
8. Write only after a clean dry-run and explicit confirmation.

No scheduler is enabled by this workflow.
