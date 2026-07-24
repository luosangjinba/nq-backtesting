# V7 Contract Roll Milestone Gate — R7.3c

Status: executable, awaiting human interaction and visual review

## Boundary

Contract Roll is part of the trusted local Data Acquisition administrator
surface. It is not chart, Replay, Session, Pane, or Bar Data Runtime behavior.
The V4 Maintenance API remains the only mutation boundary.

```text
V7 Contract Roll panel
  -> V4 roll-maintenance adapter
    -> Roll Calendar v2 domain
      -> raw-contract volume scanner
      -> guarded calendar backup / atomic replace / audit

Databento updater
  -> the same Roll Calendar v2 domain
    -> explicit contract segments
    -> hard calendar horizon before insert-only DuckDB write
```

## Calendar and chain contract

- Existing accepted rows keep their exact historical New York midnight
  boundary and are labelled `legacy_midnight`; no existing DuckDB row is
  silently rebuilt.
- New transitions retain the human-facing candidate CME trade date and store
  an explicit New York `effective_at_et` at the prior `18:00` session open.
- ES/NQ quarterly chains must be contiguous `H → M → U → Z → H`, ordered,
  prefix-correct, and free of duplicate transitions.
- The domain derives the next missing raw contract. The current calendar
  reports `ESU6 → ESZ6` and `NQU6 → NQZ6` instead of treating U6 as valid
  forever.
- An unconfirmed contract has a hard horizon at Monday of its quarterly
  third-Friday expiry week. Selected-range Preflight is blocked after that
  minute until the next transition is confirmed.

The hard horizon is a safety stop, not the recommended roll date. The
operator should scan and confirm earlier from market evidence.

## Evidence workflow

1. **Health** derives active contract, next transition, last effective time,
   and hard stop for ES and NQ.
2. **Scan** downloads both raw contracts over complete CME trade dates. A
   standard session must contain at least 1,200 distinct minutes per contract,
   begin within 30 minutes of `18:00`, and end within 30 minutes of `17:00`.
   Partial first/last days and early-close sessions cannot become candidates.
3. **Preview** requires retained scan evidence, an unchanged calendar hash,
   a single-line evidence note, and `volume_confirmed` or
   `manual_confirmed`. A proposed boundary already covered by DuckDB is
   rejected as a historical repair.
4. **Commit** requires exact `ROLL <old> <new>`, rechecks the Preview hash,
   validates the whole candidate calendar, creates a backup, fsyncs and
   atomically replaces YAML, and appends an audit JSONL record.
5. **Post-commit** refreshes Roll health and revokes every prior Data
   Acquisition Preflight, Dry Run, Backup, and read-verification presentation.

The legacy V4 `confirm_roll_write` API action and scanner `--confirm-roll
--write` path are disabled. They cannot bypass v2 evidence, history, backup,
or audit gates; read-only legacy reports, scans, and patch previews remain.

Scan and Preview evidence expire after 30 minutes and are intentionally lost
on API restart. `validated` cannot be selected by the new UI; that status is
reserved for an actual automated validation process.

## Historical protection

Changing a boundary at or before authoritative DuckDB coverage is not an
ordinary calendar edit because the market-data writer is insert-only and the
schema does not retain per-row raw-contract provenance. R7.3c stops and names
that condition `historical roll repair required`. It does not silently delete,
update, or rebuild authoritative rows.

## Acceptance evidence

- `v4/tests/test_roll_calendar_service.py`
- `v4/tests/test_roll_maintenance_service.py`
- `v4/tests/test_roll_volume_scanner.py`
- `v4/tests/test_databento_write_guard.py`
- `v4/tests/maintenance-service-boundary-smoke.py`
- `v7/tests/data-acquisition-ui-harness.js`
- `v7/tests/data-acquisition-ui-browser-harness.js`
- `v7/tests/fixtures/data-acquisition/ready-verified-1440x900.png`

Human review must cover the health cards, scan range, no-candidate state,
Preview diff, typed confirmation presentation, and the visible distinction
between `ready`, `due-soon`, and `blocked`. The September 2026 transition must
not be committed before real complete-session evidence exists.
