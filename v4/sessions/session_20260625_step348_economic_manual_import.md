# Step 348 - Economic Calendar Manual CSV Import

## Goal

ForexFactory automatic fetch is unreliable on the VPS because headless Chrome is
served a Cloudflare Turnstile challenge instead of the calendar table. Step 348
adds a trusted manual import path so the operator can export or prepare a CSV in
the browser and import it through Data Maintenance without Selenium.

## Input CSV

First supported manual CSV schema:

```text
Title,Country,Date,Time,Impact,Forecast,Previous,URL
```

Observed sample:

```text
CPI m/m,CAD,06-22-2026,12:30pm,High,0.7%,0.4%,https://www.forexfactory.com/calendar/80-ca-cpi-mm
FOMC Member Waller Speaks,USD,06-22-2026,1:00pm,Low,,,https://www.forexfactory.com/calendar/839-us-fomc-member-waller-speaks
```

## Conversion Rules

- `Country` maps to V4 `currency`.
- First version imports `USD` rows only by default, matching current V4 use.
- `Date` is `MM-DD-YYYY`.
- `Time` accepts `1:00pm`, `01:00pm`, empty, `All Day`, or `Tentative`.
- Timed events are interpreted in `America/New_York`.
- `Impact` maps to V4 `High` / `Medium` / `Low`.
- `URL` is useful diagnostic/source metadata, but current V4 economic calendar
  schema has no source/detail column, so it is not written to the formal CSV.

## UX

Data Maintenance gets a Manual Economic CSV import block:

1. Choose CSV.
2. Preview Manual Import.
3. If the preview looks correct, type `WRITE ECONOMIC`.
4. Write Manual Import.

The write path must remain append-only:

- Backup the existing economic calendar CSV first.
- Append only candidate rows with event dates after the existing latest date and
  keys not already present.
- Report duplicates, existing candidate keys, skipped overlaps, and appended
  rows.

## Acceptance

- A sample `Title,Country,Date,Time,Impact,Forecast,Previous,URL` CSV can be
  previewed through the maintenance API.
- Non-USD rows are ignored by default.
- Duplicate rows do not get appended twice.
- Write requires `WRITE ECONOMIC`.
- Existing `economic_verify` still passes after import.
- Automatic ForexFactory dry-run remains available but should be treated as
  unreliable on VPS when Cloudflare blocks headless Chrome.

## Implementation Result

Status: complete.

Backend:

- Added `economic_manual_preview` and `economic_manual_write` to
  `/v4/data_maintenance/run`.
- The browser sends CSV text in JSON; no multipart upload endpoint or additional
  public route is required.
- Manual import validates the expected header, parses `MM-DD-YYYY` dates and
  `h:mmam` / `h:mmpm` times, filters to the requested currency (`USD` by
  default), and converts rows into the existing V4 economic calendar schema.
- Preview reports existing range, candidate rows, duplicate candidate keys,
  existing candidate keys, overlap rows, skipped currency rows, and
  `would_append_rows`.
- Write requires `WRITE ECONOMIC`, backs up the current CSV, appends only rows
  after the existing latest event date and not already present by key, sorts the
  merged file, and clears the API economic events cache.

Data Maintenance UI:

- Added `Manual CSV` file input under Economic Calendar.
- Added `Currency`, `Timezone`, `Preview Manual CSV`, and `Write Manual CSV`.
- Manual write reuses the existing confirmation input.

Verification:

```text
python3 v4/tests/economic-manual-import-smoke.py
python3 -m py_compile v4/v4_api.py
node v4/tests/data-maintenance-api-base-smoke.js
python3 v4/tests/workspace-api-smoke.py
git diff --check
```

Notes:

- The initial sample file contained many non-USD events; first version defaults
  to USD-only to match current V4 usage.
- `URL` is intentionally not written because the current formal economic
  calendar schema has no source/detail column.
