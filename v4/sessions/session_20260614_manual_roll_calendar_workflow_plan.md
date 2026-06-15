# Step 290 Plan - Manual Roll Calendar Workflow

Date: 2026-06-14

Branch: `feature/journal-order-recording-redesign`

Prerequisite:

- Step 281 implemented guarded ES Databento insert-only refresh.
- Step 289 completed the data freshness pipeline with ES guarded refresh, VIX refresh, verifier, manual/auto runner, and docs.
- NQ remains write-disabled because `NQH6 -> NQM6` is marked `inferred_volume_conflict`.

## Goal

Create a repeatable manual roll-calendar workflow for ES and NQ.

The workflow should help the user keep Databento raw-contract stitching aligned with the contract switching used in real trading:

- detect candidate roll dates from old/new raw-contract volume;
- report roll candidates and conflicts before data writes;
- let the user manually confirm the actual roll date;
- record that confirmation in `v4/data_config/futures_roll_calendar.yml`;
- allow writes only for explicitly accepted roll statuses;
- keep NQ blocked until the March 2026 conflict is resolved.

## Non-Goals

- No automatic roll-calendar mutation without user confirmation.
- No automatic enabling of NQ writes before validation.
- No back-adjusted / price-adjusted continuous futures construction.
- No attempt to use Databento continuous symbols as the authoritative source.
- No broker/order-routing integration.
- No scheduler activation.

## Current State

Existing DB:

- Stores continuous `instrument=ES` and `instrument=NQ`.
- Does not store raw quarterly contract symbols.
- Existing historical data is treated as authoritative.

Databento refresh path:

- Uses raw quarterly contracts such as `ESH6`, `ESM6`, `NQH6`, `NQM6`.
- Stitches them into `instrument=ES/NQ` based on `futures_roll_calendar.yml`.
- Uses insert-only writes.

Roll calendar status:

- `ESZ5 -> ESH6`, `2025-12-14`: `validated`.
- `ESH6 -> ESM6`, `2026-03-13`: `validated`.
- `NQZ5 -> NQH6`, `2025-12-14`: `inferred_no_db_overlap`.
- `NQH6 -> NQM6`, `2026-03-13`: `inferred_volume_conflict`.
- `ESM6 -> ESU6`, `2026-06-14`: `future_candidate`.
- `NQM6 -> NQU6`, `2026-06-14`: `future_candidate`.

Known NQ conflict:

- Existing NQ DB stops at `2025-11-04 18:39`, so there is no DB overlap for 2026 roll validation.
- `NQH6` volume remains larger than `NQM6` on `2026-03-13`.
- `NQM6` only overtakes `NQH6` on `2026-03-16`.
- Current inferred roll date conflicts with the volume-based switch.

## Product Boundary

The user is the final authority for roll date confirmation.

The system should:

- detect likely roll dates;
- show enough evidence to decide;
- prevent unsafe writes;
- make confirmed roll dates auditable.

The system should not silently decide when ES/NQ switch contracts.

## Status Semantics

Keep existing statuses:

- `validated`: DB-overlap validated and write-eligible.
- `inferred_no_db_overlap`: inferred only, not write-eligible.
- `inferred_volume_conflict`: conflict detected, not write-eligible.
- `future_candidate`: future placeholder, not write-eligible.

Add statuses if implementation confirms these names are useful:

- `volume_validated`: user accepted a roll date based primarily on volume evidence; write-eligible.
- `manual_validated`: user manually confirmed this roll date as the one used in real trading; write-eligible.

Write-eligible statuses should be:

- `validated`
- `volume_validated`
- `manual_validated`

Blocked statuses should remain:

- `inferred_no_db_overlap`
- `inferred_volume_conflict`
- `future_candidate`
- unknown/blank statuses

## Substeps

### Step 290.1 - Freeze Manual Roll Workflow Boundary

Document:

- manual confirmation is required before roll-calendar mutation;
- volume crossover is a reminder/candidate rule, not an auto-write rule;
- ES and NQ use the same future workflow;
- NQ remains write-disabled until the conflict is resolved;
- no back-adjustment is introduced.

Acceptance:

- Session doc and TODO capture the boundary.
- No runtime code changes.

Step 290.1 result:

- Manual confirmation is the only authority for changing `futures_roll_calendar.yml`.
- Volume crossover is a candidate/reminder signal only; it must not mutate the calendar or enable writes by itself.
- ES and NQ will use the same quarterly roll maintenance workflow going forward.
- NQ remains write-disabled until `NQH6 -> NQM6` and any selected future segments have write-eligible statuses.
- Write-eligible statuses are limited to `validated`, `volume_validated`, and `manual_validated`.
- Blocked statuses remain `inferred_no_db_overlap`, `inferred_volume_conflict`, `future_candidate`, and unknown/blank statuses.
- The workflow stitches raw Databento contracts into the existing continuous DB convention; it does not back-adjust prices and does not adopt Databento continuous symbols as authoritative.
- Scheduler behavior is out of scope; roll reminders may be run manually first.

