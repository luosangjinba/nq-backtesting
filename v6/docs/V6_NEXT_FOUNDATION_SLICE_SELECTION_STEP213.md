# V6 Next Foundation Slice Selection - Step 213

## Decision

Step 214 should implement **TF / Projection / Time Domain Unification
Readiness Audit**.

This is a bounded foundation slice. It should not add user-facing SMC/ICT
features yet. Its purpose is to turn the recent architecture audit finding into
a concrete owner/interface plan before broader timeframe expansion, indicator
work, or strategy-specific overlays.

## Why This Slice

V6's current product direction is an SMC/ICT-focused backtesting/journal
workstation for subjective traders, especially prop firm traders. That product
still depends first on a reliable chart foundation:

- market data loading;
- timeframe switching;
- drag/scroll stability;
- leftward history extension;
- date range clarity;
- replay;
- multi-pane behavior.

The most important remaining foundation risk is not toolbar UI. It is that
timeframe parsing, timestamp parsing, and higher-timeframe projection rules are
still repeated across several modules.

Known risk areas:

- `display-timeframe/display-timeframe-projection.js` has a separate HTF bucket
  implementation;
- `chart-data-projection/chart-data-projection-domain.js` has the newer
  projection implementation used by key runtime paths;
- chart-entry, pane-reload, chart-history, replay, and bar-data modules each
  still normalize timeframe or timestamps locally;
- projection source summaries are repeated in several runtimes.

This is the same class of problem as the leftward-history bug: similar domain
rules scattered across owner modules eventually drift by timeframe, date, or
execution path. Step 214 should define the unified domain boundary before
touching more TF, indicator, or SMC/ICT overlay work.

## Owner Boundaries

- `bar-data` remains the owner of bounded data request windows and cache keys.
- `chart-data-projection` should remain the candidate owner for source-bar to
  display-bar projection.
- Replay remains the owner of cursor and reveal state.
- Chart viewport remains the owner of visible logical range intent.
- Shell/UI must not own timeframe math, timestamp parsing, projection, bar
  requests, replay cursor mutation, or chart series writes.
- Future SMC/ICT tools should consume stable chart/replay/journal contracts,
  not bypass foundation owners.

## Step 214 Scope

Implement TF / Projection / Time Domain Unification Readiness Audit:

- document the intended owner for timeframe parsing, timestamp parsing, and
  source-to-display projection;
- enumerate current duplicate implementations and classify them as keep,
  replace, wrap, or remove;
- define the smallest public interface needed before implementation;
- add static smoke coverage that guards the chosen next refactor target and
  blocks adding another independent HTF projection implementation;
- update TODO/session notes with explicit non-goals and the next executable
  implementation step.

## Non-Goals

- Do not rewrite projection implementation in Step 214.
- Do not add new supported timeframes.
- Do not add indicators, main/sub-pane indicator UI, or Pine Script support.
- Do not add SMC/ICT overlays such as liquidity, FVG, order block, market
  structure, or displacement tools yet.
- Do not implement trading, order tickets, prop firm rule engines, or
  pseudo-live simulation behavior.
- Do not move bar requests, replay cursor state, viewport intent, or chart
  series writes into shell or route modules.

## Acceptance

- The audit names the owner boundary for TF/projection/time rules.
- The audit points to the current duplicate implementations with file-level
  evidence.
- A smoke test guards the chosen scope and non-goals.
- Existing product-direction and boundary smokes pass.
