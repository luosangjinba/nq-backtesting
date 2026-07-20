# V7 R4.3 Chart Snapshot Application — 2026-07-20

## Boundary Decision

Activate one headless Chart Snapshot Application as the sole chart-series
writer. It consumes the immutable Projection Domain result, stages through an
injected adapter, and acknowledges completion only after a branded exact
identity/snapshot visible receipt. Visible-completion ownership moved from the
Workspace Transaction Runtime to this boundary in the same commit.

## Library Audit

Current official Lightweight Charts `ISeriesApi`, `IChartApi`, and infinite-
history documentation plus the awesome-tradingview catalogue were checked.
`setData()` is suitable for complete snapshot replacement, but
`subscribeDataChanged()` observes data API invocation rather than proving a
browser paint. R4.3 therefore keeps the real library outside production and
requires the first browser adapter to provide a paint-level visual gate.

## Automated Gate

- Chart Snapshot Application Harness with 14 negative/race controls;
- exact snapshot/provenance and branded receipt validation;
- stage/apply supersession, disposal, duplicate, forged receipt, and adapter
  failure coverage against a deterministic fake;
- Workspace Transaction Runtime compatibility Harness;
- architecture writer inventory, acyclic public imports, source quality, full
  V7 Harness suite, and `git diff --check` before commit.

## Human Review

Not required: this step has no interaction or visual change.
