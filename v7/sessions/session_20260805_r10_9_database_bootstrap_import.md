# Session — R10.9 First-Run Database Bootstrap And Import

Date: 2026-08-05
Status: implemented; clean-host large-file and visual acceptance pending

## Trigger And Decision

A new lightweight host still required an operator to transfer a prepared
DuckDB before the reviewed installer could run. The requested onboarding path
must accept CSV and DuckDB visually, validate the source, convert CSV on the
server, and perform no automatic normalization.

R10.9 adds one strict first-database workflow. It does not add general database
replacement, merge, append, per-user market data, or a second V4 writer. A
configured database path must be absent; successful activation permanently
locks the importer.

## Delivered

- the Data Acquisition administrator UI now presents exact schema guidance,
  file selection, real upload progress, staged evidence, validation coverage,
  hard-refresh recovery, exact confirmation, activation, errors, and active-
  database lock state;
- a loopback Python service streams bounded uploads, records SHA-256, converts
  strict UTF-8 CSV into a candidate DuckDB, copies uploaded DuckDB before
  opening it, and validates schema plus all critical row invariants;
- activation uses same-filesystem create-if-absent linking, never overwrites an
  existing or concurrently appearing target, fsyncs the parent, and deletes
  the staged source after success; a durable activation marker prevents target
  deletion from silently reopening first-run import;
- `--bootstrap` is supported by both Linux entries; public bootstrap requires
  authentication and exposes only `/v7/database/*` through Caddy;
- `replay-lab-database-import.service` owns 8768, staging, and the only writable
  database-parent mount; API, Web, and State mount the complete parent read-only;
- non-bootstrap existing-DuckDB deployment and the previous Data Acquisition
  maintenance chain remain intact.

## Automated Evidence

- database service Harness passes CSV and DuckDB activation, identity and type
  rejection, duplicate rejection, wrong confirmation, readable output, and
  permanent first-run lock;
- real Chrome selects an actual CSV file, displays upload progress, validates
  two instruments, activates through exact confirmation, locks the controls,
  and leaves a read-only-queryable DuckDB;
- Data Acquisition unit/browser Harnesses pass the client contract, existing-
  database lock, previous maintenance/roll behavior, and intentional visual
  update;
- Linux rendering passes ordinary/private/public/bootstrap modes, Caddy
  validation, unauthenticated-bootstrap rejection, all four hardened units,
  parent isolation, listener guards, syntax, and rollback inventory.

The complete 87-Harness run passed 84 functional, contract, browser, deployment,
architecture, and source gates. The same three pre-existing visual comparisons
recorded before R10.9 remain open: Pane Workspace `multi-mixed`, Replay
Workspace candle-body rendering, and Session date-picker PNG byte drift. No
fixture was re-recorded for those unrelated findings; all five R10.9-focused
service/UI/deployment gates pass in isolation and in the complete run.

## Remaining Human Gate

Use clean disposable lightweight hosts for one representative large CSV and
one direct DuckDB run. Record disk headroom, memory, duration, error clarity,
coverage evidence, HTTPS identity, service restart, V4 bars/V7 chart behavior,
and the locked upload response after activation. Keep 8007/8766/8767/8768
closed publicly. The main phase-one acceptance, R10.8 two-computer review, and
R7.3 Databento/Contract Roll gates remain independently open.
