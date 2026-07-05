# V6 Readiness Audit

Date: 2026-07-05

## Decision

V6 is ready to leave boundary-baseline work and enter a bounded UI/workflow
phase. The next phase should remain command-driven and should not reopen V5's
replay viewport architecture.

## Ownership Snapshot

- Replay cursor and reveal state: `v6/src/replay/`.
- Bar requests, window planning, and cache: `v6/src/bar-data/`.
- Pane-local chart bars and no-future filtering: `v6/src/chart-data/`.
- Viewport intent and projection ownership: `v6/src/chart-viewport/` plus pure
  helpers in `v6/src/viewport/`.
- Pane records and active pane state: `v6/src/panes/`.
- Layout mode and sync flags: `v6/src/layout/`.
- Display timeframe projection: `v6/src/display-timeframe/`.
- Default/manual wall replay coordination: `v6/src/default-wall/`.
- Settings state: `v6/src/settings/`.
- Persistence adapter/repository/runtime: `v6/src/persistence/`.
- Journal state and supplied-record analytics: `v6/src/journal/`.
- Journal persistence bridge: `v6/src/journal-persistence/`.

## V5 Failure Classes

### Visible K-Line Delay

Covered by executable gates:

- `v6/tests/visible-latency-domain-smoke.js`
- `v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `v6/tests/default-wall-replay-browser-smoke.js`
- `v6/tests/manual-wall-replay-browser-smoke.js`
- `v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`

The important invariant is that cache-hit Next must prove the database/API is
not on the visible candle path. If cursor state advances but the latest candle
does not become visible within the latency gate, the browser smoke should fail.

### Primary/Non-Primary Multi-Pane Confusion

Covered by executable gates:

- `v6/tests/boundary-smoke.js`
- `v6/tests/pane-model-smoke.js`
- `v6/tests/multi-pane-chart-host-browser-smoke.js`
- `v6/tests/chart-viewport-pane-manual-isolation-smoke.js`
- `v6/tests/display-timeframe-pane-isolation-smoke.js`
- `v6/tests/multi-pane-manual-wall-browser-smoke.js`

The important invariant is that panes share one record shape and all chart data,
viewport intent, display timeframe, and manual wall behavior are pane-local.
There is no primary/non-primary state split.

## Bridge And Persistence Rules

- Persistence writes are opt-in commands.
- Journal snapshot save/load/delete is a bridge runtime, not a journal runtime
  side effect.
- Loading a journal snapshot mutates only journal entries.
- Persisted records do not restore chart, replay, data, viewport, pane, layout,
  or settings state.

## Required Gates Before UI/Workflow Expansion

Run these before starting the next implementation phase:

- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

## Next Bounded Target

Step 27 should add a UI/workflow readiness surface, not broad visual polish. The
target should expose existing runtime state and commands without adding new
state ownership:

- surface runtime readiness and active gates in the workstation shell;
- dispatch only existing commands;
- do not add chart/replay/data/viewport mutation paths from UI modules;
- keep the visible-latency and multi-pane browser gates in the verification
  chain.
