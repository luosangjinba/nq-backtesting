# V6 Chart Foundation Re-prioritization - Step 143

Date: 2026-07-07

## Decision

Step 143 supersedes the Step 142 Comparison Symbol Owner Contract direction.

The next phase should prioritize chart foundation work over additional
top-toolbar placeholder owner contracts. Comparison symbols, trading/account
behavior, theme, fullscreen, session-hours, and similar workstation chrome
features remain deferred until the core chart path is dependable.

The chart foundation priority order is:

1. database-backed bounded K-line import through the bar-data owner path;
2. leftward historical K-line extension, where dragging the chart toward older
   bars requests the next bounded older window until the data source is
   exhausted;
3. replay K-line chart flow, including initial load, no-future filtering,
   cursor advance, and browser-visible candle checks;
4. reset view behavior through chart-viewport ownership;
5. multi-pane chart flow through the existing pane model, without
   primary/non-primary ownership paths.

## Selected Slice

Step 144 should establish the database K-line import boundary for V6.

The slice should:

- identify the local database source, available schema, and query boundaries;
- keep bar-data runtime as the only owner that requests and caches bars;
- define a database bars adapter interface that returns the same normalized
  window shape expected by the existing bar-data runtime;
- keep all requests bounded by existing bar window rules and limits;
- preserve leftward chart extension: when the visible range reaches the oldest
  loaded bars, the chart flow should request an older bounded window through
  bar-data and keep extending left until the data source reports no older bars;
- add tests that prove session creation and chart entry do not load a full date
  range;
- avoid chart series writes, chart overlays, replay cursor mutation, viewport
  mutation, multi-pane UI, simulated trading, comparison symbols, and
  additional workstation chrome behavior.

If the database schema is not ready or cannot be discovered locally, Step 144
should record the gap and select the smallest fixture-backed adapter seam that
keeps the same bar-data ownership boundary.

## Lightweight Charts Check

Lightweight Charts supports built-in series types and a plugin system with
custom series and primitives. Those APIs are useful for future chart rendering,
drawing, annotations, and comparison visuals, but they do not change the
ownership decision for Step 144. Database K-line import belongs in the
bar-data adapter/runtime path, and chart-engine remains the only owner of chart
series writes.

The awesome-tradingview ecosystem confirms that TradingView-related tools and
plugins exist, but no external chart plugin should be introduced before the V6
database/replay/reset/multi-pane foundations are stable.

## Ownership Boundary

Allowed for Step 144:

- data-source/schema discovery;
- a focused database bars adapter or adapter contract;
- bar-window bounded query planning;
- an explicit older-window/exhausted-history response shape for leftward chart
  extension;
- bar normalizer compatibility tests;
- smoke coverage that chart entry remains bounded.

Forbidden for Step 144:

- enabling comparison symbol controls;
- enabling simulated trading controls;
- adding order placement, positions, or PnL behavior;
- adding Lightweight Charts custom series, primitives, plugins, or overlays;
- writing chart series outside chart-engine;
- requesting/caching bars outside bar-data;
- mutating replay cursor outside replay runtime;
- mutating viewport intent outside chart-viewport runtime;
- adding multi-pane UI or primary/non-primary state paths.

## Acceptance For Step 144

- database K-line import boundary smoke passes;
- bar-data runtime smoke passes;
- chart entry context/window planning smoke passes;
- older-window/exhausted-history boundary smoke passes or is explicitly scoped
  into the database import boundary smoke;
- replay runtime smoke passes;
- chart-data no-future filtering smoke passes;
- chart viewport/reset-view smoke or contract smoke passes;
- existing chart presentation re-audit smoke passes;
- boundary smoke passes;
- dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Verification

- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step142-smoke.js`
- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
