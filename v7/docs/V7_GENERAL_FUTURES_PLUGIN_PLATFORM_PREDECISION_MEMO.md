# V7 General Futures Plugin Platform — Pre-Decision Memo

Memo id: `MEMO-V7-001`

First formed: 2026-08-01

Last substantive revision: 2026-08-19 01:46 PDT

Status: partially promoted by `ADR-V7-004`, `ADR-V7-006`, and `ADR-V7-005`,
including interface/language, open Contribution Profile, typed-composition, and
calculated-series projection boundaries; P0a/P0b/P1a later delivered through
separate accepted contracts; P1b specification accepted separately; remaining
product scope, execution sandbox, AI, remote distribution, Marketplace, and
implementation decisions deferred; the current non-binding product-scope
position is narrowed to SMC/ICT-first, time-based OHLCV discretionary research
rather than broad trading-school compatibility

Registry: `V7_NON_DECISION_MEMO_REGISTRY.md`

## Purpose And Current Binding Scope

This memo preserves the discussion about expanding V7 from a narrowly focused
SMC/ICT workstation into a more general futures Replay and validation platform
through calculated indicators, manual semantic annotations, Setup workflows,
optional detectors, and developer-authored plugins.

On 2026-08-19, after reviewing a product-owner-supplied survey spanning
Brooks-style price action, ICT, non-ICT SMC, Wyckoff, Elliott Wave, Market/
Volume Profile, trend following, CAN SLIM, quantitative/statistical strategies,
and order-flow/HFT, the product owner narrowed the remaining candidate scope.
V7 need not promise first-class compatibility with trading schools whose
support would require specialized non-time-based models, volume-at-price,
fundamental/universe data, portfolio engines, tick/quote/depth, or automated
execution infrastructure. The stable memo title/path preserves history; it no
longer implies a recommendation to become a universal futures platform.

It is not a binding product decision, does not change
`V7_PRODUCT_AND_SCOPE.md`, does not allocate a delivery step, and authorizes no
plugin runtime, SDK, package loader, marketplace, or feature implementation.
Until a later decision explicitly changes it, the binding product remains an
open-source, local-first SMC/ICT validation and Replay-practice workstation.

On 2026-08-10, `ADR-V7-004` in
`V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md` promoted only the Kernel/Core/
Community taxonomy, initial Core capability classification, derived dependency
direction, Plugin Center product contract, install/developer channels,
host-rendered settings scopes, strict TypeScript/compiled ESM/JSON Schema
authoring model, trust posture, and thin-platform-first sequence. This memo
remains the non-binding record for product-scope evolution (now narrowed as
recorded below), Setup/AI capability,
concrete loader/sandbox/runtime implementation, remote distribution,
commercialization, and paid Marketplace questions. Where the accepted spec
and this earlier candidate differ, the accepted spec governs.

Work may begin only after the current system's human-review obligations are
closed. At activation time, every applicable `humanReviewRequired` rule must
carry explicit acceptance evidence or be explicitly retired/superseded through
the governed rule lifecycle. As of 2026-08-01, H001, H003, H004, H070, H080,
H081, and H082 still have no acceptance evidence. This memo resolves none of
them.

## Product Intention — Narrowed Candidate Position 2026-08-19

The proposed expansion is not to place every trading style and indicator in
the core. The revised candidate positioning is:

> one SMC/ICT-first Replay and validation workstation with governed extension
> compatibility for time-based OHLCV discretionary research.

SMC/ICT remains the binding primary product rather than merely one pack among
unbounded trading schools. The candidate compatibility envelope also allows
Brooks-style Bar/K-line price action, standard OHLCV calculated indicators, and
bar-based discretionary trend research when they use the same Replay, Chart,
Annotation, Setup/Study, evidence, and plugin-owner contracts. This is an
extension compatibility target, not a commitment to ship a first-party package
for every named school or indicator.

The supported envelope is capability-defined rather than a permanent blacklist
of school names:

- time-based OHLCV Bars and registered derived timeframes remain the admitted
  market-data basis;
- one or several time-synchronized instruments may be cited only through
  registered host capabilities and exact no-future snapshots;
- standard calculated series/Plots, anchored studies, market-coordinate
  Drawing Geometry, versioned Semantic Artifacts, deterministic or explicitly
  suggested detectors, and evidence-linked Setup/Phenomenon workflows remain
  valid contribution directions;
- a Setup definition may use one timeframe, several arbitrary timeframes, or no
  separately named Analysis stage. Any higher-than, same-as, fixed, or relative
  timeframe rule belongs to that exact Setup definition, never Kernel policy;
- discretionary observation, validation, research, review, and deliberate
  practice remain the product outcome. A chart signal does not imply a broker,
  order, fill, portfolio, or automated-execution contract.

### Explicit Non-Support Envelope

The current candidate position makes no first-class product, compatibility,
fixture, documentation, or roadmap commitment for:

- Wyckoff-specific phase schematics, point-and-figure cause/effect machinery,
  or other dedicated school models beyond what generic existing annotations
  happen to express;
- Elliott hierarchical/alternative wave-count trees and specialized
  relabelling/scenario infrastructure;
