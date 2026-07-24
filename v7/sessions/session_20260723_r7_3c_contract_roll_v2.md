# Session — 2026-07-23 — R7.3c Contract Roll v2

## Request

Audit V4 `data-maintenance.html` contract-roll behavior and complete a safe,
maintainable roll workflow before the phase-one milestone.

## Result

- retained raw quarterly contracts, explicit local calendar authority,
  advisory volume evidence, human confirmation, and insert-only DuckDB;
- replaced V4's silent final-contract fallback with a validated quarterly chain
  and expiry-week hard horizon;
- migrated the calendar to schema 2 while preserving every accepted historical
  midnight boundary explicitly;
- made new transitions effective at the prior New York `18:00` CME trade-date
  session open;
- made the scanner aggregate by CME trade date and ignore incomplete sessions;
- added hash-bound Scan/Preview evidence, historical repair protection, exact
  typed confirmation, calendar backup, atomic fsynced write, and audit JSONL;
- disabled the legacy V4/API calendar-write path while retaining its read-only
  reports, scans, and patch previews;
- added the V7 Contract Roll health/evidence/commit panel without granting any
  chart, Replay, Session, or Bar Data owner mutation authority;
- made a Roll commit revoke all selected-range acquisition evidence.

Pre-review corrective pass:

- removed the single-overtake fallback so the configured two-complete-session
  confirmation rule cannot be bypassed;
- made every calendar transition obey the old contract's hard decision
  deadline;
- staged calendar and audit output before mutation and added exact rollback
  plus retryable Preview behavior for an injected audit replacement failure;
- moved acquisition-gate revocation ahead of all post-commit refreshes and
  verified that a failed Roll-health refresh cannot preserve write authority.

## Evidence

- 13 Roll domain/maintenance service tests passed;
- 10 scanner tests passed;
- 11 updater/write-guard tests passed;
- V4 maintenance boundary and Python compilation passed;
- V7 data-acquisition unit, module-host, source-quality, and real Chrome visual
  harnesses passed;
- current read-only health reports `ESU6→ESZ6` and `NQU6→NQZ6`, both `ready`,
  with hard horizon `2026-09-14T00:00` New York time.

No calendar transition was committed and no authoritative market-data row was
changed. Human review remains required.
