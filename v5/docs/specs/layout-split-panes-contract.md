# Layout Split Panes Contract

Phase: Phase 3 - Real Chart Interaction.

Phase gate: users can navigate chart time intentionally without breaking replay
reveal boundaries or causing implicit bar loads outside the bar data runtime.

## Scope

Step 460 defines the contract for future Layout split panes before any
multi-pane UI or runtime implementation begins.
Step 461 adds the first layout runtime skeleton: it registers layout commands,
keeps the default `primary` pane state, supports active-pane selection inside
known panes, and leaves multi-pane rendering disabled.
Step 462 formalizes the supported layout modes as `single`, `twice`, and
`triple`, and adds the five FXReplay-style sync toggles as layout state:
symbol, interval, crosshair, time, and date range.

This is a planning contract, not an implementation step.

In scope:

- pane identity and active-pane semantics;
- initial MVP split shape;
- chart/replay/bar-data/runtime ownership;
- Settings scope;
- viewport and crosshair sync defaults;
- forbidden coupling before implementation.

Out of scope:

- rendering multiple chart panes;
- adding a working Layout menu;
- persistence UI for layouts;
- multi-symbol replay sessions;
- order, journal, drawing, or annotation overlays;
- server-backed layout storage.

## MVP Shape

The first implementation should be conservative:

- keep the current single pane as `primary`;
- introduce a layout state that can represent `single`, `twice`, or `triple`;
- keep arbitrary/custom grids out of scope while preserving a mode/pane model
  that can be extended later;
- default to independent pane viewport state unless sync is explicitly enabled;
- default to one replay session shared by all panes.

Do not implement FXReplay/TradingView-style arbitrary layout grids until the
bounded three-mode model is stable.

Step 461 implementation status:

- `layout.getState` returns the current layout state;
- `layout.setActivePane` changes active pane only when the target pane exists;
- default app layout is single mode with one `primary` pane;
- chart route reads layout state for route metadata but still renders one pane;
- Layout button remains disabled/deferred.

Step 462 implementation status:

- layout modes are `single`, `twice`, and `triple`;
- mode validation requires exactly 1, 2, or 3 panes respectively;
- sync toggles live on root layout state, not on individual panes;
- sync toggles default off;
- `symbol` sync is modeled but should remain disabled in UI while replay
  sessions are single-instrument.

## Pane Model

A pane record should be serializable and persistence-ready:

- `id`: stable pane id such as `primary` or `secondary`;
- `role`: `primary` or `secondary`;
- `instrument`: display instrument for that pane;
- `displayTimeframe`: chart display timeframe for that pane;
- `presentationSettings`: pane-level presentation settings or a reference to a
  shared preset;
- `viewport`: chart-owned visible range/follow state for that pane;

Root layout state also contains `sync`:

- `symbol`: symbol changes on all panes in the layout. In current V5 replay,
  this is modeled but disabled in UI because sessions are single-instrument.
- `interval`: chart display timeframe changes on all panes in the layout.
- `crosshair`: crosshair position is synchronized across all panes.
- `time`: when one pane is clicked or navigated to a point in time, all panes
  display that same point of time.
- `dateRange`: visible date range changes on all panes in the layout.

The route may know the active pane id for focus and command targeting, but it
must not become the owner of pane chart data, bar requests, or replay reveal
state.

## Ownership

- Layout runtime owns layout state, pane list, active pane id, and sync flags.
- Chart runtime owns chart host lifecycle, chart series writes, visible ranges,
  and viewport/follow state per pane.
- Bar data runtime remains the only owner of bar requests and cache windows.
- Replay runtime owns the single replay cursor, reveal state, session bounds,
  and no-future display invariant.
- Presentation runtime owns normalized chart presentation settings.
- Route UI dispatches layout/chart/presentation/replay commands and subscribes
  to events.

Workspace runtime may later persist layout records, but persistence is not part
of the first split-pane implementation.

## Settings Scope

Settings must be pane-aware before new pane-specific controls are added:

- current chart presentation settings apply to the active pane by default;
- shared/global settings must be explicitly labeled and modeled as shared;
- pane-specific settings must be stored under that pane or a referenced preset;
- opening Settings reads from the active pane's presentation state;
- confirming with `Ok` dispatches presentation/layout commands for the active
  pane only unless a shared-scope control is explicitly selected;
- `Cancel`, close, and backdrop dismiss continue to discard route-local draft
  state without mutating runtimes.

Template/preset behavior remains deferred until workspace persistence rules are
defined.

## Sync Rules

Initial defaults:

- replay cursor is shared across panes;
- no pane can reveal future bars beyond the shared replay cursor;
- date range sync is off by default;
- crosshair sync is off by default;
- interval sync is off by default except for explicit active-chart interval
  sync between chart display timeframe and replay transport interval;
- symbol sync is off and UI-disabled while replay sessions are
  single-instrument;
- time sync is off by default;
- Settings target the active pane.

When sync is enabled later:

- sync commands must be explicit layout runtime commands;
- chart runtime may mirror visible ranges only through chart commands/events;
- replay runtime still does not own chart visible ranges;
- bar requests still go through bar data runtime;
- duplicate viewport demand across panes must be deduped by cache/request keys.

## Forbidden

- Route UI directly creating or destroying chart series for panes.
- Route UI directly requesting bars for a pane.
- Pane UI importing chart runtime, bar data runtime, replay runtime, or
  chart-engine internals.
- Chart runtime deciding replay cursor or reveal state.
- Replay runtime writing chart series or visible ranges.
- Bar data runtime deciding active pane or replay cursor.
- Treating Settings draft state as persisted pane state before `Ok`.
- Adding pane-specific Settings controls before active pane scope exists.
- Implementing split panes by duplicating the current route body and letting
  each copy own runtime subscriptions independently.
- Persisting layouts directly from feature modules instead of a
  repository/runtime boundary.

## Verification

The first implementation step after this contract should add focused coverage
for:

- single-pane route still exposes `primary` as the active pane;
- layout state can represent `single`, `twice`, or `triple` without rendering
  extra chart series from route UI;
- active-pane timeframe commands target the active pane;
- Settings opens against active-pane presentation state and remains draft-only;
- replay cursor/reveal state remains shared and no-future across panes;
- feature modules still pass boundary smoke tests;
- viewport demand remains routed through replay/bar-data ownership.
