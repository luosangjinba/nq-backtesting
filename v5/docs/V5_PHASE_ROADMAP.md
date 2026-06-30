# V5 Phase Roadmap

This roadmap keeps V5 development aligned with the FX Replay rewrite goal. It
groups steps by product/architecture phase so local UI observations do not turn
into random implementation order.

## Roadmap Rules

Every new V5 step must declare:

- the phase it belongs to;
- the specific phase gate it advances;
- the non-goals it will not solve;
- the smoke/browser checks that prove it did not violate runtime boundaries.

If a useful idea is outside the current phase, record it under the target phase
instead of implementing it immediately. Do not add a feature because it is
visible in FXReplay unless it closes a current phase gate or is explicitly
promoted by updating this roadmap.

## Phase Gates

A phase is not complete because all planned code exists. It is complete only
when:

- the user-facing workflow behaves correctly enough for the next phase;
- ownership boundaries are covered by tests;
- important behavior has a spec or session handoff;
- `v5/scripts/smoke_all.js` passes;
- the next phase can proceed without redesigning the previous phase.

## Phase 0 - Architecture Foundation

Status: complete.

Goal: create a V5 runtime that does not inherit V4's frontend ownership model.

Delivered:

- app shell;
- command/event bus;
- module registry;
- route lifecycle;
- session/user/workspace model;
- chart runtime as the only chart writer;
- bar data runtime as the only bars requester/cache owner;
- replay runtime as the only replay cursor/reveal owner;
- boundary smoke tests.

Related steps:

- Step 357: MVP architecture and bootstrap.
- Step 358: app shell skeleton.
- Step 359: session and user model.
- Step 361: chart runtime foundation.
- Step 362: bar data runtime.
- Step 367: runtime boundary tightening.

Gate:

- Feature modules cannot directly write chart series, request bars, own replay
  cursor, or control each other.

## Phase 1 - Replay MVP Core

Status: mostly complete.

Goal: make a replay session load and progress without exposing future bars or
full-date-range chart state.

Delivered:

- session setup flow;
- initial replay load;
- prefix plus start bar;
- Next/Play/Pause/Reset;
- cursor persistence and restore;
- no-future display invariant;
- bounded bar loading.

Related steps:

- Step 360: session setup page.
- Step 363: FX Replay initial load.
- Step 364: replay navigation.
- Step 366: replay controls UI.
- Step 368: replay usability and state persistence.

Gate:

- A user can create a session, enter replay, advance one bar at a time, reset,
  leave, and return without future bars leaking into display state.

## Phase 2 - Viewport And Display Semantics

Status: in progress.

Goal: separate data reveal state from chart viewport presentation so V5 behaves
like a replay chart, not a static list of revealed bars.

Delivered:

- prefix demand and retention;
- viewport display cache;
- display timeframe switching;
- replay progression projection;
- display timezone contract;
- chart presentation settings foundation.

Related steps:

- Step 365: prefix demand and retention.
- Step 369: viewport-based multi-timeframe display cache.
- Step 370: viewport demand runtime wiring.
- Step 371: replay progression display projection.
- Step 372: chart display timezone contract.
- Step 373: chart presentation settings foundation.

Remaining phase gate:

- Step 374 target: replay viewport follow / rolling visible window.

Gate:

- `displayBars` can retain revealed history, but the chart viewport follows the
  replay cursor with right-side offset and lets older bars roll out of view.
- Manual viewport movement has an explicit rule for whether auto-follow remains
  active or pauses.
- Timezone, time format, status fields, margins, and chart labels are governed
  by presentation settings instead of one-off feature state.

Out-of-phase backlog:

- Full settings template system belongs to Phase 6.
- Rich drawing tools belong to Phase 5.
- Order and journal overlays belong to Phase 4.

## Phase 3 - Real Chart Interaction

Status: pending Phase 2 gate.

Goal: make the chart interaction surface feel like a usable replay workstation.

Planned:

- true visible-range drag and zoom;
- crosshair readout;
- axis labels and tooltip formatting;
- go-to time;
- stable right/left pan behavior;
- replay toolbar polish after viewport follow is correct.

Gate:

- A user can navigate chart time intentionally without breaking replay reveal
  boundaries or causing implicit bar loads outside the bar data runtime.

## Phase 4 - Trading And Journal MVP

Status: pending Phase 3 gate.

Goal: add the core trading simulator and journal workflow.

Planned:

- place order model;
- order markers;
- position and PnL state;
- account balance display;
- journal entry tied to replay cursor;
- news/economic event baseline.

Gate:

- Orders and journal entries are tied to canonical replay time and remain stable
  under timezone, timeframe, and viewport changes.

## Phase 5 - Review And Annotation Tools

Status: pending Phase 4 gate.

Goal: reintroduce high-value review/study tools from V4 without importing V4's
coupled ownership model.

Planned:

- chart notes;
- drawing tools;
- order review;
- evidence/segment/PDA-style study tools;
- selective V4 workflow migration through V5 contracts.

Gate:

- Annotation state has a clear owner, renders through chart runtime boundaries,
  and does not mutate replay/bar runtime state directly.

## Phase 6 - Persistence, Templates, And Multi-user Maturity

Status: pending earlier gates.

Goal: turn the MVP into a durable multi-user workspace.

Planned:

- persisted user/workspace chart settings;
- chart presentation templates;
- layout persistence;
- import/export;
- server-backed multi-user boundaries;
- collaboration-ready data model hardening.

Gate:

- A user can leave and return to a workspace with replay, chart presentation,
  journal, orders, and layouts restored through explicit storage contracts.

## Step Selection Protocol

Before starting a new V5 step:

1. Identify the current active phase and open gate.
2. State why the step advances that gate.
3. Move unrelated ideas to the appropriate phase backlog.
4. Keep the step bounded enough to commit substeps independently.
5. Add or update smoke/browser coverage before closing the step.

Current active phase: Phase 2.

Current recommended next step: Step 374 - Replay viewport follow / rolling
visible window.