- Market Profile or Volume Profile implementations requiring TPO/volume-at-
  price data and specialized profile rendering;
- CAN SLIM or other fundamental-equity/universe/corporate-action workflows;
- multi-factor, statistical-arbitrage, portfolio-construction, or portfolio-
  simulation systems;
- order-flow, footprint, depth-of-market, HFT, broker execution, fill
  simulation, options, or multi-leg product engines.

V7 does not actively prevent an extension from using already admitted generic
capabilities for an incidental unsupported workflow. Such use is best-effort:
it creates no obligation to add a Profile, data owner, custom renderer,
business owner, compatibility Harness, or migration solely for that school.
Missing capabilities must fail as unsupported/unavailable rather than infer
precision from minute OHLCV or bypass existing owners.

## Feasibility Conclusion

The retained direction is technically feasible and fits the intended V7
extension model, but the work is larger than exposing Lightweight Charts
plugin APIs. The feasibility labels below classify platform capabilities, not
trading schools and not product eligibility. Medium-high detector or Setup
capabilities remain relevant because the retained SMC/ICT and price-action
workflows need them; the 2026-08-19 scope cut must not be misread as deleting
every capability whose engineering feasibility is below `high`.

| Candidate capability | Feasibility | Primary complexity |
|---|---:|---|
| calculated line/band/marker indicators | high | incremental calculation and atomic Chart contribution |
| native indicator sub-panes | high | lifecycle, sizing, Settings, and performance budgets |
| human-authored semantic annotations | high | interaction, editable meaning, persistence, chronology, and provenance |
| detector/suggestion plugins | medium-high | no-future proof, source distinction, and human acceptance |
| AI-assisted analysis harness | medium | evidence filtering, nondeterminism, privacy, cost, and attribution |
| Setup workflow/Case plugins | medium-high | event chronology, reference integrity, Journal ownership, and migration |
| editable drawing tools | medium | interaction ownership, persistence, undo, and cross-pane sync |
| marketplace and local dual installation | medium-high | signing, compatibility, permissions, updates, licensing, and operations |
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
- manual semantic-annotation contract, command owner, or durable store;
- detector/suggestion contract;
- AI evidence-bundle, provider-harness, or AI-suggestion contract;
- Setup workflow definition, Setup Case, or evidence-reference contract;
- declarative visual-result schema;
- Chart contribution manager;
- plugin package loader or discovery service;
- local package installer, signed registry, marketplace, or entitlement owner;
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

## Required Host-Mediated Plugin Architecture

An application plugin and a Lightweight Charts plugin are not the same thing.
Calculated outputs and human-authored semantic objects have different sources
and must not be forced through one evaluator-shaped path. The safe candidate
flow is:

```text
immutable no-future Pane Snapshot
              |
              v
  Calculated Indicator Runtime
              |
              v
 Declarative Calculated Result -------+
                                      |
host-owned pointer/selection commands |
              |                       |
              v                       |
 Semantic Annotation Command Owner    |
              |                       |
              v                       |
 Durable Semantic Annotation ---------+
              |                       |
              +--> Setup Case evidence references --> Journal / Validation
                                      |
                                      v
Chart Contribution Manager
              |
              v
sole Lightweight Chart Adapter
              |
              v
built-in series / native pane / primitive / approved custom series
```

Ordinary plugins must not receive a Lightweight Charts `chart`, `series`, Pane
API, DOM element, Canvas context, Replay runtime, Bar Data runtime, annotation
store, Journal store, or private owner state. Only the existing Chart Adapter
may create, update, remove, attach, detach, order, or move native series and
primitives. Only host-owned commands may create or change annotations and
Setup Cases.

This separation preserves the sole Chart writer, prepared application,
rollback/finalize lifecycle, stale-result rejection, Crosshair ownership,
Settings application, and future library portability.

## Candidate Plugin Taxonomy

`Basic` and `advanced` may be useful catalog and product tiers, but they must
not select different core ownership models. The public contract should classify
a package by its declared capabilities and the source of each result.

### Calculated Indicator Plugin

Consumes declared immutable inputs and parameters and produces series,
histograms, bands, markers, candle colors, or sub-pane contributions. Examples
include MA, EMA, VWAP, RSI, ATR, MACD, Bollinger Bands, Volume, and more complex
specialized indicators. Given identical data, plugin version, and canonical
parameters, the result must be reproducible.

MA and a complex multi-output indicator use the same calculation ownership;
they differ in input requirements, resource budgets, output count, and Settings
schema. A complete MACD should target a native chart sub-pane rather than share
the price pane's scale. Omitting sub-panes may simplify an early experiment but
must not define the public contract.

### Manual Semantic Annotation Plugin

Defines host-mediated tools and schemas for user-authored market meaning. FVG,
BSL, SSL, manually related SMT evidence, Order Blocks, and liquidity labels are
manual-first examples in the intended ICT/SMC workflow. Installing or enabling
such a plugin does not scan history or precompute these objects.

The user selects a tool and anchors an object to accepted chart context. The
host owns pointer routing, coordinate conversion, create/edit/delete commands,
undo/redo, persistence, selection, and rendering. The plugin declares allowed
geometry, semantic fields, role vocabulary, validation, and presentation
intent; it does not own native pointer listeners or storage.

