# Workstation Decision Backlog

Phase: Phase 3 - Real Chart Interaction, with cross-phase product direction
rules for local-first deployment and future persistence.

Phase gate: future chart/workstation work must start from documented decisions
instead of reconstructing recent conversation context.

## Purpose

This spec consolidates recent V5 product and engineering decisions that are
stable enough to guide future plans, but span multiple narrower specs.

Use this file before creating a new plan for:

- chart engine behavior;
- multi-pane layout;
- replay transport and playback performance;
- Settings and chart presentation controls;
- workstation visual polish;
- local/open-source deployment direction.

This file is a routing document. The detailed contract still belongs in the
specific spec named by each decision.

## Reference-First Rule

Before planning or implementing chart/workstation behavior, check:

- official Lightweight Charts documentation;
- the awesome-tradingview ecosystem references;
- existing examples, plugins, or patterns that can be tested inside V5.

Use an existing capability when it can be validated without breaking V5
ownership rules. Build custom behavior only after the existing option proves
insufficient, too coupled, or incompatible with runtime boundaries.

Related docs:

- `v5/docs/vendor/lightweight-charts.md`
- `v5/docs/EXECUTION_FRAMEWORK.md`

## Product Direction

V5 is now an open-source/local-first replay workstation, not a SaaS-first
product.

Target deployments:

- local desktop;
- LAN machine;
- VPS;
- terminal server;
- later Docker/Compose or similar repeatable packaging.

Future persistence and deployment work should prioritize:

- local profile/workspace/session ownership;
- backup and restore;
- import and export;
- configuration files or local database/file storage;
- extension/plugin paths that fit an open-source project.

Do not prioritize public login, billing, hosted entitlement, hosted market-data
metering, or production multi-tenancy unless the roadmap is explicitly changed.

Related docs:

- `open-source-local-deployment.md`
- `product-review-loop.md`
- `MVP_ARCHITECTURE.md`

## Multi-Pane Decisions

Multi-pane layout remains bounded to:

- `single`;
- `twice`;
- `triple`.

Variants may express orientation or large-pane placement, but arbitrary
TradingView-style layout grids stay out of scope until the bounded model is
stable.

Rules:

- There is always exactly one active pane.
- Toolbar controls are shared route controls. They reflect the active pane when
  the target value is pane-local.
- The TF dropdown is shared by all panes. It displays the active pane's
  timeframe and changes only the active pane unless `sync.interval` is enabled.
- Shared chart navigation controls such as Go to and Jump cursor also target
  the active pane when the action is pane-local.
- Pane TFs are independent by default. They synchronize only when
  `sync.interval` is enabled.
- The five sync toggles are `symbol`, `interval`, `crosshair`, `time`, and
  `dateRange`.
- `symbol` sync can remain modeled but UI-disabled while replay sessions remain
  single-instrument.
- Every real chart pane should expose equivalent chart chrome when enabled:
  OHLC overlay, TF label, price axis, time axis, reset view, active-pane border,
  and crosshair behavior.
- Interactive controls and popovers inside pane DOM must not bubble into pane
  selection and accidentally change the active pane.
- Split resizing is ratio-based. Layout state stores responsive ratios, not
  fixed pixel widths or heights.
- Split resize must clamp panes to a minimum wall so panes cannot disappear.

Related docs:

- `layout-split-panes-contract.md`
- `workstation-visual-system.md`

## Replay And Viewport Decisions

Replay remains shared by session, but chart display state can be pane-local.

Rules:

- Replay runtime owns cursor, reveal state, session bounds, and no-future
  invariants.
- Bar-data runtime is the only module that requests and caches bars.
- Chart runtime is the only module that writes chart series.
- Pane-local chart display can include timeframe, visible range, viewport
  follow/manual state, interaction state, prefix demand, and viewport demand.
- Pane-local viewport demand must carry `paneId` through chart runtime and
  replay display loading.
- Primary playback must not rewrite secondary/tertiary panes that already own
  pane-local display state.
- Rapid Next clicks should be coalesced into a single replay command with
  `stepCount`.
- Visible reveal on Next should not wait for cursor persistence. Runtime state
  and chart display update first; persistence patches state afterward.
