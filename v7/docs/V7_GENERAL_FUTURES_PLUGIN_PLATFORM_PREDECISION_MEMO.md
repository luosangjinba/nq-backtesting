# V7 General Futures Plugin Platform — Pre-Decision Memo

Date: 2026-08-01
Status: discussion captured; product decision and implementation deferred

## Purpose And Current Binding Scope

This memo preserves the discussion about expanding V7 from a narrowly focused
SMC/ICT workstation into a more general futures Replay and validation platform
through indicators, visual elements, Setup detectors, and developer-authored
plugins.

It is not a binding product decision, does not change
`V7_PRODUCT_AND_SCOPE.md`, does not allocate a delivery step, and authorizes no
plugin runtime, SDK, package loader, marketplace, or feature implementation.
Until a later decision explicitly changes it, the binding product remains an
open-source, local-first SMC/ICT validation and Replay-practice workstation.

Work may begin only after the current system's human-review obligations are
closed. At activation time, every applicable `humanReviewRequired` rule must
carry explicit acceptance evidence or be explicitly retired/superseded through
the governed rule lifecycle. As of 2026-08-01, H001, H003, H004, H070, H080,
H081, and H082 still have no acceptance evidence. This memo resolves none of
them.

## Product Intention

The proposed expansion is not to place every trading style and indicator in
the core. The candidate positioning is:

> one general futures Replay/validation kernel, first-party capability packs,
> and a governed community plugin ecosystem.

SMC/ICT would remain a flagship first-party pack rather than being deleted or
diluted. Classic technical analysis, price/volume tools, discretionary Setup
detectors, and later data-intensive futures tools could be installed as other
packs over the same Replay, Chart, Journal, and Validation owners.

The first expanded audience should be **bar-based discretionary futures
traders**, not every possible futures workflow. Order flow, depth-of-market,
automated strategies, portfolio simulation, options, and multi-leg products
have additional data and execution contracts and must not be implied by the
first plugin milestone.

## Feasibility Conclusion

The direction is technically feasible and fits the intended V7 extension
model, but the work is larger than exposing Lightweight Charts plugin APIs.

| Candidate capability | Feasibility | Primary complexity |
|---|---:|---|
| built-in line/band/marker indicators | high | incremental calculation and atomic Chart contribution |
| native indicator sub-panes | high | lifecycle, sizing, Settings, and performance budgets |
| price/time visual primitives | high | hit testing, autoscale, provenance, and cleanup |
| deterministic Setup detectors | medium-high | semantic schema, no-future proof, and Journal drill-down |
| editable drawing tools | medium | interaction ownership, persistence, undo, and cross-pane sync |
| arbitrary third-party JavaScript | medium-low initially | sandboxing, permissions, supply chain, and resource control |
| order-flow/footprint plugins | deferred | tick/quote/depth data and specialized rendering |
| automated strategy/execution plugins | separate decision | orders, fills, risk, capital, and deterministic execution |

## Lightweight Charts Capability Evidence

Lightweight Charts 5.2 exposes the native mechanisms required by the candidate
rendering layer:

- Custom Series for new time-indexed series types and renderers;
- Series Primitives for price/time-anchored annotations, drawing tools, axis
  labels, autoscale contributions, and hit testing;
- Pane Primitives for chart-pane-wide graphics such as backgrounds and
  watermarks;
- native resizable Panes for volume, oscillators, and other sub-pane series.

Official documentation:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/custom_series>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/pane-primitives>
- <https://tradingview.github.io/lightweight-charts/docs/panes>

The official plugin examples cover indicators, heatmaps, alerts, tooltips,
custom series, annotations, and drawings. Their README describes them as
proof-of-concept starting points rather than production-optimized components:

- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples>

The curated Awesome TradingView list confirms an active community ecosystem
for plugin scaffolding, indicator libraries, wrappers, and utilities, while
also warning that community projects are not officially guaranteed for quality
or safety:

- <https://github.com/tradingview/awesome-tradingview>

These sources establish rendering feasibility. They do not define V7's public
plugin contract or justify giving community code direct Chart access.

## Existing V7 Foundation And Missing Runtime

V7 already defines `IndicatorModule` and `FormulaEngine` capability
descriptors. An Indicator declares immutable no-future Pane bars as input and
declarative series/overlay outputs. Capability negotiation can resolve
indicator and formula identities before product modules start.

This is intentionally only a descriptor foundation. Production currently has
no:

- indicator evaluator/runtime;
- Setup detector contract;
- declarative visual-result schema;
- Chart contribution manager;
- plugin package loader or discovery service;
- third-party execution sandbox;
- plugin-scoped persistence/migration owner;
- developer SDK, scaffold, or conformance kit.