A single anchored high may acquire several assertions over time, such as BSL,
Previous Day High, and Previous Week High. These are roles on one semantic
object, not duplicate unrelated drawings. SMT is preferably a versioned
relationship between anchored objects in two instruments rather than copied
geometry.

### Detector Or Suggestion Plugin

Optionally computes candidates such as an automatically detected FVG, Swing,
or SMT relationship. A candidate is not equivalent to a user's observation.
The source of every result must be explicit:

- `human` — created directly by the user;
- `suggested` — computed candidate awaiting a user decision;
- `computed` — machine output retained as machine output.

Accepting a suggestion creates a human-owned annotation with a provenance
reference to the candidate; it must not silently rewrite the candidate's
source. This distinction prevents automated help from contaminating validation
of the trader's own recognition skill. A computed Setup detector is one
possible sub-kind; it produces a suggested or computed occurrence, never an
order or a validated human Setup Case.

### AI-Assisted Analysis Capability

An AI analysis plugin should declare an analysis rubric, eligible evidence
types, prompt-template version, output schema, and resource requirements. It
must not embed provider credentials, select arbitrary private owner state, or
send data directly over the network. A host-owned AI Harness chooses an
approved local or remote provider and mediates credentials, future filtering,
context size, cancellation, latency, cost, privacy, and provider retention
policy.

The candidate flow is:

```text
accepted no-future evidence references
              |
              v
     host-built AI Evidence Bundle
              |
              v
 AI Harness -> local or opt-in remote provider
              |
              v
       AI Analysis Suggestion
              |
       explicit human review
              |
              v
host annotation / Setup Case command
```

Useful future roles include checking whether a Setup lacks required evidence,
summarizing entry-to-exit chronology, comparing plan with execution, finding
recurring review patterns, proposing annotations, and generating personalized
review questions.

AI output is nondeterministic advisory evidence. It uses `suggested` source
with an explicit `generatorKind: ai`, never `human` or deterministic
`computed`. It cannot mutate Annotation, Journal, Setup Case, Validation, or
Replay state; count as direct human recognition; mark a Case validated; or
place an order. AI work is asynchronous, cancellable, and excluded from the
Replay visible-commit critical path.

### Setup Workflow Plugin

Defines versioned optional evidence requirements and presentation groups for
recording one complete discretionary trade process. Thesis, Analysis, Context,
Trigger, Plan, Entry, Risk, Management, Exit, Outcome, and Review are possible
definition-owned roles, not a mandatory host sequence. A definition may be
single-timeframe, arbitrarily multi-timeframe, or omit a separately named
Analysis role. It produces no order and need not detect a Setup.

The plugin may contribute a host-rendered Setup List or detail surface, but the
Journal/Session owner persists each Setup Case. A Case references existing
semantic annotations, trade events, chart snapshots, and Replay context by
stable ids; it must not copy FVG/BSL/SSL objects into a private data island.

### Visual Contribution Capability

Visual output is a reusable capability rather than a sufficient statement of
business ownership. Calculated indicators, manual annotations, suggestions,
and Setup evidence may all contribute price/time-anchored lines, rays, boxes,
labels, ranges, backgrounds, session regions, markers, or heatmaps. Their
source and lifecycle remain distinct even when the Adapter renders them with
the same primitive.

### Drawing Tool

Consumes pointer commands through a host-owned interaction port and produces
versioned immutable drawing documents. Selection, hit testing, undo/redo,
persistence, and deletion require explicit ownership and are not implied by a
visual contribution.

### Host-Rendered Control Surface

Control surfaces are another capability rather than a plugin type. Calculated
indicators declare a Settings schema; semantic annotations declare tool and
property schemas; Setup workflows declare list, optional role-group, and detail
schemas. The host renders, validates, persists, and disposes these surfaces
consistently.

Arbitrary plugin-owned DOM, framework components, or unrestricted custom
panels are a separate high-privilege capability and should not be required for
the first public SDK. A complex indicator with many grouped or conditional
settings remains implementable through a sufficiently expressive host schema.

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
- declared result-source modes and host-rendered surface schemas;
- persistence namespace and migration versions;
- deterministic/no-future declarations;
- compute, memory, output, and render budgets;
- independent conformance harness entry.

### `AnalysisInputRequirement`

- required admitted fields such as OHLCV and session metadata;
- source timeframe(s), instrument scope, and warmup history;
- alignment, missing-data, Session Hours, and precision requirements;
- whether exact-input results may be shared across Panes.

Open Interest or another time-based input would require a separately admitted
host capability. Tick, quote, depth, volume-at-price, fundamental, and
portfolio inputs are outside the current compatibility recommendation rather
than fields promised by this candidate contract. Unavailable inputs must
produce an explicit unavailable state. A plugin must not silently approximate
bid/ask, Open Interest, order flow, or profile data from OHLCV.

### `DeclarativeCalculatedResult`

- exact Session/activation/transaction/Pane/snapshot identity;
- plugin id/version and canonical parameter hash;
- input and dataset provenance;
- output revision and validity window;
- immutable declarative series, overlay, sub-pane, marker, style, and Setup
  occurrence collections;
