# V7 Source Boundary

V7 production modules may be added only in roadmap order, with an owning public
contract, machine-readable descriptor, manifest inventory update, and
independent harness. Interaction or visual changes additionally require manual
acceptance. R1.1–R1.3 activate only pure identity and
transaction contracts. R1.4 adds an isolated module host with explicit port
injection and reversible lifecycle; it is not an application singleton,
Session store, scheduler, feature coordinator, or product runtime.
R1.5 adds pure versioned capability descriptors and compatibility negotiation;
it does not add a provider, timeframe implementation, instrument catalog,
calendar calculation, indicator evaluator, formula evaluator, or plugin loader.

R2.1 adds the explicit-key Session Store and replaceable persistence adapter.
R2.2 adds only the Session Browser DOM adapter and thin browser composition;
R2.3 extracts its accepted date-time interaction into the independent shared
Calendar Surface adapter. Calendar Surface owns only calendar/date-time
presentation and no coverage, bars, Replay, panes, viewport, provider, order,
news, or chart behavior.
R2.4 adds confirmed Session deletion through the existing Session Store and
Repository owners plus a list-only readability pass; Session Browser still
cannot write storage directly.

R3.1 adds only immutable provider-neutral raw Bar Data request/bar/batch values.
No provider I/O, cache, prefetch, retry, Replay, projection, chart, or UI owner
is active yet.

R3.2a activates the single Bar Data requester/cache factory with an injected
provider port, exact-window LRU, coalescing, concurrency queue, and disposal.
Only fake providers are used; real transport and coverage policy remain absent.

R3.2b1 adds a transport-neutral Provider Policy Contract for revision freshness,
request limits, deadlines, bounded retry, stable errors, and the adapter port.
It selects and invokes no real provider.

R3.2b2 adds explicit full-window coverage values and pure bounded acquisition
planning. Missing bars do not imply a coverage reason, and no provider is
invoked by this module.

R3.2b3 adds a policy-bound provider execution wrapper and automatic complete
coverage-plan runner. Bar Data Runtime retains raw request/cache ownership, only
fake adapters are exercised, and no Replay or UI behavior is active.

R3.3a adds provider/chart-independent Replay range, advancement input, and
transaction-scoped cursor proposal values. It activates no mutable Replay clock.

R3.3b activates one independently runnable Replay clock for each Session
activation. Only its explicit visible-commit port can publish cursor progress.

R3.3c adds pure low/high-watermark prefetch advice. It emits bounded time
windows only; Bar Data Runtime remains the sole raw requester/cache owner.

R4.1 activates the headless Workspace Transaction Runtime foundation. R8.9
makes it the global prepared coordinator for Chart, Replay, Workspace State,
and publication/persistence under one complete identity; stale and failed work
cannot replace any part of the last accepted workspace revision. It owns no
DOM, raw data, projection policy, or participant state.

R4.2 activates the pure Projection Domain boundary. It validates common raw
source identity, applies exclusive Replay no-future filtering before injected
Session Hours and aggregation policies, and returns one immutable pane snapshot
with exact provenance. Its accepted fixture is identity `1m` projection only;
real aggregation, calendar eligibility, charts, and UI remain absent.

R4.3 activates the headless Chart Snapshot Application as the sole chart-series
writer boundary. It stages immutable projected snapshots and requires an exact
adapter-visible receipt before completion. Only a deterministic fake adapter is
tested; no DOM, Lightweight Charts, viewport, Replay, or Bar Data behavior is
added.

R4.4 activates pure pane-local Viewport Runtime semantics. Branded default and
manual wall intent survives Replay cursor/data movement, and logical ranges are
transient adapter projections only. No chart, DOM, persistence, or vertical-
scale behavior is added.

R4.5 activates the first browser-visible chart slice. The pinned official
Lightweight Charts adapter is the only concrete series writer. R8.10 separates
the Replay Workspace DOM/command adapter from a dedicated Session-scoped
composition module that constructs and orchestrates core owners through public
ports for the disclosed deterministic foundation flow.

R8.11 boots both browser routes through isolated ModuleHost graphs loaded from
the exact production manifest and descriptors. Route entries own no feature
construction; the Session and Data Acquisition application adapters acquire
and clean their real browser resources through host lifecycle methods.

R13.2 activates `optional.annotation-geometry-domain` as a pure static,
removable contract. It owns exact immutable market-coordinate anchors,
Point/Segment/Rectangle Geometry normalization, and a composition-local
extensible Geometry Registry. It owns no Drawing Entity, Annotation document,
Chart/DOM rendering, interaction, persistence, Replay policy, semantic type,
Indicator series, or detector.

Do not import runtime code from V4, V5, or V6.
