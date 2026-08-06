# V7 Bounded Bar Data Runtime

Status: R11.1 transaction identity and dataset-revision recovery implemented

## Responsibility

`core.bar-data-runtime` is the only active owner allowed to invoke a raw market
data provider or retain raw batches. R3.2a provides a factory; each constructed
runtime owns an isolated queue, in-flight map, and exact-window LRU cache.

The injected `resolveProvider(providerId)` port returns an adapter exposing:

```text
requestRawBars(normalizedRequest, { signal }) -> RawBarBatch | Promise<RawBarBatch>
```

Provider output is revalidated through `core.bar-data-contract` before it can
enter cache. A returned request identity must exactly match the requested key.

## R3.2a Guarantees

- identical in-flight request identities receive the same Promise and one
  provider invocation;
- exact-window cache hits do not invoke the provider;
- the cache has an explicit positive entry bound and deterministic LRU eviction;
- a configurable global concurrency bound queues excess unique requests;
- queued work continues automatically when a slot opens, without mouse/wheel or
  another user command;
- provider failures are not cached;
- separate runtime instances share no mutable queue or cache;
- `dispose()` rejects queued and active consumers, aborts active signals, clears
  cache/in-flight state, blocks new acquisition, and prevents late cache writes.

The provider adapter is injected, so tests use a deterministic fake. R3.2a does
not connect V4, the network, DuckDB, or any external data source.

## Deliberate Deferrals

R3.2a caches only exact bounded windows. It does not yet merge overlapping
coverage, define market-closed gaps, discover revisions, apply provider-specific
request limits, retry, enforce the provider deadline, prefetch, or expose cache
metrics. Those require a reviewed provider/coverage policy in R3.2b.

It also owns no Session, Replay cursor, projection, chart, viewport, calendar UI,
or data-availability presentation. Cached raw future bars cannot become visible
until later Projection and transaction owners enforce no-future semantics.

## R8.4 Lease Boundary And R8.5 Activation

R8.4 introduces the pure `core.raw-coverage-lease-contract`: complete Workspace
identity plus explicitly bounded raw request windows and a revocable
synchronous read view. The contract owns no raw batch or provider work.

R8.5 activates that contract through this runtime. One private bounded coverage
store now owns accepted, staged, and callback-transient raw batches in addition
to the exact LRU. Transaction-bound Pane leases promote or reject staged
coverage; removed Panes release coverage; Replay traversal uses an ephemeral
lease and returns only derived target evidence. Caller cancellation cannot
obtain a stale lease, and runtime disposal revokes every live read and clears
all raw state.

R11.1 keys every staged lease bucket by equality of the complete branded
Workspace Transaction identity, never by Pane, Session, or transaction token
alone. Finalize/reject for transaction A cannot release or promote transaction
B. Projected-history work is a shared provider task with independent consumer
subscriptions: aborting one consumer preserves work still used elsewhere, and
aborting the last consumer aborts the provider request and removes all signal
listeners.

Raw retained coverage also carries the authoritative V4 dataset revision.
When a health or response revision changes, old-revision windows are discarded
rather than merged with the new database. Revision mismatch is a hard response
failure and cannot enter raw or projected cache.

Replay Workspace UI now retains only lease capabilities during a transaction
and immutable projected snapshots after commit. Its source/display ledgers and
cached raw-source reader are deleted. H074 is accepted and the production
writer scan identifies this module as the only raw-retention writer.
