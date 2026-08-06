# V7 Provider Execution Runtime

Status: R11.1 authoritative dataset-revision boundary implemented

## Responsibility

`core.provider-execution-runtime` wraps one injected adapter with one immutable
Provider Policy. It is the execution bridge used by the existing Bar Data
Runtime; Bar Data Runtime remains the only raw requester/cache writer.

The wrapper owns only provider-operational state:

- coalesced revision discovery cached by provider/instrument/source resolution;
- immutable revision caching or TTL refresh according to policy;
- per-attempt deadline and abort;
- explicitly bounded retry with stable error taxonomy;
- provider-specific concurrency queue with automatic continuation;
- batch/coverage response validation and exact identity matching;
- last validated exact-window coverage reports;
- deterministic disposal and propagation of caller/root abort signals.

## R11.1 Dataset Revision Contract

V4 health discovers a revision derived from the authoritative DuckDB main
file, WAL, and `futures_1m` table identity. Raw-bars and projected-history
requests carry the expected revision; V4 returns `409` before querying when it
does not match and verifies again after querying so a mutation cannot publish a
mixed result. Every successful response repeats the exact revision.

The provider revision cache is an optimization only. A `409` or response
revision mismatch clears it immediately. Raw and projected cache keys include
that revision, so activation of a different database can never reuse evidence
from the previous file under a fixed product constant.

## Automatic Plan Acquisition

`acquireCoveragePlan()` submits a complete immutable request plan to Bar Data
Runtime at once. Bar Data Runtime retains coalescing, cache, and concurrency
ownership; queued requests continue without another mouse, wheel, resize, or
user command.

This is not Replay prefetch. Cursor-based high/low-watermark prefetch remains
deferred until Replay exists, so this step invents no cursor semantics.

## Failure And Latency Rules

The deadline terminates an unavailable attempt; it is never a simulated wait.
Only policy-declared temporary failures retry, at most the declared attempt
count. Terminal and invalid-response failures settle immediately. Coverage or
batch identity mismatches and excess returned bars never enter raw cache.

## Deliberate Deferrals

Only deterministic fake adapters are used. There is no V4, network, DuckDB,
real provider selection, overlapping-report arbitration, Session, Replay,
projection, chart, viewport, calendar UI, or visible-state behavior.