The future work should activate these missing boundaries rather than replace
the existing capability system.

## Pane Terminology And Ownership

Two different meanings of Pane must remain explicit:

- a **V7 Workspace Pane** is an independent chart surface with Pane-local
  instrument, timeframe, Viewport, and presentation over one shared Replay
  clock;
- a **Lightweight Charts native pane** is an internal vertically stacked area
  inside one chart, sharing that chart's time scale and suitable for RSI,
  MACD, Volume, or other indicator sub-panes.

Native chart panes can implement indicator sub-panes but cannot replace V7's
Workspace Pane grid. Plugin APIs must use distinct terms such as
`workspacePaneId` and `chartSubPane` to prevent ownership confusion.

## Required Two-Layer Plugin Architecture

An application plugin and a Lightweight Charts plugin are not the same thing.
The safe candidate flow is:

```text
immutable no-future Pane Snapshot
              |
              v
        Plugin Runtime
   Indicator / Visual / Setup logic
              |
              v
   Declarative Analysis Result
     |                    |
     |                    +--> Setup Evidence --> Journal / Validation
     v
Chart Contribution Manager
              |
              v
sole Lightweight Chart Adapter
              |
              v
built-in series / native pane / primitive / approved custom series
```

Ordinary plugins must not receive a Lightweight Charts `chart`, `series`,
Pane API, DOM element, Canvas context, Replay runtime, Bar Data runtime, or
private owner state. Only the existing Chart Adapter may create, update,
remove, attach, detach, order, or move native series and primitives.

This separation preserves the sole Chart writer, prepared application,
rollback/finalize lifecycle, stale-result rejection, Crosshair ownership,
Settings application, and future library portability.

## Candidate Plugin Taxonomy

### Indicator Plugin

Consumes declared immutable inputs and parameters and produces series,
histograms, bands, markers, candle colors, or sub-pane contributions. Examples
include EMA, VWAP, RSI, ATR, MACD, Bollinger Bands, and Volume.

### Visual Plugin

Produces price/time-anchored declarative geometry such as lines, rays, boxes,
labels, ranges, backgrounds, session regions, or heatmaps. It does not draw
directly or own pointer listeners.

### Setup Detector

Produces semantic occurrences rather than orders. A candidate occurrence
contains stable setup identity, module/version, parameters, instrument,
timeframe, Session Hours, start/end anchors, direction, score/status,
human-readable fields, source snapshot identity, and raw-chart drill-down
provenance.

A Setup detector may contribute optional visual evidence, but its semantic
record and renderer are separate. It cannot place orders, mutate Journal,
advance Replay, or mark its own result as validated.

### Drawing Tool

Consumes pointer commands through a host-owned interaction port and produces
versioned immutable drawing documents. Selection, hit testing, undo/redo,
persistence, and deletion require explicit ownership and are not implied by a
Visual plugin.

### Strategy Or Execution Module

Automated entry/exit, position sizing, risk, commissions, slippage, and fills
are not Indicator or Setup responsibilities. They require a future separate
decision and permission model.

## Candidate Public Contracts

A future decision should evaluate at least these versioned public values and
ports:

### `PluginPackageManifest`

- namespaced id, semantic version, author, license, and integrity hash;
- supported host API range and package kind;
- capabilities and explicit permissions;
- input/output contract versions;
- parameter and Settings schema versions;
- persistence namespace and migration versions;
- deterministic/no-future declarations;
- compute, memory, output, and render budgets;
- independent conformance harness entry.

### `AnalysisInputRequirement`

- required fields such as OHLCV, Open Interest, ticks, quotes, depth, or
  session metadata;
- source timeframe(s), instrument scope, and warmup history;
- alignment, missing-data, Session Hours, and precision requirements;
- whether exact-input results may be shared across Panes.

Unavailable inputs must produce an explicit unavailable state. A plugin must
not silently approximate bid/ask, Open Interest, or order flow from OHLCV.

### `DeclarativeAnalysisResult`

- exact Session/activation/transaction/Pane/snapshot identity;
- plugin id/version and canonical parameter hash;
- input and dataset provenance;
- output revision and validity window;
- immutable declarative series, overlay, sub-pane, marker, style, and Setup
  occurrence collections;
- diagnostics and explicit unavailable/error state.

### `ChartContribution`

A rendering intermediate representation owned by V7, not by Lightweight
Charts. Candidate output kinds include:

- line, area, baseline, histogram, and band series;
- price/time anchored line, ray, box, label, marker, and region;
- candle/bar presentation contribution;
- main-pane versus named sub-pane placement;
- price-scale, z-order, visibility, and autoscale intent;
- hit-test metadata that resolves to stable plugin object ids.

