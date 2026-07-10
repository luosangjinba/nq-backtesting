# V6 Step 250 - Chart Foundation Next Slice Selection

Date: 2026-07-09

## Decision

Step 251 should implement **Multi-Pane Active Focus Chain Gate**.

This is a bounded chart-foundation UX/owner gate. It should consolidate and, if
needed, tighten the active-pane chain from visible pane focus to pane runtime,
top toolbar symbol/timeframe readouts, pane-local OHLC headers, and command
targeting.

## Why This Slice

Steps 245-249 closed the compact replay/transport regression pack, date-range
entry viewport alignment, and drag/scroll display stability. The remaining
foundation risk most aligned with the roadmap is primary/non-primary
multi-pane confusion:

- users need a clear visible marker for the active/focused pane;
- clicking or pointer-focusing a pane must update the active pane owner;
- top toolbar symbol and timeframe presentation must mirror the active pane
  without mutating inactive pane state;
- pane-local symbol, timeframe, and OHLC readouts must remain isolated;
- display-timeframe commands must target the active pane, not an implicit
  primary pane;
- focus/readout gates should be reusable before indicators, SMC/ICT overlays,
  trading simulation, or journal behavior are added.

There is already single-purpose coverage for active-pane outline, active pane
surface bridge, top symbol sync, display-timeframe active pane UI state, and
pane-local header isolation. Step 251 should make that chain explicit and decide
whether a compact browser gate or pack entry is missing.

## Owner Boundaries

- Chart surface owns chart host pointer activation and active-pane visual
  presentation on chart hosts.
- Pane runtime owns active pane state, pane instrument, and pane display
  timeframe state.
- Pane active surface bridge owns routing chart-host activation events to pane
  runtime commands.
- Shell top toolbar owns read-only symbol/timeframe presentation for the active
  pane.
- Display-timeframe control owns shell UI state and command target selection,
  but not chart-data replacement internals.
- Pane status readout owns pane-local DOM presentation for symbol, timeframe,
  and OHLC state.
- Chart-data runtime remains the only owner that writes pane-local bar series.
- Bar-data runtime remains the only owner that requests and caches bars.
- Replay runtime remains the owner of replay cursor/reveal state.

## Step 251 Scope

Implement Multi-Pane Active Focus Chain Gate:

- document or gate the active-pane focus chain from chart host pointer action
  through pane runtime and shell readouts;
- ensure visible active-pane outline/state and pane runtime active id agree;
- ensure toolbar symbol/timeframe mirrors the active pane only;
- ensure pane-local OHLC headers remain isolated across at least two panes;
- ensure display-timeframe command targeting follows the active pane;
- add a focused browser gate or compact pack if current coverage is too
  distributed;
- fix only the owning module if the gate exposes a regression.

## Non-Goals

- Do not redesign pane layout, resizing, or maximize/restore.
- Do not add interval sync behavior.
- Do not add new supported timeframes.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.
- Do not move chart-data, bar-data, replay, or pane runtime ownership into
  shell UI.

## Suggested Verification For Step 251

- `node v6/tests/multi-pane-active-focus-chain-step251-smoke.js`
- `node v6/tests/pane-active-visual-outline-browser-smoke.js`
- `node v6/tests/pane-active-surface-bridge-step207-smoke.js`
- `node v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js`
- `node v6/tests/pane-local-header-state-browser-step210-smoke.js`
- `node v6/tests/top-symbol-active-pane-browser-step212-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 251 has one active-pane focus/readout chain target.
- The selected slice stays inside chart foundation multi-pane UX and owner
  consistency.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 250.
