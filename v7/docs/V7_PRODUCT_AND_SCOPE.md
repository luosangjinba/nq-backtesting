# V7 Product And Rebuild Scope

Status: binding foundation decision (2026-07-19)

## Product Continuity

V7 keeps the accepted product direction: an open-source, local-first SMC/ICT
validation and replay-practice workstation. Replay quality remains a product
requirement. Free Practice and Validation Campaigns must share one foundation.

V7 is not a feature restart and not a rewrite of everything. It replaces the
unreliable replay/chart execution core while retaining reviewed product
decisions, V4 market-data/API capabilities, and reusable pure domain behavior.

## First-Class Semantic Dataset Product Output

The accepted product position in `ADR-V7-003` extends the validation outcome:
V7 is an evidence-grade semantic dataset production workstation for
discretionary trading research. A user-owned, AI-ready semantic annotation
dataset is a first-class output alongside the validation and deliberate-
practice workflow; it does not replace Replay as the primary controlled
observation environment.

The authoritative output is structured evidence over exact market anchors,
typed and versioned semantic entities/relations, mandatory no-future Replay
cutoffs, separate Observation/Interpretation/Decision/Outcome records, human
review provenance, and raw-chart drilldown. Screenshots, prose, flat tags, and
model responses may be useful derived material but cannot replace that source
evidence.

V7 remains local-first and user-owned. This product decision does not turn V7
into a market-data vendor, screenshot grader, automatic signal product,
general-purpose annotation platform, hosted SaaS, shared corpus, or proprietary
AI model. Dataset Builder, AI, Research/Training/Trading Review, hosting,
multi-user collaboration, and commercial distribution each require a separate
accepted contract and implementation authorization.

## Accepted Core And Community Extension Model

ADR-V7-004 in `V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md` accepts an
Obsidian-like Core/Community product taxonomy without broadening the current
SMC/ICT scope. FVG, MA/SMA, BSL/SSL, and Fibonacci are built-in first-party
Core Plugin capabilities with stable versioned baselines. Other first-party or
Community Plugins may derive from their public capabilities through declared
dependencies; they may not control Kernel owners or one another directly.

Kernel Session, Replay, Bar Data, Chart, Workspace transaction, persistence,
and module-lifecycle owners remain non-plugin infrastructure. The future
host-rendered Plugin Center, local installation, free Community registry,
isolated calculation tier, and any paid Marketplace are separate phases with
no current delivery authorization. Core classification does not make a
semantic variant consensus truth or move optional feature code into Kernel.

The accepted plugin authoring model is one strict TypeScript SDK producing
pinned ESM artifacts. Trusted Core output may enter the first-party build;
external executable output may run only in an authorized isolated Worker tier.
JSON/JSON Schema carries manifests and host-rendered declarative Inputs/Style/
Visibility settings. V7 does not expose Python, Pine Script, arbitrary plugin
DOM, or WASM as parallel initial plugin models. A thin built-in-package
contract and FVG reference vertical slice precede the visual Core Center and
external distribution phases.

## Current Resolution And Simulation Boundary

The current product is minute-sourced historical Replay with registered higher
timeframe projections. Second-level bars, raw-tick navigation, simulated order
execution, fill modeling, and simulated-live scoring are not phase-one
requirements. V7 remains a valid validation and deliberate-practice product
without them.

Second-level Replay is deferred rather than permanently rejected. It may be
reconsidered only after current human acceptance closes and the activation
signals, data economics, training outcome, and measured performance in
`V7_SECOND_LEVEL_REPLAY_TICK_DATA_PREDECISION_MEMO.md` are satisfied. No
second Replay runtime, Chart writer, or client cache owner may be created; any
future seconds-capable path must extend the existing registered capability and
Bar Data ownership boundaries.

## Why V7 Exists

V6 manual review repeatedly exposed systemic failures:

- one session could display another session's bars;
- delayed work could overwrite a newer activation;
- chart entry could remain empty in `Preparing replay...`;
- timeframe, ETH/RTH, and multi-pane changes exposed partial or stale state;
- cursor progress and chart-visible completion were not one transaction;
- mouse movement or resize could reveal pending chart state;
- fixes to one orchestration path regressed several others.

These failures make the V6 runtime graph an unsuitable base for further
patching. V7 must not preserve that graph for compatibility.

## Rebuild Boundary

Rebuild from clean contracts:

- session/workspace state and persistence;
- Replay cursor/reveal ownership;
- raw bar acquisition and cache ownership;
- session-hours eligibility and timeframe projection;
- atomic multi-pane projection transactions;
- chart snapshot application and visible completion;
- viewport intent and replay wall behavior.

Retain or adapt only after explicit review:

- product copy and interaction requirements;
- V4 API endpoints and timestamp/data contracts;
- vendor chart library;
- pure, table-driven calendar or aggregation fixtures whose expected behavior
  is independently re-approved;
- visual assets and stateless presentation components.

## Foundation Acceptance Order

1. Two distinct sessions never share state or bars.
2. One pane, one instrument, `1m`, ETH, Manual Next.
3. Timeframe switching and complete history.
4. ETH/RTH switching and common aggregation boundaries.
5. Atomic multi-pane restore and projection.
6. Pane-local instruments over one shared Replay clock.
7. Auto Replay and stable manual/default viewport walls.
8. Cache-hit latency, delayed cache miss, cancellation, and response reordering.

No later slice may compensate for a failed earlier slice.

## Professional UI From The First Visible Slice

V7 must not ship an engineering-demo shell and defer product quality. The first
browser-visible vertical slice uses the intended professional workstation
language and production states.

Required from the first visible slice:

- dense desktop trading-workstation layout with clear information hierarchy;
- shared design tokens for color, type, spacing, borders, elevation, motion,
  focus, and chart chrome;
- stable geometry during loading, switching, resize, and error recovery;
- explicit loading, empty, unavailable, stale, error, and retry states;
- pane-local refresh masks rather than unexplained blank canvases;
- responsive single/multi-pane composition at supported desktop sizes;
- keyboard navigation, visible focus, labels, contrast, and reduced motion;
- no debug timing text, placeholder controls, or raw internal errors in the
  customer surface;
- screenshot/visual-regression fixtures for every accepted visible state;
- perceived-latency review as well as measured transaction latency.

FXReplay can inform replay ergonomics and refresh behavior, but V7 owns a
coherent visual system rather than copying isolated screens.

## Human Acceptance Rule

Every committed step stops for manual review. An automated pass is necessary
but never marks a chart/replay step accepted. A rejected step is recorded as
rejected before replacement work begins.
