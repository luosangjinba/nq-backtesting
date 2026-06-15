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

