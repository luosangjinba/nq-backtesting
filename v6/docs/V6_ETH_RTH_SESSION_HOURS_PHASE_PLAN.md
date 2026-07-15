# V6 ETH/RTH Session Hours Phase Plan

## Decision

V6 must provide an explicit ETH/RTH chart and Replay mode before the next
product milestone closes. This is a core ICT/SMC analysis capability, not
optional FXReplay chrome parity.

The previously removed ETH toolbar element was an inert placeholder without an
owner. Delivery must begin with a Session Hours domain/runtime boundary and
must not restore a shell-only dropdown.

This work follows the Step 470 modularity audit and precedes the planned
multi-instrument pane implementation.

## Product Intent

- `ETH` presents the supported electronic trading session.
- `RTH` presents the supported regular trading session.
- Session Hours mode is shared by the active Replay Session and all visible
  panes; it is not a separate Replay cursor per pane.
- The mode affects which source bars are eligible for chart presentation and
  Replay progression, not merely candle CSS visibility.
- Changing mode must never expose a bar later than the shared Replay cursor.
- Evidence, orders, screenshots, and drillback context must retain the active
  Session Hours mode where it affects what the trader could see.

Initial product scope is NQ and ES. Exact exchange calendar, holiday, early
close, maintenance-break, and daylight-saving rules must be established from
the actual data/API timestamp contract during Phase A rather than inferred in
the shell.

## Ownership Contract

- `session-hours` owns mode normalization and bar-eligibility policy.
- `session-calendar` owns exchange-aware trading-day/session boundary rules.
- Replay remains the sole cursor, playback, and reveal-state owner.
- Bar Data remains the sole requester/cache owner and exposes source bars
  without UI filtering ownership.
- Chart Data owns pane-local materialized bars after applying the coordinated
  Replay/session-hours projection.
- Display Timeframe/target-history projection aggregates only the bars eligible
  under the active mode when that is the accepted Phase A semantic.
- Shell owns control DOM and dispatch only.
- Settings/persistence owns the durable preference after its storage scope is
  selected.

## Phase A - Exchange Calendar And Replay Semantics

Establish the canonical behavior before implementing a control.

Deliverables:

- verify the bars API timestamp/time-zone convention for NQ and ES;
- define ETH, RTH, weekend, maintenance-break, holiday, early-close, and DST
  eligibility rules;
- decide and document behavior when switching to RTH while the shared cursor is
  outside RTH;
- define Next, Previous, Play, Restart, Go-to, and evidence-drillback behavior
  across excluded intervals;
- define intraday and higher-timeframe aggregation semantics;
- define the persistence and provenance scope of `sessionHoursMode`.

Recommended cursor rule:

- keep one monotonic source timestamp;
- RTH Next/Play advances directly to the next eligible RTH source bar rather
  than producing invisible Replay steps;
- switching ETH to RTH retains the cursor timestamp and shows only eligible
  bars at or before it;
- switching RTH to ETH may reveal previously hidden ETH bars only up to the
  existing cursor, never beyond it.

Gate:

- pure fixtures cover normal days, overnight boundaries, weekends, DST, a
  holiday/early-close example, and a cursor outside RTH;
- unsupported instruments fail explicitly;
- no shell, Replay, Chart Data, or Bar Data module owns exchange-hour constants.

## Phase B - Session Hours Domain And Runtime

Implement the owner and public contracts without UI.

Deliverables:

- `ETH`/`RTH` domain normalization and eligibility queries;
- commands/events for get/apply mode;
- a coordinated projection/replacement intent for all visible panes;
- race handling so stale ETH/RTH requests cannot overwrite a newer mode;
- explicit diagnostics for rejected/unsupported mode application.

Gate:

- mode changes do not create or mutate a second Replay cursor;
- all visible panes receive one coordinated mode revision;
- the current cursor, playback state, and no-future boundary remain valid;
- owner and boundary tests forbid direct shell-to-chart mutation.

## Phase C - Replay And Materialization Integration

Apply the policy consistently to historical and forward Replay behavior.

Deliverables:

- initial chart-entry materialization;
- Next, Previous, Play, Restart selection, and Go-to eligible-bar traversal;
- backward-window replacement and leftward-history behavior;
- source-gap and session-boundary handling;
- pane-local mixed-timeframe projection under one shared hours mode.

Gate:

- RTH playback never pauses on hidden overnight bars;
- Previous/Restart removes future bars from every visible pane;
- switching modes at an overnight cursor is deterministic;
- no pane displays an ineligible bar or a bar later than the Replay cursor;
- visible-candle latency remains within the accepted budget.

## Phase D - Higher-Timeframe And Calendar Integration

Make mode semantics consistent beyond raw `1m` display.

Deliverables:

- eligible-bar aggregation for supported minute/hour/day projections;
- target-history requests/materialization consistent with the active mode;
- day separators and trading-day labels consistent with Session Hours policy;
- cache/projection identity that cannot confuse ETH and RTH results.

Gate:

- the same cursor produces deterministic ETH and RTH candles at every supported
  timeframe;
- switching mode cannot reuse an incompatible projection cache entry;
- daily/session boundaries remain correct across DST and Globex roll.

## Phase E - Toolbar UI And Persistence

Restore a compact functional control through the new owner.

Deliverables:

- a top-toolbar ETH/RTH selector with clear current state;
- keyboard, focus, escape, and outside-click behavior;
- disabled/error presentation for unsupported instruments;
- durable restoration at the selected Session/workspace preference scope;
- mode visibility in relevant evidence and review surfaces.

Gate:

- the control dispatches commands and subscribes to state events only;
- hard reload restores the selected mode without revealing future bars;
- changing mode visibly updates every pane exactly once;
- the toolbar remains compact at supported viewport widths.

## Phase F - Acceptance And Milestone Gate

Required browser scenarios:

- NQ and ES on normal, overnight, weekend, DST, and holiday/early-close ranges;
- single-, two-, and three-pane layouts;
- same and mixed display timeframes;
- ETH to RTH and RTH to ETH while paused and playing;
- Next, Previous, Restart, Go-to, leftward history, hard reload, and evidence
  drillback;
- rapid toggling with delayed requests to prove stale-result rejection.

Milestone gate:

- focused Session Hours, canonical, exhaustive Node, static architecture, and
  browser suites pass;
- existing Replay/history latency threshold remains unchanged;
- human acceptance confirms that ETH/RTH behavior matches trader expectations;
- no placeholder-only control or undocumented exchange-hour fallback remains.

## Explicit Non-Goals

- arbitrary custom trading-session editors;
- independent ETH/RTH modes per pane in the first release;
- exchange coverage beyond the explicitly supported Session assets;
- tick-accurate market-open reconstruction from `1m` data;
- automatic ICT kill-zone or setup detection;
- using CSS-only hiding as the Replay/session-hours implementation.

## Delivery Order

Complete Phases A-F in order after Step 470. Each phase closes with focused
tests and an independent commit. Multi-instrument panes begin only after the
ETH/RTH milestone gate passes, because symbol-specific calendars and
Session-Hours-aware materialization are prerequisites for correct intermarket
Replay.