### Step 290.2 - Audit Existing Roll Scripts And Calendar

Audit:

- `v4/data_config/futures_roll_calendar.yml`;
- `v4/scripts/validate_databento_roll.py`;
- `v4/scripts/validate_databento_raw_calendar.py`;
- `v4/scripts/update_databento_1m.py`;
- planning/session docs around Step 281/289.

Record:

- which scripts can be reused;
- which roll statuses are currently blocked by write guards;
- exact ES/NQ roll entries that need manual review.

Acceptance:

- Audit notes are added to this session doc.
- No behavior changes.

Step 290.2 audit result:

Roll calendar:

- `v4/data_config/futures_roll_calendar.yml` is a config file, not an import log.
- It uses ET calendar dates: timestamps before `roll_date_et` use `old_contract`; timestamps on/after use `new_contract`.
- Existing DB rows remain authoritative; importers must be insert-only.
- Current write-eligible entries by existing policy:
  - `ESZ5 -> ESH6`, `2025-12-14`, `validated`.
  - `ESH6 -> ESM6`, `2026-03-13`, `validated`.
- Current blocked entries:
  - `NQZ5 -> NQH6`, `2025-12-14`, `inferred_no_db_overlap`.
  - `NQH6 -> NQM6`, `2026-03-13`, `inferred_volume_conflict`.
  - `ESM6 -> ESU6`, `2026-06-14`, `future_candidate`.
  - `NQM6 -> NQU6`, `2026-06-14`, `future_candidate`.

Existing roll validation scripts:

- `v4/scripts/validate_databento_roll.py` compares Databento continuous symbols (`*.c.0`, `*.v.0`) and raw contracts against the authoritative DB around preset 2025 roll windows.
- It can show daily best source with `--show-daily`.
- It is useful for research, but Step 290 should not use Databento continuous symbols as authoritative.
- `v4/scripts/validate_databento_raw_calendar.py` validates the actual updater path: download old/new raw contracts, stitch with explicit `roll_date_et`, normalize to ET-naive timestamps, and compare against DB.
- It has preset cases through 2026-03, including `2026-03 NQ H-to-M`, but cannot validate NQ 2026 against DB overlap because local NQ stops at `2025-11-04`.
- Neither existing validation script provides a reusable daily volume crossover candidate scanner or roll reminder report.

Updater write guard:

- `v4/scripts/update_databento_1m.py` currently rejects all write mode except `instrument=ES`.
- It also rejects any selected segment whose `roll_status != "validated"`.
- Dry-run prints segment statuses and marks non-validated segments with `WARNING inferred`.
- It already downloads raw contracts, splits by roll calendar boundaries, dedupes candidate keys, compares with DB keys, and inserts only missing keys in a transaction.
- Step 290.8 must generalize the guard from exact `validated` to an allowlist: `validated`, `volume_validated`, `manual_validated`.
- NQ write will still need an instrument-level gate change after roll entries become write-eligible.

Relevant documented evidence:

- Step 281 dry-run produced clean candidate sets for both ES and NQ, but NQ relied on inferred roll entries.
- Dataset condition warnings observed during NQ/ES dry-runs include degraded days on `2025-11-28`, `2026-03-15`, `2026-03-16`, `2026-04-10`, and `2026-05-24`.
- NQ volume audit found:
  - `NQZ5 -> NQH6`: `NQH6` overtook on `2025-12-15`; plausible but not DB-validated.
  - `NQH6 -> NQM6`: `NQM6` only overtook on `2026-03-16`, conflicting with current `2026-03-13`.
- ES 2025-12 and 2026-03 were DB-overlap validated with 0 missing, 0 duplicate, and max OHLC diff 0.25.

Reusable pieces for Step 290:

- Databento raw contract download and ET normalization from `validate_databento_raw_calendar.py`.
- Roll calendar parsing and segment construction from `update_databento_1m.py`.
- Insert-only / candidate key reporting from `update_databento_1m.py`.
- Offline style from Step 289 tests for future roll scanner tests.

Gaps to implement:

- A read-only daily old/new raw-contract volume scanner.
- A roll reminder report that reads calendar statuses and explains write eligibility.
- A manual confirmation path for updating roll date/status/note.
- Shared status allowlist helpers for write eligibility.
- Focused tests for scanner/report/guard behavior.

### Step 290.3 - Implement Roll Volume Candidate Scanner

Add a read-only script such as `v4/scripts/scan_roll_volume_candidates.py`.

Inputs:

