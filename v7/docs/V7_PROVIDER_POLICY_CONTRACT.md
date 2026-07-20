# V7 Provider Policy Contract

Status: R3.2b1 transport-neutral value boundary (2026-07-20)

## Responsibility

`core.provider-policy-contract` defines the operational limits a future market
data adapter must obey. It selects no provider and performs no network,
database, cache, timer, retry, coverage, Replay, chart, or UI work.

One immutable policy declares:

- an exact provider capability id;
- immutable or discoverable dataset-revision behavior;
- maximum bars, window duration, and concurrency per provider;
- a request failure deadline;
- at most four attempts, exact deterministic backoff values, and the explicit
  failure kinds eligible for retry.

The deadline is a failure bound, never an artificial production delay.

## Adapter Port And Error Taxonomy

A conforming adapter matches the policy's provider id and exposes only:

```text
resolveDatasetRevision(scope, { signal })
requestRawBars(request, { signal })
```

Transport errors must be normalized into stable kinds. Only `timeout`,
`rate-limited`, and `unavailable` may be configured as retryable.
Authorization, unsupported capability, invalid request, revision mismatch, and
invalid response failures are terminal. A provider `retryAfterMs` value takes
precedence over static backoff while the maximum attempt count still applies.

## Deliberate Deferrals

R3.2b1 does not define coverage intervals, gap meaning, request splitting,
prefetch, deadline/retry execution, revision caching, or a concrete adapter.
Those are isolated in R3.2b2/R3.2b3. Choosing a real data source remains a
future product decision and must require only a new adapter/capability record.