- explicit `computed` or `suggested` source, never implicit human authorship;
- diagnostics and explicit unavailable/error state.

### `SemanticCandidate`

A calculated `suggested` or `computed` semantic result with exact input,
plugin/version, parameter, no-future, market-anchor, and Replay provenance. It
may be rendered as a candidate but is not a human annotation and cannot be
included in recognition-skill evidence as though the user created it.

### `AIEvidenceBundle` And `AIAnalysisSuggestion`

`AIEvidenceBundle` is assembled by the host from stable evidence references
that are eligible at one exclusive Replay cutoff. It contains no hidden future
bars and grants no owner or storage capability. Remote transmission requires
an explicit network/provider permission and a user-visible statement of the
data classes leaving the machine.

`AIAnalysisSuggestion` records at least the requesting plugin/version,
provider, model identity/version when available, prompt-template version,
input-evidence hash, Replay cutoff, output-schema version, creation time,
latency, estimated/measured cost, and stale/cancelled state. Accepting one
creates a separately revisioned host-owned artifact with a provenance link; it
does not rewrite the AI output into direct human authorship.

### `SemanticAnnotation`

A durable host-owned user artifact, not a calculated series point. Candidate
fields include:

- stable annotation id, schema version, Session, Workspace Pane, instrument,
  timeframe, and Session Hours identity;
- immutable price/time/range anchors expressed in market coordinates rather
  than pixels;
- primary semantic type and zero or more versioned role assertions;
- human authorship plus `direct` or `accepted-suggestion` creation origin and
  immutable candidate provenance where applicable;
- creator and create/edit/classify/invalidate Replay cursor chronology;
- status history and human-readable properties;
- relationships to other annotations, including cross-instrument SMT edges;
- exact evidence references needed to reconstruct the raw chart context.

One market anchor may carry BSL, Previous Day High, and Previous Week High
assertions simultaneously. Each assertion records when it was made or removed;
presentation must not require duplicate independent geometry.

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

### `SetupDefinition`, `SetupCase`, And `SetupEvent`

`SetupDefinition` versions optional evidence-role requirements, cardinality,
temporal/timeframe policies, fields, validation, allowed evidence types, and
host-rendered list/detail presentation. It contains no universal Analysis,
Entry, Context/Execution Pane, two-timeframe, or higher-than rule. `SetupCase`
is the Journal/Session-owned instance for one complete trade process.
`SetupEvent` records the exact definition-owned role at an explicit market time
and Replay observation cursor; each evidence reference retains its own source
timeframe/resolution independently from any target Chart timeframe.

A Case references annotations, trade events, snapshots, and other evidence by
stable ids. It does not copy their private payloads. Reference integrity,
plugin/schema version, event chronology, ex-ante versus hindsight status, and
raw-context drill-down must survive plugin disable, upgrade, and uninstall.
MEMO-V7-005 contains the later non-binding `SetupEvidenceRequirementV1` and
`SetupVisualGroupV1` candidate details; this older memo cannot override them
with a fixed stage list.

### `SetupOccurrence`

An optional computed/suggested detector value, distinct from a human-owned
`SetupCase`. It preserves no-future computation, input provenance, exact chart
anchors, plugin version, parameters, and drill-down to raw Replay context.

## Transaction And Failure Semantics

Calculated plugin results must be bound to the exact projected Workspace
revision and exclusive Replay cutoff that produced their inputs. A delayed
result from a prior cursor, timeframe, Session Hours mode, instrument, plugin
version, or parameter set must never become visible.

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

AI analysis never participates in the atomic Replay transaction. The host may
launch it only from an already accepted evidence bundle. Cursor, Session,
dataset, plugin, prompt, provider, or evidence staleness cancels or rejects its
result; a late completion may remain in an explicit historical request log but
cannot attach itself to the current chart or Case.

Manual semantic annotations and Setup Cases do not share that calculation
lifecycle. They are durable user artifacts changed only through revision-
checked host commands. Rendering is a projection of their accepted revisions;
the Chart Adapter remains the only native writer and cannot become their
durable owner.

At minimum the durable chronology must distinguish:

- the market time/price/range to which an artifact is anchored;
- the Replay cursor at which the user first observed or created it;
- later classification, role, edit, invalidation, and review cursors;
- ex-ante evidence from hindsight conclusions entered after the trade.

Moving Replay backward must never rewrite this history. Whether future-created
annotations are hidden, dimmed, or remain visible in each practice/review mode
is a product decision that must be explicit and testable.

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
- index annotations by visible market range and render only eligible geometry
  without scanning every Session artifact on each frame;
- reuse one accepted annotation projection where equivalent Workspace Panes
  display the same semantic scope, while preserving Pane-local visibility;
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

1. **Declarative plugins** — safest default; deterministic calculation or
   host-rendered annotation/workflow schemas plus standard outputs, no DOM or
   native renderer.
2. **Worker calculation plugins** — manually installed/trusted code, isolated
   from DOM and private owner ports, with host-mediated data and persistence.