The Adapter translates supported contributions to current Lightweight Charts
APIs. Unsupported output fails during capability negotiation rather than
performing an ad hoc runtime fallback.

### `SetupOccurrence`

A semantic evidence value suitable for Journal and Validation consumption. It
must preserve no-future computation, input provenance, exact chart anchors,
plugin version, parameters, and drill-down to raw Replay context.

## Transaction And Failure Semantics

Plugin results must be bound to the exact projected Workspace revision and
exclusive Replay cutoff that produced their inputs. A delayed result from a
prior cursor, timeframe, Session Hours mode, instrument, plugin version, or
parameter set must never become visible.

One candidate transaction policy is:

1. stage eligible incremental plugin calculations under a strict budget;
2. validate result identity, schema, no-future time bounds, and output budgets;
3. stage base candles and accepted contributions through the sole Chart owner;
4. atomically apply, roll back, and finalize the complete visible surface;
5. on plugin timeout/error, commit base Replay with that plugin explicitly
   absent/unavailable and remove its prior-revision output in the same Chart
   transaction;
6. discard late plugin completions rather than painting them after commit.

Third-party analysis must not block Replay indefinitely, but stale plugin
graphics must not remain beside newer candles and appear authoritative.

## Performance And Resource Contract

The plugin platform must not reintroduce Pane-count amplification. Required
investigation constraints include:

- compute once for exact bars/plugin/version/parameters/input requirements and
  reuse the immutable result across equivalent Panes;
- support incremental append/tail replacement with declared warmup state;
- reserve full-window recomputation for explicit replacement boundaries;
- execute ordinary calculation plugins off the browser main thread;
- cancel queued/staged work on activation and transaction staleness;
- cache expensive autoscale and hit-test structures;
- bound per-plugin execution time, memory, output points, series, primitives,
  sub-panes, labels, and persisted bytes;
- measure disabled-plugin overhead and require it to be negligible;
- preserve Crosshair, drag/zoom, Settings, Reset, history, and Replay latency
  under plugin load;
- expose structured per-plugin timing and error attribution.

Official documentation warns that primitive autoscale hooks are invoked very
frequently during scroll and zoom. A plugin output requiring an unbounded scan
inside autoscale or draw callbacks must fail conformance.

Required browser evidence should cover one, four, and eight Workspace Panes
with no plugins, a light overlay, a native sub-pane indicator, a heavy visual,
multiple shared inputs, mixed timeframes, errors, timeouts, uninstall, and
restore.

## Trust And Permission Tiers

A JavaScript interface alone is not a security boundary. Dynamically imported
third-party code in the application origin could access network, storage,
global objects, and CPU without using declared ports.

The candidate platform should distinguish:

1. **Declarative plugins** — safest default; deterministic calculation plus
   standard outputs, no DOM or native renderer.
2. **Worker calculation plugins** — manually installed/trusted code, isolated
   from DOM and private owner ports, with host-mediated data and persistence.
3. **Native renderer plugins** — high privilege; custom Canvas renderer or
   direct LWC implementation, initially limited to first-party/reviewed code.
4. **Sandboxed formula plugins** — future restricted DSL, WASM, QuickJS, or
   equivalent runtime after an explicit threat-model decision.

Network, filesystem, cross-instrument data, persistence, background work, and
native rendering must be separately declared permissions. Web Worker improves
main-thread and DOM isolation but is not by itself a complete untrusted-code
sandbox.

## Lifecycle, Persistence, And Developer Experience

Each plugin instance needs explicit discovery, negotiation, activation,
evaluation, suspension, disposal, and uninstall behavior. It must release
workers, event subscriptions, derived caches, Chart contributions, and
temporary state on every path.

Plugin settings and drawings require module-scoped persistence namespaces with
independent schemas and migrations. Removing a plugin must leave the core
Session readable; unknown plugin records must remain preserved or explicitly
quarantined rather than corrupting Workspace restoration.

A community-facing SDK should eventually provide:

- versioned TypeScript contracts and JSON schemas;
- a package manifest and local-install format;
- a scaffold generator and reference implementation;
- deterministic fake Pane snapshots;
- no-future, stale-result, cancellation, budget, rollback, disposal, and
  persistence conformance tests;
- visual screenshot and interaction fixtures;
- compatibility reporting against supported host API versions;
- packaging, licensing, security, and publication guidance.

The Lightweight Charts `create-lwc-plugin` scaffold may help first-party native
renderer development, but it must not become the V7 community API because that
would expose vendor-specific ownership and couple packages to the Chart engine.

## Candidate First-Party Packs

