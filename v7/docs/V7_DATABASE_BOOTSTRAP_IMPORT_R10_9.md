# V7 First-Run Database Bootstrap And Import — R10.9

Status: implemented with automated evidence; clean-host human review pending

## Product Decision

A clean Linux deployment may start without a market-data DuckDB. The trusted
Data Acquisition administrator surface exposes one visual first-run workflow:

- upload one UTF-8 CSV and convert it to DuckDB on the server;
- upload one already prepared DuckDB;
- validate the complete candidate before it can become authoritative;
- perform no automatic column rename, value coercion, timezone conversion,
  instrument normalization, sorting repair, or deduplication.

R10.9 is deliberately an initialization feature, not a general database editor.
It accepts a target only while the configured `V4_TRADING_DB` path does not
exist and the deployment explicitly enabled `--bootstrap`. Once the first
database is activated, a durable staging lock keeps upload and activation
disabled even if the target is later removed. Merge, append, replacement,
rollback to another uploaded database, per-user market databases, and arbitrary
instruments are outside this step.

## Ownership And Topology

```text
Data Acquisition Database Setup panel
  -> authenticated same-origin /v7/database/*
    -> Caddy or private V7 proxy injects trusted user identity
      -> replay-lab-database-import.service on 127.0.0.1:8768
        -> isolated upload staging
        -> strict CSV conversion or DuckDB copy
        -> read-only candidate validation
        -> atomic create-if-absent activation

V4 query API
  -> configured DuckDB parent mounted read-only
```

The existing `adapter.data-acquisition-ui` owns only file selection, upload
progress, workflow presentation, validation evidence, confirmation, and calls
to the import service. It receives no Bar Data, Replay, Workspace, Chart, or
Session authority. The new Python service owns staging, candidate lifecycle,
validation, and first activation. V4 remains the only customer query API and
never receives write permission.

API, Web, and user-state systemd units mount the complete market-database
parent directory read-only. Only the import unit receives a writable mount of
that parent and `/var/lib/replay-lab/database-import`. This directory-level
isolation remains effective when V4 starts before the database file exists.
Every non-state unit mounts the user-state directory read-only, and a non-
bootstrap deployment starts the loopback import service with importing
explicitly disabled.

## Strict Input Contract

CSV must be UTF-8 and have this exact header and order:

```text
instrument,ts,open,high,low,close,volume
```

CSV timestamps must use `YYYY-MM-DD HH:MM:SS`. The candidate table must be the
base table `main.futures_1m` with the exact schema:

```text
instrument VARCHAR
ts         TIMESTAMP
open       DOUBLE
high       DOUBLE
low        DOUBLE
close      DOUBLE
volume     BIGINT
```

The validator rejects:

- unreadable or non-DuckDB input;
- a missing/view/wrong-schema `futures_1m`;
- an empty table or required null value;
- instruments outside the current ES/NQ product boundary;
- duplicate `(instrument, ts)` keys;
- timestamps not aligned to an exact minute;
- non-finite/non-positive OHLC, invalid OHLC ordering, or negative volume.

CSV conversion uses explicit types and strict DuckDB parsing, then writes the
candidate physically ordered by `instrument, ts`. This ordering is part of
creating the requested database, not a repair of rejected source values.
Uploaded DuckDB files are never rewritten to conform.

## Workflow And Failure Contract

1. `PUT /v7/database/import/upload` streams a bounded `.csv` or `.duckdb` to a
   generated staging directory and records size plus SHA-256.
2. `POST /v7/database/import/prepare` starts one retained background validation
   task. CSV produces a new candidate on the target filesystem; DuckDB is
   copied there before it is opened read-only with extension auto-install,
   auto-load, and external access disabled.
3. `GET /v7/database/import/current` restores the authenticated administrator's
   retained task after a page or service restart; `GET
   /v7/database/import/status` polls it and reports `uploaded`, `preparing`,
   `ready`, `failed`, or `activated`, including safe coverage summaries or a
   stable rejection code. Interrupted preparation returns to `uploaded` when
   the staged source remains intact, so validation can be explicitly retried.
4. `POST /v7/database/import/activate` requires the exact text
   `ACTIVATE DATABASE`. It uses a same-filesystem hard-link create so an
   independently appearing target fails with `409` and is never overwritten.
5. Successful activation removes the candidate link/source upload, fsyncs the
   target directory, writes and fsyncs the durable activation lock, and
   permanently locks this first-run service.

Only one uploaded/preparing/ready candidate may exist at a time. Upload and
target filesystems must each have the bounded free-space margin. A failed
candidate cannot create the authoritative path and its rejected source is
removed after the safe failure report is persisted. Browser disposal can stop
UI polling but cannot turn an unvalidated candidate into the active database;
a later authenticated page recovers the retained task.

## Deployment And Security

`install.sh --bootstrap --db ABSOLUTE_PATH` permits exactly one missing target.
The quick public-IP wrapper exposes the same flag and prepares the dedicated
database directory. Broad parents such as `/`, `/srv`, `/var`, `/home`, or
`/tmp` are rejected.

Port `8768` remains loopback-only and must not be opened in the cloud security
group. Public bootstrap requires authenticated HTTPS. Caddy routes only
`/v7/database/*` to the importer and overwrites the upstream identity with the
verified Basic Auth user. Unauthenticated public deployment cannot enable
bootstrap. All unrelated public mutations remain `403`.

Non-bootstrap deployment retains the prior contract: an existing DuckDB is
validated read-only, the database route is absent, and the importer reports
disabled locally even if the database path later disappears. Release rollback
does not remove an activated database or its durable importer lock.

## Automated Evidence

- `tests/database-import-service-harness.js` proves CSV and DuckDB paths,
  identity enforcement, extension rejection, duplicate rejection and cleanup,
  restart recovery, target-path blocking, strict confirmation, readable
  activated output, and permanent first-run lock.
- `tests/database-import-ui-browser-harness.js` drives a real Chrome file input
  through upload progress, validation evidence, hard-refresh task recovery,
  exact confirmation, activation, control locking, and a final read-only DuckDB
  smoke.
- `tests/data-acquisition-ui-harness.js` binds the exact UI contract and client
  request sequence.
- `tests/data-acquisition-ui-browser-harness.js` proves an existing database
  visibly locks the first-run controls while the prior maintenance workflow
  remains functional.
- `tests/linux-deployment-script-harness.js` proves missing-target bootstrap,
  authenticated Caddy routing, unauthenticated rejection, four hardened units,
  parent-directory isolation, and unchanged non-bootstrap behavior.

## Remaining Human Gate

On a clean lightweight host, deploy with `--bootstrap`, upload a representative
large CSV and a representative DuckDB in separate disposable runs, inspect
progress/error/coverage presentation, activate one candidate, verify V4 bars
and V7 Sessions, restart all services, and prove `/v7/database/import/upload`
returns the locked state afterward. Record peak disk, memory, conversion time,
certificate/auth behavior, and the fact that ports 8007/8766/8767/8768 remain
closed publicly. This visual and operational gate does not close the ongoing
phase-one product acceptance checklist.
