# Session — R11.1 Architecture Integrity Recovery

Date: 2026-08-06
Status: automated repository recovery closed; human gates open

## Scope

R11.1 started from immutable checkpoint `6a101270` after a full-code review
reapplied V7's original modularity, ownership, and failure-atomicity standard to
the complete deployed product. It changes architecture conformance and failure
handling only; it does not close phase-one product acceptance or add a new
Backtesting, Journal, role, or market-data-normalization feature.

## Reproduced Regressions

- H074's accepted retention boundary did not bind temporary coverage leases and
  projected-history consumers to the full branded Workspace transaction. A
  stale transaction could release or reject work owned by a newer transaction.
- H076's accepted global-commit boundary did not make the durable Session
  checkpoint byte-exactly reversible and could report failure after the
  publication decision, leaving an ambiguous accepted revision.

The historical H074/H076 acceptance evidence remains unchanged. This record is
their current regression and recovery evidence.

## Recovery

- Workspace Transaction now has one explicit publication decision. Before it,
  Chart, Replay, Workspace State, publication, and the raw Session envelope are
  reversible; after it, cleanup cannot turn the accepted transaction into a
  reported failure. Failed rollback/reject poisons the activation and blocks
  later work until reconstruction.
- Raw Coverage and projected-history work use full transaction identity,
  shared-consumer reference counting, last-consumer abort, and stale-result
  rejection without touching a newer transaction.
- V4 derives an authoritative DuckDB revision from the main database/WAL/stat
  identity, returns it from health and data responses, rejects stale expected
  revisions with HTTP 409, and binds raw/projected caches to that revision.
- replicated-state hydration restores the exact allowlisted local snapshot on
  an ordinary storage failure. An unprovable apply/rollback failure creates an
  irreversible reload-required seal; retries, writes, disposal flushes, and
  late PUT completions cannot remove it.
- Linux deployment uses a release-owned `.venv` and one host transaction over
  release selection, environment, units, Caddy, permissions, service state,
  and restored loopback health. Failed releases are quarantined; incomplete
  rollback retains root-only recovery evidence.
- the static service maps reviewed URL prefixes to exact filesystem roots and
  denies decoded traversal, separators, NUL, unreviewed symlinks, and realpath
  escape. Database Bootstrap is an optional UI/service capability independent
  of Data Acquisition maintenance availability.
- the deployed-runtime manifest separates the read-only V4 service from legacy
  maintenance tooling, closes four systemd units and four Caddy routes, and
  inventories Node/Python/V4/deployment writers. The deployed entry rejects all
  mutation methods independently of proxy policy and treats a client-aborted
  response as normal connection termination rather than a second failed reply.
- sole-writer analysis closes 16 declared surfaces against 19 observed writer
  files and eight negative controls. H085, H086, and H089 now use declarative
  negative fixtures that their Harnesses actually execute.

## Evidence State

Focused transaction, persistence, lease, dataset-revision, state-sync, static-
surface, optional-removal, deployed-runtime, Linux rollback, architecture, and
writer-closure Harnesses pass. The architecture baseline contains 51 modules,
127 dependency edges, 115 construction sites, 16 declared writer surfaces, 19
observed writer files, and zero findings. The source baseline contains 319
files, 24,940 effective lines, 2,640 functions, and 311 public exports, with no
source exception or production violation.

The complete sequential sweep invoked all 93 top-level Harnesses. Ninety pass
directly. The only three non-zero exits are the exact pre-existing visual gates
listed below; there is no unexpected contract, owner, browser-function,
performance, deployment, Python, architecture, or source-quality failure.

The executable production matrix runs eight scenarios across 11 axes and
preserves its two exact known visual failures: Session date-picker pixels and
the mixed-Pane fixture. The separate full-suite Replay Workspace candle-body
visual finding also remains open; no visual baseline is re-recorded.

## Rule Disposition

- H074 and H076 remain accepted with their original acceptance evidence and
  gain this R11.1 regression/recovery chain.
- automated H084, H085, H086, H089, and H090 advance to accepted with this
  production-path and negative-control evidence.
- H087, H088, and H091 remain executable: real-host rollback/health, visible
  Data Acquisition/Bootstrap/static-surface review, and known visual failures
  still require human evidence.
- repository architecture recovery is closed independently after the complete
  automated sweep. Phase-one overall acceptance, physical cross-device review,
  clean-host CSV/DuckDB import, and the existing visual gates stay open.