```text
V7 Core
|-- Basic Futures Pack
|   |-- EMA / VWAP / ATR / Volume
|   `-- Opening Range / Prior Day Levels
|-- ICT/SMC Pack
|   |-- FVG / Order Block / Liquidity
|   `-- Session and Setup evidence
|-- Classic TA Pack
|   |-- RSI / MACD / Bollinger / Trend
|   `-- conventional Setup detectors
`-- Community Plugins
```

Reference plugins for the first vertical slice should prove different
boundaries rather than maximize indicator count:

1. one incremental main-price overlay;
2. one native resizable indicator sub-pane;
3. one price/time visual primitive;
4. one Setup detector whose semantic occurrence drills into Journal/Validation
   evidence without placing an order.

## Product And Architecture Risks

- “General futures” may expand into unrelated data/execution products before
  the shared Replay and validation outcome is stable.
- Exposing native Chart APIs can create alternate Chart writers and destroy
  rollback guarantees.
- Loading arbitrary JavaScript can compromise local data and responsiveness.
- Too many outputs can make Replay, zoom, and Crosshair latency scale with
  plugin and Pane count.
- Multi-timeframe/multi-instrument plugins can bypass no-future truth if they
  request their own data.
- Setup detectors can become unverifiable black boxes without exact evidence
  and versioned parameters.
- Pine compatibility can consume the roadmap with language/runtime edge cases
  before a smaller stable V7 plugin contract exists.
- Community quantity can hide poor quality, repainting, license conflicts, and
  abandoned dependencies.

## Evidence Required Before A Binding Decision

The future decision package must include:

1. an explicit product-scope decision replacing or retaining the current
   SMC/ICT-only statement;
2. user workflows for Indicator, Visual, Setup, drawing, install, configure,
   error, disable, uninstall, restore, and evidence drill-down;
3. a threat model and selected trust/permission tiers;
4. versioned candidate schemas for package, input requirement, declarative
   result, Chart contribution, and Setup occurrence;
5. proof that no ordinary plugin receives native Chart, Replay, Bar Data, DOM,
   network, or persistence authority;
6. exact no-future, transaction identity, stale rejection, rollback, failure,
   lifecycle, and removal fixtures;
7. one/four/eight-Pane calculation/render benchmarks and fail-closed resource
   budgets;
8. real Lightweight Charts prototypes for overlay, sub-pane, primitive, and
   teardown using official APIs;
9. SDK/conformance and host-version compatibility strategy;
10. licensing and distribution rules for first-party and community packages;
11. a separate boundary decision for Strategy/Execution and for any plugin
    requiring tick/quote/depth data.

## Deferred Decision Questions

- Does the product formally become a general bar-based futures validation
  workstation, or remain SMC/ICT-first with optional community extensions?
- Which plugin kinds are supported in the first public SDK?
- Is the first release build-time registration, trusted local installation, or
  a truly dynamic sandboxed loader?
- Are plugins allowed to request host-mediated other-timeframe or
  other-instrument snapshots in the first version?
- Does visible Replay wait within a bounded budget for plugin output, or are
  some classes asynchronous optional consumers?
- Which plugin failures remove output, pause a Validation Campaign, or merely
  display unavailable status?
- How are Setup occurrences reviewed, corrected, versioned, and incorporated
  into Validation statistics?
- Are custom Canvas renderers public, reviewed-only, or permanently internal?
- What limits apply per plugin, Pane, Workspace, and Session?
- How are licenses, integrity hashes, upgrades, downgrades, and revoked plugins
  handled locally?

## Relationship To The Seconds/Tick Memo

`V7_SECOND_LEVEL_REPLAY_TICK_DATA_PREDECISION_MEMO.md` and this memo are
independent candidate decisions with shared constraints:

- seconds/ticks extend provider resolution and execution precision;
- plugins extend analysis, visual, and semantic evidence capabilities;
- order-flow plugins may later consume tick/quote/depth inputs only through
  host-mediated, no-future, budgeted data ports;
- neither memo authorizes, approves, or silently sequences the other.

The future decision phase must reconcile their delivery order, shared resource
budgets, capability descriptors, and evidence matrix before either becomes a
formal implementation roadmap.

## Activation Sequence

After all current human-review obligations are explicitly closed:

1. re-audit the rule registry and TODO for zero silently pending blockers;
2. decide the intended general-futures product boundary and explicitly update
   or retain the binding SMC/ICT scope;
3. prototype only the four representative first-party plugins against official
   Lightweight Charts APIs without opening third-party installation;
4. bind declarative output, Setup evidence, trust, failure, and performance
   contracts;
5. reconcile this proposal with the seconds/tick decision candidate;
6. convert the accepted conclusions into a binding product/architecture
   decision;
7. only then assign delivery steps, SDK scope, harnesses, and implementation.