- `--instrument ES|NQ`;
- `--old-contract`;
- `--new-contract`;
- `--start`;
- `--end`;
- optional `--dataset`, `--schema`;
- optional `--min-consecutive-days`, default 1 or 2.

Behavior:

- Download old/new raw contracts from Databento.
- Aggregate daily volume by ET date.
- Report old volume, new volume, ratio, and winner per day.
- Detect first date where new contract overtakes old contract.
- Detect first date where new contract stays dominant for N consecutive days.
- Print a candidate roll date and confidence notes.
- Never write DB or roll calendar.

Acceptance:

- Works for `NQH6 -> NQM6`.
- Works for `ESM6 -> ESU6` and `NQM6 -> NQU6` when data is available.
- Network/API-key failures are readable.

Step 290.3 result:

- Added read-only `v4/scripts/scan_roll_volume_candidates.py`.
- The scanner supports Databento mode using old/new raw contracts and local `--source-file` mode for offline fixtures.
- Inputs include `--instrument`, `--old-contract`, `--new-contract`, `--start`, `--end`, `--dataset`, `--schema`, `--min-consecutive-days`, and `--show-empty-days`.
- It normalizes Databento timestamps to ET dates, aggregates daily volume by old/new contract, prints old volume, new volume, winner, and new/old ratio.
- It reports:
  - `first_new_overtake_date`;
  - `first_consecutive_new_dominance_date`;
  - `candidate_roll_date`;
  - `candidate_status: manual confirmation required`.
- It never writes DB or roll calendar.
- Friendly failures are returned as `scan_status: failed` with an error message.
- Added `v4/tests/test_roll_volume_scanner.py` with offline fixture coverage for:
  - `NQH6 -> NQM6` first overtake and 2-day dominance candidate on `2026-03-16`;
  - no-candidate behavior when old contract remains dominant.
- `DATABENTO_API_KEY` was not present in the environment, so a real Databento scan was not run in this substep.

### Step 290.4 - Add Roll Reminder Report

Add a report command or extend the scanner to read `futures_roll_calendar.yml` and report all entries needing attention:

- `future_candidate`;
- `inferred_no_db_overlap`;
- `inferred_volume_conflict`;
- entries close to the current date.

Output should include:

- instrument;
- old/new contract;
- current configured roll date;
- status;
- candidate volume crossover date if scanned;
- recommended next action;
- whether write is currently allowed.

Acceptance:

- ES and NQ are both included.
- Report is read-only.
- Can be run before daily refresh to explain why NQ is blocked.

Step 290.4 result:

- Extended `v4/scripts/scan_roll_volume_candidates.py` with `--report-calendar`.
- The report reads `v4/data_config/futures_roll_calendar.yml` by default.
- It prints instrument, old/new contract, configured roll date, status, write eligibility, attention flag, recommended action, and note.
- Write-eligible status logic currently recognizes `validated`, `volume_validated`, and `manual_validated`.
- Attention entries include `future_candidate`, `inferred_no_db_overlap`, `inferred_volume_conflict`, unknown statuses, and write-eligible entries close to today's date.
- The report is read-only and does not scan Databento by default, so it can run before daily refresh without a network/API key.
- Current report output includes four attention entries:
  - `NQZ5 -> NQH6`, `inferred_no_db_overlap`;
  - `NQH6 -> NQM6`, `inferred_volume_conflict`;
  - `ESM6 -> ESU6`, `future_candidate`;
  - `NQM6 -> NQU6`, `future_candidate`.
- Added tests for report output and readable missing scan argument failures.

### Step 290.5 - Manual Confirmation Workflow

Define and implement the safest confirmation path.

Preferred approach:

- Script supports a dry-run patch preview for `futures_roll_calendar.yml`.
- User supplies:
  - instrument;
  - old/new contract;
  - confirmed roll date;
  - status: `manual_validated` or `volume_validated`;
  - note.
- Actual write requires `--write --confirm-write`.

Alternative if implementation risk is too high:

- Generate a patch snippet and require manual file edit in this step.

Acceptance:

- No calendar write happens without explicit confirmation.
- Notes must preserve why the roll date was accepted.
- Existing validated ES entries are not changed accidentally.

Step 290.5 result:

- Extended `v4/scripts/scan_roll_volume_candidates.py` with `--confirm-roll`.
- Confirmation mode identifies exactly one calendar entry by `instrument`, `old_contract`, and `new_contract`.
- User must supply `--confirmed-roll-date`, `--confirmed-status`, and `--confirmed-note`.
- `--confirmed-status` is limited to write-eligible statuses: `validated`, `volume_validated`, `manual_validated`.
- Default behavior is preview-only: it prints a unified diff patch for `futures_roll_calendar.yml` and does not write the file.
- Actual calendar mutation requires both `--write` and `--confirm-write`.
- Missing confirmation fields, invalid dates, ambiguous entries, and `--write` without `--confirm-write` fail readably.
- Added offline tests for preview-only behavior, write guard rejection, and explicit confirmed writes against a temp calendar.
- No real roll calendar entry was changed in this step.

