# V7 Raw Bar Data Contract

Status: R3.1 pure value boundary (2026-07-20)

## Scope

`core.bar-data-contract` defines provider-neutral request, raw bar, and batch
values. It performs no network, database, cache, prefetch, retry, scheduling,
Replay, projection, chart, or UI work.

The complete request identity is:

- `providerId`;
- `instrumentId`;
- `sourceResolutionId`;
- half-open `[windowStartEpochMs, windowEndEpochMs)`;
- exact `datasetRevision`.

Every field participates in the stable request key. Session id, activation,
transaction, pane, display timeframe, ETH/RTH mode, Replay cursor, and viewport
are prohibited from raw identity. Compatible product views reuse the same raw
data and derive their differences later.

## Normalized Raw Bar

Provider adapters must normalize their transport-specific values before calling
this contract. One raw bar has exactly:

- `startEpochMs` as a non-negative safe integer;
- finite numeric `open`, `high`, `low`, and `close`;
- `high`/`low` enclosing open and close;
- `volume` as a non-negative finite number or `null` when unavailable.

V4's `time`, `timestamp`, `tradingDay`, query-padding, and requested-range wire
fields are adapter concerns; they are not copied into the V7 raw domain.
Timezone/session eligibility and display aggregation also remain outside this
contract.

## Batch Invariants

A successful batch echoes one normalized request and contains zero or more
deeply immutable bars. Bars must be strictly timestamp-ordered, unique, and
inside the request's half-open window. Empty batches are valid successful
values; transport unavailable/error states will be specified with the runtime,
not encoded as fake bars.

The normalizer is idempotent: a previously normalized batch may cross another
trust boundary and be validated again. Its derived `requestKey` must match the
echoed request; a supplied forged key is rejected.

R3.1 does not prove gap policy, request coalescing, eviction, bounded concurrency,
dataset-revision discovery, provider deadlines, or no-future Replay visibility.
Those require the later Bar Data Runtime and transaction owners.

## Extension Boundary

Provider ids, instrument ids, and source-resolution ids are capability values,
not concrete branches. Adding seconds or another instrument/provider does not
change this contract. A future tick contract, if required, must be a separately
reviewed value kind rather than overloading OHLCV bars.
