# V7 Cloud Replay Hot Path — R12.5

Date: 2026-08-06
Status: implemented with automated evidence; cloud/browser acceptance pending

## Trigger

The same Replay Workspace that felt immediate against the local loopback
service showed visible Play-bar delay through the public acceptance host. The
measured client-to-host round trip was about 176 ms with no packet loss, while
the local market-data health route completed in roughly 1–2 ms. A new HTTPS
connection reached its first byte in roughly 0.76–0.97 seconds.

The measurement did not prove that the lightweight host CPU or DuckDB was
slow. It did prove that network work in the accepted Replay path is observable
and must not be treated as local-runtime cost.

## Root Cause

The production market-data provider declared the externally mounted DuckDB as
a discoverable revision with a one-millisecond TTL. Pane acquisition and Replay
source traversal correctly resolved the revision before planning an exact raw
request, but the TTL made that resolution an HTTP health request for almost
every transaction. Existing 500-minute and large-step 64-window forward
coverage therefore could not make warm Replay network-free.

Autoplay also scheduled the full selected cadence only after an accepted
transaction completed. Its effective start-to-start interval was therefore:

```text
transaction duration + selected cadence
```

Both behaviors preserved correctness, but together they exposed network and
browser processing time as systematic playback slowdown.

## Product And Architecture Decision

The active standalone V7 market database is immutable for one service/runtime
lifetime:

- Market Data mounts it read-only;
- Database Bootstrap can only create the first target and locks permanently;
- replacement or maintenance is not a live Replay operation;
- an operator replacing the external database must restart/redeploy the V7
  services and thereby establish a new runtime/revision boundary.

The provider policy therefore discovers the authoritative revision once per
provider/instrument/source scope and retains it for the active runtime. Raw and
projected cache identities continue to contain that exact revision. An
uncached request that receives HTTP 409 still invalidates the provider revision
entry immediately; the failed transaction cannot commit, and the following
attempt must rediscover the authoritative revision. An out-of-contract file
replacement is never allowed to publish a mixed response.

This decision does not move cache ownership out of Bar Data Runtime, introduce
a browser database, or add a second Replay path. Existing bounded forward
coverage remains the only warm-data mechanism in this delivery.

## Hot-Path Contract

After the first successful revision discovery and raw-window acquisition:

1. a warm Manual Next or Autoplay advance performs zero market-data network
   requests;
2. source traversal and every Pane may resolve the same provider scope, but the
   immutable provider revision entry answers locally;
3. raw future bars may remain cached while Projection enforces no-future
   visibility;
4. crossing a bounded coverage wall may issue one provider acquisition and is
   measured as a cache miss, never hidden inside the warm budget;
5. database replacement requires service restart/redeployment rather than a
   foreground polling loop.

The machine-readable cache/latency contract binds zero warm network requests
and the process-lifetime database revision rule.

## Autoplay Cadence Contract

Autoplay remains single-flight and completion-driven for correctness, but its
timer is based on consecutive tick start times. After one committed tick it
schedules only the unspent portion of the selected cadence:

```text
successor delay = max(0, selected cadence - transaction duration)
```

There is still at most one timer and one in-flight transaction. A slow tick
creates no accumulated deadline, skipped Replay bar, overlap, or multi-step
catch-up burst. When work exceeds the selected cadence, exactly one successor
may be scheduled with zero delay; the next transaction still cannot begin
until the prior transaction has completely settled.

Changing speed while a timer is pending replaces that one timer and establishes
a new cadence from the change time. Pause, disposal, Session completion, stale
generation, and failed/non-committed work continue to remove all successors.

## Automated Evidence

R12.5 automated implementation closes only when:

- the production provider proves repeated revision resolution performs one
  health request for an active runtime;
- HTTP 409 still invalidates the immutable revision entry and forces a fresh
  authoritative discovery;
- the scheduler proves processing-time compensation, zero-delay saturation,
  one timer, no overlap, no backlog, Pause, dynamic speed, and Session end;
- the cache/latency descriptor fails closed if zero-network, immutable-runtime,
  restart, mismatch-invalidation, or cadence rules are removed;
- the focused browser/replay regressions, architecture gates, and
  `git diff --check` pass.

All automated conditions passed on 2026-08-06. The production regression
matrix passed all 8 scenarios, 11 axes, and 8 negative controls; its two
pre-declared visual defects were reproduced without a new failure. H096 stays
executable because the separate public-host comparison below is still pending.

## Human Gate

Deploy R12.5 to `43.110.32.34`, hard reload the same accepted Session, and run
the same Pane count, Replay step, timeframe, Session Hours, and playback speed
used for the local comparison. Record browser Network requests and
input-to-visible completion for at least 100 warm steps.

Acceptance requires:

- no `/v7/market-data/health` or bars request per warm step;
- no skipped/intermediate-missing bar or divergent Pane;
- 1x/2x/5x start-to-start cadence no longer adds transaction duration after
  every step;
- cache misses remain visible and bounded rather than being misclassified as
  warm playback;
- host CPU, memory, swap, and DuckDB timing are recorded separately if delay
  remains.