3. **Native renderer plugins** — high privilege; custom Canvas renderer or
   direct LWC implementation, initially limited to first-party/reviewed code.
4. **Sandboxed formula plugins** — future restricted DSL, WASM, QuickJS, or
   equivalent runtime after an explicit threat-model decision.

Network, filesystem, cross-instrument data, persistence, background work,
remote AI provider/data classes, and native rendering must be separately
declared permissions. Web Worker improves main-thread and DOM isolation but is
not by itself a complete untrusted-code sandbox.

## Lifecycle, Persistence, And Developer Experience

Each plugin instance needs explicit discovery, negotiation, activation,
evaluation, suspension, disposal, and uninstall behavior. It must release
workers, AI requests, event subscriptions, derived caches, Chart contributions,
and temporary state on every path.

Plugin settings require module-scoped persistence namespaces with independent
schemas and migrations. Host-owned annotations, relationships, and Setup Cases
retain their core identity and original plugin/schema provenance. Removing a
plugin must leave the core Session and historical evidence readable; unknown
plugin-defined properties must remain preserved or explicitly quarantined
rather than corrupting Workspace restoration.

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

## Dual Installation And Distribution Candidate

Marketplace and local installation should consume one package manifest,
artifact format, compatibility resolver, permission model, conformance suite,
installer, runtime, and uninstall lifecycle. They are distribution sources,
not two plugin APIs.

### Marketplace Installation

The host resolves a versioned artifact from a registry and verifies publisher
identity, package signature/integrity, supported host API range, declared
permissions, review/conformance status, and any entitlement before an atomic
install or upgrade. Candidate services include discovery, categories, ratings,
release channels, signed updates, trial/license delivery, deprecation,
revocation, and rollback.

Marketplace signature and review improve source trust but do not make plugin
code safe. Marketplace plugins receive exactly the same runtime permissions
and budgets as equivalent local packages. Revocation may disable future
execution or updates but must not erase historical annotation or Setup evidence.

### Local Installation

A user or developer selects the same packaged artifact from local storage. The
host still verifies its manifest, integrity, API compatibility, permission
request, schema/migration plan, and resource declarations. Unknown or unsigned
publishers require a visible trust decision. Automatic updates should be off by
default unless the package declares an approved update source.

Local installation preserves offline, private, development, and enterprise
use. It must not become a bypass around permissions, quotas, migrations, or
owner boundaries. Free core use and local/free plugins should not require a
marketplace account; paid marketplace entitlements may use a signed local
receipt, offline grace period, or fallback/perpetual license rather than a
network check on every launch.

VS Code is evidence that marketplace and local packaged installation can
coexist under one extension system. Its official documentation supports both
Marketplace installation and local `.vsix` installation, signs Marketplace
artifacts, and still warns that installed extensions require a publisher-trust
decision:

- <https://code.visualstudio.com/docs/configure/extensions/extension-marketplace>

## Candidate Commercialization Hypothesis

A marketplace can alleviate discovery, payment, licensing, update, trust, and
developer-distribution problems. It can support paid first-party plugins and a
commission on third-party sales, but it does not create user demand, valuable
plugins, or a developer supply by itself. It is a commercialization amplifier,
not the initial revenue engine.

JetBrains Marketplace is current evidence for a mature mixed model. Its
official documentation supports free/donation, freemium, paid, and externally
paid plugins; monthly/yearly subscriptions with or without a fallback license;
and perpetual licenses. Its published commission is currently 15 percent while
JetBrains handles marketplace tax and distribution processes:

- <https://plugins.jetbrains.com/docs/marketplace/plugin-monetization.html>
- <https://plugins.jetbrains.com/docs/marketplace/billing-and-licensing.html>
- <https://plugins.jetbrains.com/docs/marketplace/revenue-sharing-and-fees.html>

These are feasibility references, not an adopted V7 price, commission, license,
or account policy. Any marketplace would itself be an operating product with
publisher identity, package review, malware response, copyright and license
complaints, moderation, payment, tax, refund, chargeback, fraud, entitlement,
support, reporting, and revocation obligations.

The candidate revenue order is:

1. keep the open-source core and useful basic first-party packs free enough to
   establish adoption and trust;
2. sell first-party specialized indicators and professional Setup workflows;
3. offer opt-in AI Harness usage through subscription or metered credits after
   privacy, provider-cost, and evidence contracts are proven;
4. consider optional hosted sync/backup/team services without weakening
   local-first operation;
5. add third-party paid-plugin commission only after the SDK has stable users,
   credible developers, and marketplace gross merchandise value.

Marketplace commission alone is unlikely to fund an early small ecosystem. An
illustrative, non-forecast scenario of 10,000 monthly active users, 5 percent
annual buyers, USD 60 annual plugin spend, and a 15 percent take rate produces
only USD 4,500 annual platform commission. The same 500 buyers purchasing a
USD 60 first-party product produce USD 30,000 gross revenue before costs. AI
subscription revenue may recur more strongly but carries inference, support,
privacy, and provider-dependency costs.

The future decision must define measurable launch thresholds rather than build
payments merely because package installation exists. Candidate thresholds
include active users, enabled local/free plugins, third-party publishers,
retention, support load, first-party conversion, security-review capacity, and
credible annual marketplace volume.

