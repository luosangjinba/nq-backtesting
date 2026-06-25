# Step 350 - Engineering Runbook And Smoke Entry

## Goal

Start engineering hardening without a broad refactor. The immediate gap is that
operational knowledge is spread across sessions, deploy docs, user docs, and
recent terminal history. Add a short runbook entry point and one smoke command
that can be run before/after deploy work.

## Scope

Included:

- Add `v4/docs/runbook.md`.
- Add `v4/scripts/smoke_all.py`.
- Update TODO with Step 350.
- Verify the new smoke entry can run the local suite.

Excluded:

- No `v4_api.py` decomposition.
- No service/deploy script behavior changes.
- No changes to data files or generated weekly calendar exports.
- No new authentication model.

## Smoke Design

`smoke_all.py` has conservative suites:

- `--suite local` is the default and does not require web/API services.
- `--suite api` checks a running API/web target.
- `--suite all` runs both.

The local suite includes Python compile, workspace smoke, manual economic import
smoke, weekly export smoke, Data Maintenance API-base smoke, and `git diff
--check`.

## Follow-Up Candidates

- Add a browser suite once the browser smoke tests are less expensive to run.
- Add a deploy verification wrapper that runs on VPS after `git pull`.
- Split `v4_api.py` maintenance/workspace/economic-calendar handlers only after
  runbook/smoke discipline is stable.
