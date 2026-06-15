# V4 Data Maintenance Page

Chinese version: `v4/docs/user/DATA_MAINTENANCE_PAGE.zh-CN.md`

Use this page for data maintenance tasks that used to require long terminal commands.

Open:

```text
http://127.0.0.1:8001/data-maintenance.html
```

Required services:

- V4 API: `http://127.0.0.1:8766/v4/health`
- Web server: `http://127.0.0.1:8001`
- Databento key in the API process environment for dry-run/write actions.

Start or restart the API/web services from the repo:

```bash
bash v4/start.sh restart
```

## Page Areas

Roll Calendar:

- `Roll Report`: shows roll entries needing attention.
- `Preview Confirm`: prints the calendar patch preview only.
- `Write Confirm`: writes the roll calendar confirmation.

Refresh Range:

- `Preflight`: checks whether the selected range uses only write-eligible roll segments.
- `Dry Run`: downloads Databento candidates and reports what would be inserted.
- `Write Data`: writes missing rows after a clean dry-run and explicit confirmation text.

Verification:

- `Verify Data`: checks DB/VIX freshness without API smoke.
- `Verify Data + API`: checks DB/VIX freshness and `/v4/bars`.
- `ES API Smoke` / `NQ API Smoke`: confirms the API can read latest bars.

## Manual Roll Confirmation

For the current June 2026 roll, use these presets:

- `ESM6 -> ESU6 manual roll`
- `NQM6 -> NQU6 manual roll`

Use this sequence for each instrument:

1. Select the preset.
2. Confirm the roll date is `2026-06-15`.
3. Confirm status is `manual_validated`.
4. Check the note explains the manual trading-system switch.
5. Click `Preview Confirm`.
6. Review the output diff.
7. Click `Write Confirm` only when the preview is correct.
8. Click `Roll Report` again.

After confirmation, the June roll entries should stop showing as `future_candidate`.

## Data Refresh Workflow

Use this sequence after roll confirmation:

1. Select `ES` or `NQ` in `Refresh Range`.
2. Set `End` to the intended exclusive end datetime, for example `2026-06-16T00:00:00`.
3. Click `Preflight`.
4. Continue only if output says `preflight_status: write-eligible`.
5. Click `Dry Run`.
6. Review:
   - `duplicate_candidate_keys`
   - `existing_candidate_keys`
   - `would_insert_rows`
   - `would_insert_first_ts`
   - `would_insert_last_ts`
   - `databento warnings`
7. If the dry-run is acceptable, type `WRITE ES` or `WRITE NQ`.
8. Click `Write Data`.
9. Run `Verify Data + API`.

The write button will fail unless the confirmation text exactly matches the selected instrument.

## Interpreting Output

Good signs:

- `preflight_status: write-eligible`
- `duplicate_candidate_keys: 0`
- `write_status: committed insert-only transaction`
- `data_freshness_status: ok`
- `api_status: ok`

Blocked signs:

- `preflight_status: blocked`
- `WARNING blocked`
- `future_candidate`
- `inferred_no_db_overlap`
- `inferred_volume_conflict`

Databento warning days such as `degraded` require manual judgment. They do not always mean the data is unusable, but do not ignore them silently.

## Safety Rules

- Always run `Preview Confirm` before `Write Confirm`.
- Always run `Preflight` before `Dry Run`.
- Always run `Dry Run` before `Write Data`.
- Do not write across a `future_candidate` roll boundary.
- Do not use write buttons if the selected range or roll date is uncertain.
- The page uses a backend whitelist; it does not run arbitrary shell commands.

## Current NQ Context

Current known state after the selected-range refresh:

- `NQZ5 -> NQH6`: `2025-12-15`, `volume_validated`
- `NQH6 -> NQM6`: `2026-03-16`, `volume_validated`
- NQ has been refreshed through `2026-06-12 16:59`
- June roll `NQM6 -> NQU6` should be manually confirmed if the trading system switched to `NQU6` on `2026-06-15`

After `NQM6 -> NQU6` is confirmed as `manual_validated`, NQ can be preflighted and dry-run across the June roll boundary.

## Troubleshooting

If the page shows `Failed to fetch`:

- confirm API health: `curl -s http://127.0.0.1:8766/v4/health`
- restart API: `bash v4/start.sh restart`

If Databento dry-run/write fails:

- confirm the API process has `DATABENTO_API_KEY`;
- restart the API after changing shell environment;
- reduce the `End` datetime if Databento reports available-range or license-window errors.

If verification has warnings but no hard errors:

- stale ES or VIX can be acceptable depending on weekend, holiday, or provider delay;
- duplicate timestamps are not acceptable and must be investigated.