### Step 290.6 - Resolve NQ 2026-03 Conflict

Use the scanner and confirmation workflow for:

- `NQH6 -> NQM6`;
- candidate dates `2026-03-13` and `2026-03-16`.

Expected decision to verify:

- If volume evidence and user trading practice agree on `2026-03-16`, update roll calendar to `2026-03-16` with `volume_validated` or `manual_validated`.
- If user trading practice used `2026-03-13`, document why volume crossover is overridden.

Acceptance:

- `NQH6 -> NQM6` no longer has `inferred_volume_conflict`.
- The final status is write-eligible only if the user explicitly confirms.
- Session doc records the evidence and decision.

Step 290.6 result:

- Attempted a fresh Databento scanner run for `NQH6 -> NQM6`, `2026-03-10` through `2026-03-18`; it failed because `DATABENTO_API_KEY` was not present in the current shell.
- Used the existing recorded volume audit evidence from Step 281/290:
  - `NQH6` still dominated on `2026-03-13`;
  - `NQM6` first overtook `NQH6` on `2026-03-16`;
  - local NQ DB has no overlap for direct validation.
- Used the Step 290.5 guarded confirmation workflow to update `v4/data_config/futures_roll_calendar.yml`:
  - `NQH6 -> NQM6`;
  - `roll_date_et: 2026-03-16`;
  - `status: volume_validated`;
  - note records the volume evidence and lack of direct NQ DB overlap.
- `NQH6 -> NQM6` no longer has `inferred_volume_conflict`.
- While verifying the report, found that a note containing `:` must be YAML-quoted. Fixed the confirmation writer to quote unsafe scalar values and added a regression test.

### Step 290.7 - Resolve Current/Future ES And NQ Candidates

Review:

- `ESM6 -> ESU6`;
- `NQM6 -> NQU6`;
- optionally later quarterly candidates if Databento range supports them.

Use the same scanner/report workflow.

Acceptance:

- Current `future_candidate` entries are either left blocked with clear notes or manually/volume validated.
- ES and NQ use the same process.

### Step 290.8 - Update Write Guard Status Policy

Update `v4/scripts/update_databento_1m.py`:

- accept write segments only when status is in `validated`, `volume_validated`, `manual_validated`;
- continue rejecting `future_candidate`, `inferred_no_db_overlap`, `inferred_volume_conflict`, unknown statuses;
- print blocked statuses clearly in dry-run/write output.

Acceptance:

- ES existing validated writes still work.
- NQ writes remain blocked until all selected segments are write-eligible.
- Focused tests cover allowed and blocked statuses.

### Step 290.9 - NQ Guarded Dry-Run And Optional Write Enablement

After roll statuses are resolved:

- Run NQ dry-run through `update_databento_1m.py`.
- Confirm segments are write-eligible.
- Confirm duplicate candidate keys, existing candidate keys, first/last insert timestamps, and warnings.
- If user confirms, run NQ guarded write with `--write --confirm-write`.

Acceptance:

- No NQ write occurs unless user confirms after clean dry-run.
- If written, freshness verifier and API smoke pass.
- If not written, TODO/session records that NQ remains intentionally blocked.

### Step 290.10 - Documentation And User Workflow

Update user docs:

- explain raw contract vs existing continuous DB;
- explain manual roll confirmation;
- explain volume crossover reminders;
- explain write-eligible statuses;
- provide quarterly maintenance checklist.

Acceptance:

- User can understand how to maintain ES/NQ roll dates each quarter.
- No scheduler is enabled.

### Step 290.11 - Focused Tests

Add tests that do not require network:

- volume scanner aggregation/candidate detection from fixture CSV or mocked data;
- roll calendar status parser;
- write-eligible status guard;
- manual confirmation dry-run patch generation if implemented;
- blocked statuses remain blocked.

Acceptance:

- Tests use temp files/fixtures.
- Existing data freshness tests still pass.

### Step 290.12 - Browser/API/Data Verification And Closeout

Run:

- focused roll tests;
- existing data freshness tests;
- NQ/ES freshness verifier;
- API smoke for instruments with available data;
- `git diff --check`.

Close:

- update TODO/session;
- commit;
- leave worktree clean.

Acceptance:

- Roll workflow is documented and enforceable.
- NQ status is explicitly resolved or still intentionally blocked with a documented reason.
- Next task can be NQ write trial or Journal data-entry trial, depending on the decision.

## Initial Recommendation

Start Step 290 with read-only scanning and reporting.

Do not edit `futures_roll_calendar.yml` or enable NQ writes until the volume evidence and the user's actual trading roll date agree.