## Candidate First-Party Packs

```text
V7 Core
|-- Accepted Built-In Foundations
|   `-- FVG / BSL / SSL / MA-SMA / Fibonacci baselines
|-- Candidate ICT/SMC Extensions
|   `-- structure / liquidity / imbalance / time-price semantics
|-- Candidate Price-Action And Bar-Based Trend Extensions
|   `-- Bar sequence / standard OHLCV calculations / discretionary evidence
|-- Setup And Study Workflow
|   `-- definition-owned optional roles / Case / outcome / review
|-- AI-Assisted Review Pack (future, governed)
`-- Community Plugins Within Admitted Host Capabilities
```

This diagram is discovery/packaging language, not a new Core classification.
Every addition still requires the accepted Core rule or the applicable future
Community contract, and no school Pack may make its preferred ontology Kernel
truth.

Reference plugins for the first vertical slice should prove different
boundaries rather than maximize indicator count:

1. one incremental MA main-price overlay;
2. one complete MACD using a native resizable indicator sub-pane;
3. one manual FVG or BSL/SSL annotation with edit, chronology, roles, and
   provenance but no automatic precomputation;
4. one Setup Workflow whose Case references that annotation and drills into
   Journal/Validation evidence without copying it or placing an order.

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
- Human, suggested, and computed objects can become indistinguishable and
  invalidate skill evidence unless source is immutable and visible.
- Plugin-private annotation or Setup storage can fragment Journal truth and
  make historical Sessions unreadable after uninstall.
- Duplicate drawings for BSL/PDH/PWH roles can diverge instead of representing
  one anchor with versioned semantic assertions.
- Arbitrary custom control panels can bypass host Settings, persistence,
  permissions, and disposal boundaries.
- AI providers can receive future bars, private Journal content, or identifying
  data unless evidence construction and remote permissions fail closed.
- Nondeterministic AI suggestions can be mistaken for human recognition or
  objective Validation truth without immutable source and model provenance.
- Unbounded AI context and retries can create hidden provider cost and latency.
- A marketplace can consume the roadmap before sufficient users, developers,
  gross merchandise value, or security-review capacity exist.
- Signed marketplace distribution can create false confidence if runtime
  sandboxing, permissions, update rollback, and revocation remain weak.
- Pine compatibility can consume the roadmap with language/runtime edge cases
  before a smaller stable V7 plugin contract exists.
- Community quantity can hide poor quality, repainting, license conflicts, and
  abandoned dependencies.

## Evidence Required Before A Binding Decision

The future decision package must include:

1. an explicit product-scope decision retaining the current SMC/ICT-first
   statement and accepting, amending, or rejecting the narrowed time-based
   OHLCV discretionary compatibility envelope above;
2. user workflows for calculated Indicator, manual annotation, suggestion and
   acceptance, Setup Case, drawing, AI request/consent/review/cancel, local and
   marketplace install, configure, error, disable, upgrade, uninstall,
   restore, and evidence drill-down;
3. a threat model and selected trust/permission tiers;
4. versioned candidate schemas for package, input requirement, calculated
   result, semantic annotation/assertion/relation, Chart contribution, Setup
   definition/Case/event, evidence reference, optional Setup occurrence, AI
   evidence bundle/suggestion, registry artifact, and entitlement receipt;
5. proof that no ordinary plugin receives native Chart, Replay, Bar Data, DOM,
   network, AI credential/provider, annotation-store, Journal-store, or
   persistence authority;
6. exact no-future, transaction identity, stale rejection, rollback, failure,
   lifecycle, and removal fixtures for calculated results;
7. revision, undo/redo, cursor chronology, source, assertion, relationship,
   and plugin-uninstall fixtures for durable annotations and Setup Cases;
8. proof that accepting a suggestion creates traceable human evidence without
   relabeling the original computed source;
9. proof that a Setup Case references rather than copies semantic evidence and
   remains readable when its defining plugin is unavailable;
10. AI evidence fixtures proving no future/private data escapes declared
    scope, remote transmission is opt-in, and direct mutation is impossible;
11. AI staleness, cancellation, nondeterministic-source, model/prompt/input
    provenance, latency, context, and cost-budget fixtures;
12. one/four/eight-Pane calculation/render benchmarks and fail-closed resource
   budgets;
13. real Lightweight Charts prototypes for MA overlay, MACD sub-pane, manual
    semantic annotation, and teardown using official APIs;
14. a host-rendered Settings/tool/workflow schema prototype and an explicit
    decision on whether arbitrary custom panels are ever public;
15. one common package installed locally and from a test signed registry with
    permission review, compatibility failure, upgrade rollback, revocation,
    uninstall, and historical-evidence survival;
16. SDK/conformance and host-version compatibility strategy;
17. licensing and distribution rules for free, first-party paid, community,
    externally licensed, and AI-assisted packages;
18. a marketplace operating model, launch thresholds, support/security
    capacity, and conservative revenue/cost scenarios before payment work;
19. a separate boundary decision for Strategy/Execution and for any plugin
    requiring tick/quote/depth data.

## Deferred Decision Questions

- Does a binding decision adopt the current recommendation to remain SMC/ICT-
  first with only the narrowed time-based OHLCV discretionary compatibility
  envelope, or narrow it further? Broad general-futures repositioning is no
  longer the recommended alternative in this memo.
- Which plugin kinds are supported in the first public SDK?
- Is the first release build-time registration, trusted local installation, or
  a truly dynamic sandboxed loader?
- Are plugins allowed to request host-mediated other-timeframe or
  other-instrument snapshots in the first version?
- Does visible Replay wait within a bounded budget for plugin output, or are
  some classes asynchronous optional consumers?
- Which plugin failures remove output, pause a Validation Campaign, or merely
  display unavailable status?
- When Replay moves before an annotation's create/classification cursor, is
  that later knowledge hidden, dimmed, or retained in each product mode?
- Which semantic fields are assertions on one anchor, and which require a new
  object or cross-instrument relationship?
- How are suggested detections accepted, rejected, corrected, versioned, and
  reported separately from direct human recognition?
- Does the first AI Harness support local models, user-supplied remote keys,
  host-metered remote service, or a governed subset of these modes?
- Which evidence classes may leave the machine, how is consent shown, and what
  provider retention, redaction, cost, and deletion guarantees are required?
- Can AI-assisted recognition enter Validation statistics, and if so how is it
  reported separately from unaided human evidence?
- Which Setup workflow surfaces can be expressed by host schemas, and does any
  first release require a privileged custom panel?
- How are Setup Cases and their referenced evidence incorporated into
  Validation statistics without treating hindsight review as ex-ante input?
- Are custom Canvas renderers public, reviewed-only, or permanently internal?
- What limits apply per plugin, Pane, Workspace, and Session?
- Which entity signs Marketplace artifacts, how are signing keys and publisher
  identity governed, and what does revocation do while offline?
- What active-user, developer, security-review, retention, conversion, and
  gross-volume thresholds justify a paid Marketplace?
- Which capabilities remain free first-party foundations, and which may be
  paid, freemium, donation-supported, externally licensed, or AI-metered?
- How are licenses, integrity hashes, upgrades, downgrades, and revoked plugins
  handled locally without requiring a network check on every launch?

## Relationship To The Seconds/Tick Memo

`V7_SECOND_LEVEL_REPLAY_TICK_DATA_PREDECISION_MEMO.md` and this memo are
independent candidate decisions with shared constraints:

- seconds/ticks extend provider resolution and execution precision;
- plugins extend analysis, visual, and semantic evidence capabilities;
- the current plugin-scope recommendation does not promise order-flow/
  footprint/DOM plugins even if a later seconds/tick decision improves Replay
  precision; any future reversal requires a new explicit product decision and
  host-mediated, no-future, budgeted data ports;
- AI plugins may receive seconds/tick-derived evidence only through the same
  host-built no-future bundle and explicit privacy/cost budgets;
- package distribution and Marketplace payment are independent of provider
  resolution and authorize no new market-data access;
- neither memo authorizes, approves, or silently sequences the other.

The future decision phase must reconcile their delivery order, shared resource
budgets, capability descriptors, and evidence matrix before either becomes a
formal implementation roadmap.

## Activation Sequence

After all current human-review obligations are explicitly closed:

1. re-audit the rule registry and TODO for zero silently pending blockers;
2. decide whether to bind the narrowed time-based OHLCV discretionary
   compatibility envelope while retaining SMC/ICT as the primary scope;
3. prototype only MA overlay, MACD native sub-pane, one manual semantic
   annotation, and one annotation-referencing Setup Workflow without opening
   third-party installation;
4. bind calculated output, semantic annotation, source provenance, Setup Case,
   host-rendered control surface, trust, failure, and performance contracts;
5. prototype AI only against a host-built frozen evidence bundle and prototype
   one common package through local and test signed-registry installation,
   without production remote transmission or payments;
6. reconcile this proposal with the seconds/tick decision candidate;
7. convert accepted base-plugin, AI, distribution, and commercialization
   conclusions into explicitly separate binding decisions;
8. only then assign delivery steps, SDK scope, harnesses, and implementation;
9. prove the SDK, local installation, first-party packages, and a signed free
   registry before any paid Marketplace launch decision.

## Position History

### 2026-08-01 — Initial Formation

Captured the general futures/plugin-platform direction, capability taxonomy,
semantic annotation, Setup workflow, AI Harness, distribution, marketplace,
commercialization, risks, evidence gates, and unresolved alternatives. No
product decision or implementation was authorized.

### 2026-08-10 — Partial Promotion By ADR-V7-004

The product owner accepted the Core/Community plugin model after R13.10c:
Kernel remains non-plugin infrastructure; common first-party foundations such
as FVG, MA/SMA, BSL/SSL, and Fibonacci become built-in Core Plugins; other
plugins may derive through declared public capabilities; and an Obsidian-like,
host-rendered Plugin Center is delivered in bounded trust phases. The accepted
spec allocates no implementation step. General-futures scope, Setup/AI design,
arbitrary code, remote registry operation, commercialization, and paid
Marketplace remain unresolved in this memo.

### 2026-08-10 — Plugin Interface And Language Amendment

The product owner supplied Chrome extension, Obsidian Core/Community Plugin,
and TradingView parameter-panel references and requested one plugin-bearing
interface, an explicit platform-versus-plugin order, and one language. The
accepted ADR amendment now governs: all sources use one validation/staging
pipeline; Developer Mode may load/reload/pack an unpacked package; the host
renders package/default/instance parameter schemas; executable authors use
strict TypeScript compiled to pinned ESM; JSON/JSON Schema carries declarations;
and P0a plus the FVG reference vertical slice precede the visual catalog and
external distribution phases. The exact implementation remains unauthorized.

### 2026-08-11 — Agent Authoring And Pine Migration Amendment

After accepting R13.10e/H114, the product owner required future developers to
be able to author complete plugins with AI coding agents through software-
provided Harness and MCP surfaces, and required an AI-assisted path for
migrating Pine indicator source into plugins. ADR-V7-004 now promotes these
outcomes with strict boundaries: the deterministic machine-readable Developer
Kit/CLI/Harness is canonical; MCP is a workspace-bounded local adapter rather
than a second validator or lifecycle owner; and Pine is parsed as authorized
input to generate an ordinary strict-TypeScript package, compatibility report,
tests, and provenance after the target SDK/Worker tier exists. Strategies,
future-leaking or unsupported repaint/realtime semantics, unmediated external
data, and unreviewed equivalence fail closed. No implementation delivery is
authorized by this amendment.

### 2026-08-11 — P1a Closure And P1b Specification Acceptance

The two preceding sections preserve what their amendments authorized at those
checkpoints; they are not the current delivery ledger. P0a/H113, P0b/H115, and
P1a/H116 were later separately specified, authorized, implemented, and
accepted. The product owner then authorized correction of the stale P1a status
language and drafting, but not implementing, P1b. After detailed review, all
five material decisions in `V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md` were
explicitly accepted. The specification defines non-executing local package
admission and authoring-only MCP; it does not promote this memo's remaining
registry, Worker, Pine-runtime, general-futures, or Marketplace questions and
does not authorize P1b code.

### 2026-08-12 — Partial Promotion By ADR-V7-006

The product owner accepted all ten Plugin Contribution Profile and composition
decisions. A Plugin Package is now a lifecycle container rather than a truth
type; Profile-governed Contributions have one primary truth/lifecycle Profile;
capabilities and Domain Tags remain orthogonal; multi-Contribution packages and
typed host-resolved dependency composition are supported; and unknown Profiles
fail closed while host-owned records survive unresolved. Calculated series,
anchored studies, Drawings, Semantic Artifacts, and detectors are the initial
reference Profiles but not a closed enum. New Profiles require separately
accepted host contracts and cannot be self-registered by packages.

ADR-V7-006 acceptance authorizes no SDK/schema registry, runtime, Community
execution, or implementation. At that checkpoint ADR-V7-005 calculated-series
projection remained under review and was later accepted as recorded below.
General-futures scope, complete Setup/AI design, remote registry,
commercialization, and paid Marketplace remain unresolved in this memo.

### 2026-08-12 — Partial Promotion By ADR-V7-005

After ADR-V7-006 acceptance, the product owner accepted all eight revised
calculated-series projection decisions. Main and internal Chart Regions are
user-owned placement targets rather than Indicator types; calculated-series
Contributions use standard Plots and independently placeable Plot Groups;
Scale compatibility is structural; exact snapshot/cutoff frames cannot show
stale output; instance/layout/unresolved state remains host-owned; and Core and
future Community Contributions claiming the same Profile share one semantic
contract while trust changes execution and resource policy.

ADR-V7-005 acceptance authorizes no Profile registration, SDK/runtime work,
MA/SMA or other Indicator implementation, Community execution, P1b.4, or H117
acceptance. General-futures scope, complete Setup/AI design, remote registry,
commercialization, and paid Marketplace remain unresolved in this memo.

### 2026-08-19 01:46 PDT — Trading-School Scope Narrowed

After reviewing a broad trading-school survey, the product owner stated that
V7 may abandon support for schools assessed as requiring medium-high or lower
architectural fit. This memo translates that directional cutoff into stable
capability language rather than persisting a subjective score as product data.

The current recommendation retains SMC/ICT as the primary product and preserves
compatibility only for time-based OHLCV discretionary research which fits the
existing calculated-series, anchored-study, Drawing, Semantic Artifact,
detector, Setup/Study, Replay, and Chart-owner contracts. Brooks-style price
action and ordinary bar-based trend research may fit that envelope without
becoming promised first-party packs. Wyckoff-specific phase/point-and-figure,
Elliott alternative-count hierarchy, Market/Volume Profile special data and
rendering, CAN SLIM fundamentals, quantitative/portfolio systems, and order-
flow/HFT/execution receive no first-class support commitment.

This scope amendment does not close the memo, alter the binding SMC/ICT product
scope, remove generic capabilities, amend an accepted ADR, allocate a delivery
or Harness id, enable Community/Worker execution, start P1b.4, accept H117, add
a plugin, or authorize implementation.
