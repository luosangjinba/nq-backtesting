# V7 Restored Workspace Performance And Race Closure — R7.2

Date: 2026-07-23
Status: automatically accepted; no interaction or visual change

## Closure Decision

The replay/chart foundation is closed only after the durable R7.1 Workspace is
measured as a restored product state, not merely as a fresh single-Pane route.
R7.2 binds that restored state to the existing cache, latency, stale-response,
atomicity, no-future, Viewport, and complete Pane-set contracts.

This is an evidence matrix, not an assertion that every possible Cartesian
combination is a separate browser scenario. Every required foundation axis and
value has executable disposition, while the highest-risk restored composition
is exercised together in real Chrome.

## Restored Performance Profile

`workspace-checkpoint-restore-browser-harness.js` reconstructs a schema-6
Session after both route re-entry and hard refresh with:

- NQ `1m` plus ES `4h` in two independently sized Panes;
- shared RTH, Crosshair sync, P2 active, and a manual P1 Viewport;
- prior Manual Next and continuous Autoplay progress;
- one warm operation permitted to refill at most one forward request evicted by
  deep automatic history;
- 100 subsequent warm-cache Manual Next actions measured from browser click to
  accepted Replay revision and unlocked visible completion;
- exact `tail-update` chart mutation, zero provider requests during the measured
  samples, retained manual Viewport, and durable final Replay cursor;
- a subsequent three-step Autoplay run with no additional provider request and
  a matching durable checkpoint.

The acceptance run recorded Manual Next p95 `63.2ms`, p99 `74.6ms`, and max
`75.9ms`. The binding budget remains p95 `<100ms`, p99 `<150ms`, and max
`<250ms`; provider time is never hidden inside that local warm-cache budget.

## Runtime Corrections

Replay source traversal previously created a different
`current-minute → Session-end` raw request after every cache miss. Restored
workspaces with a forward window evicted from the bounded LRU therefore issued
one provider request per Next even though pane materialization used a stable
500-source-minute request identity.

Traversal now probes the same buffered `requestThrough()` identity as pane
materialization and advances by accepted request boundaries only when a closed
period, weekend, or holiday contains no next eligible source bar. Pane data may
also reuse an exact already-accepted source batch before asking the Bar Data
Runtime LRU; this is accepted projection state, not a second raw cache or data
request owner.

Forward Manual Next and Autoplay projection now use a pure incremental path.
It validates accepted provenance and strict forward compatibility, reprojects
only the accepted final aggregation bucket plus newly eligible source tail, and
must equal a complete projection at the same cursor. History, GoTo, backwards
navigation, capability replacement, and incompatible state continue through
the complete projection path.

## Race And Cross-Product Evidence

`v7-restored-workspace-performance-matrix.json` maps every value of the nine
required foundation axes to executable evidence. In particular:

- delayed cache/provider behavior remains separated from local latency;
- superseded and reordered acquisition/projection results remain stale and
  observationally inert;
- only the final current complete Pane set can visibly commit;
- single/multi Pane, single/multiple instruments, source/higher/future
  capability registration, ETH/RTH, all lifecycle states, Viewport intents,
  and Replay transport modes retain explicit coverage;
- restored workspaces remain paused on reconstruction and later Autoplay saves
  only its accepted cursor, never transient playback.

The matrix contract Harness rejects a missing axis value and verifies every
referenced evidence file. Runtime race behavior remains executed by Workspace
Transaction, Pane-set Materialization, Replay Navigation, provider, cache, and
real-browser Harnesses.

## Product Boundary After R7.2

R7.2 adds no customer-facing control and requires no manual visual review. The
chart/replay foundation is now accepted as the shared runtime substrate. The
next work is a product-boundary planning slice for the Backtesting and Journal
modules over this one foundation; it must not fork another chart or Replay
owner. Economic Calendar remains an independent later business module rather
than a prerequisite for foundation closure.