- Same-timeframe Next can use append/update paths when bars form a pure append;
  fallback to full replacement only when range/crop/order safety requires it.

Related docs:

- `layout-split-panes-contract.md`
- `fx-replay-controls-ui.md`
- `fx-replay-viewport-follow.md`
- `chart-interaction-contracts.md`

## Reset View Decision

Reset view means both time recovery and price recovery.

Rules:

- Reset targets the active pane unless a command explicitly targets another
  pane.
- Reset restores viewport follow / latest replay time.
- Reset also restores price visibility through adapter-owned price-scale
  autoscale behavior.
- UI must dispatch runtime commands; it must not call Lightweight chart APIs
  directly.

Related docs:

- `chart-interaction-contracts.md`
- `fx-replay-viewport-follow.md`

## Pane-Local Viewport Demand Decision

Multi-pane panes must behave like single panes for viewport extension.

Rules:

- A non-primary pane's viewport demand must include `paneId` and route through
  replay runtime and bar-data runtime.
- Non-primary display-window loading must merge with the target pane's existing
  display bars, not the global primary replay display state.
- Chart runtime may return a replay-readable pane snapshot through commands,
  but route UI must not read chart internals, write series, or request bars.
- Pane-local display bars returned for replay merge must expose stable
  timestamps even if chart runtime internally stores chart-format `time`.
- Manual range, wheel zoom, drag, and active-pane TF changes must not require a
  mouseup/click stimulus before left-extension demand can load missing bars.
- Primary pane display/replay state remains unchanged when a secondary/tertiary
  pane fills its own viewport gap.

Related docs:

- `layout-split-panes-contract.md`
- `fx-replay-viewport-follow.md`
- `chart-interaction-contracts.md`

## Active-Pane Control Intent Decision

Shared toolbar controls target the active pane, so active-pane intent must be
visible to those controls immediately.

Rules:

- Pane selection remains owned by layout runtime, but route UI may apply an
  optimistic active-pane snapshot for controls while the runtime command is in
  flight.
- The optimistic state must be derived from the current layout state and must
  be reconciled with the official `layout.setActivePane` result.
- Shared controls such as TF, Go to, Jump cursor, and Reset must read the
  latest active-pane intent, not a stale previous pane, during fast user
  interactions.
- Feature UI must not use optimistic pane selection to write chart series,
  request bars directly, or bypass layout runtime persistence.

Related docs:

- `layout-split-panes-contract.md`

## Settings And Visual System Decisions

V5 should feel like a professional FXReplay-like workstation, but the UI system
must stay engineered rather than decorative.

Rules:

- Settings uses the FXReplay modal pattern: left navigation, grouped right-side
  settings, and bottom `Cancel` / `Ok`.
- Settings edits are draft route UI state until `Ok`.
- `Cancel`, close, and backdrop dismiss discard draft edits.
- Settings target the active pane by default when the setting is pane-local.
- Shared/global scope must be explicitly modeled before a Settings control can
  affect every pane.
- UI styling should consume V5 semantic CSS tokens instead of spreading
  one-off colors, radii, shadows, and control dimensions.
- shadcn/ui is a component-engineering reference, not a current dependency.
- `ui-ux-pro-max` or similar design tools may inform review, but production
  changes must be translated into V5-owned tokens, markup, commands, and
  browser checks.

Related docs:

- `workstation-visual-system.md`
- `chart-presentation-settings.md`
- `SETTINGS_BACKLOG_MATRIX.md`

## V4 Reference Rule

V4 can be used for behavioral and performance comparison, especially where it
already solved a replay interaction problem.

V5 must not copy V4's old frontend ownership model. When V4 is useful, extract
the behavior or performance lesson and reimplement it through V5 runtime
boundaries.

## Planning Requirements

Future plans should include:

- which decision in this backlog they implement or protect;
- which detailed spec owns the behavior;
- whether Lightweight Charts or awesome-tradingview references were checked;
- why an existing capability was used or rejected;
- the runtime boundary that owns the state mutation;
- the smoke/browser check that proves the decision still holds.

## Out Of Scope

- Removing the detailed specs this file points to.
- Implementing deployment packaging.
- Implementing arbitrary chart grids.
- Adding public account or billing infrastructure.
- Adding direct UI calls to Lightweight APIs.
