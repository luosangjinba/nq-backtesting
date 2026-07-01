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

SaaS direction: V5 should stay SaaS-ready without becoming SaaS-heavy too early.
Until the replay training loop is validated, new work should preserve
user/workspace ownership and server-replaceable storage boundaries, but defer
public auth, billing, production multi-tenancy, and entitlement systems.

Product north star: V5 serves two core review workflows:

- Historical Replay Review: no-future-information replay for pattern
  recognition, patience, and decision practice.
- Live Execution Review: review of past real-time execution quality, separating
  process correctness from PnL outcome.

These workflows can share one chart surface. Historical replay state, simulated
decisions, actual orders/fills, execution notes, annotations, evidence, and
process-quality tags should be modeled as artifacts over shared chart context
and canonical time, not as separate chart products.

The review loop should continue after the chart session: statistics, analysis,
and decision support should convert structured review artifacts into practice
priorities, behavior-pattern feedback, and better next-session decisions. AI can
be considered later as an assistant over this structured evidence, not as a
replacement for the review model.
Dashboard and visualization work belongs in this downstream layer: it should
show review-derived metrics, distributions, timelines, and drilldowns that help
the trader inspect data and decide what to change.

New steps should state which workflow they advance, or why the work is necessary
shared infrastructure for the review loop. Historical Replay Review and Live
Execution Review are the product center, not later add-on modules.

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

Status: ready for Phase 3.

Goal: separate data reveal state from chart viewport presentation so V5 behaves
like a replay chart, not a static list of revealed bars.

Delivered:

- prefix demand and retention;
- viewport display cache;
- display timeframe switching;
- replay progression projection;
- display timezone contract;
- chart presentation settings foundation.
- replay viewport follow with rolling visible chart windows.

Related steps:

- Step 365: prefix demand and retention.
- Step 369: viewport-based multi-timeframe display cache.
- Step 370: viewport demand runtime wiring.
- Step 371: replay progression display projection.
- Step 372: chart display timezone contract.
- Step 373: chart presentation settings foundation.
- Step 374: replay viewport follow / rolling visible window.
- Step 375: Phase 2 closeout and Phase 3 entry plan.

Gate:

- `displayBars` can retain revealed history, but the chart viewport follows the
  replay cursor with right-side offset and lets older bars roll out of view.
- Manual viewport movement has an explicit rule for whether auto-follow remains
  active or pauses: until Phase 3 implements real drag/zoom, auto-follow remains
  active after initial load, Next, Play, Reset, and display projection.
- Timezone, time format, status fields, margins, and chart labels are governed
  by presentation settings instead of one-off feature state.

Out-of-phase backlog:

- Full settings template system belongs to Phase 6.
- Rich drawing tools belong to Phase 5.
- Order and journal overlays belong to Phase 4.

## Phase 3 - Real Chart Interaction

Status: in progress.

Goal: make the chart interaction surface feel like a usable replay workstation.

Delivered in Phase 3 so far:

- true visible-range drag and zoom;
- Lightweight Charts timeScale/right-edge interaction tuning;
- crosshair readout;
- axis labels and tooltip formatting;
- go-to time;
- stable right/left pan behavior;
- replay toolbar polish after viewport follow is correct.
- compact workstation shell;
- floating replay transport, drag handle, previous/next/play, truncate pick
  mode, and manual replay viewport anchoring.

Still planned:

- Layout split panes with explicit multi-chart ownership and sync rules;
- richer chart settings organization;
- future order/journal overlays after the chart/replay surface is stable.

Gate:

- A user can navigate chart time intentionally without breaking replay reveal
  boundaries or causing implicit bar loads outside the bar data runtime.

Entry checklist:

- Completed: first Phase 3 step defined chart interaction runtime contracts for true
  visible-range drag/zoom.
- Completed: drag/zoom contracts decide how manual movement pauses replay
  auto-follow.
- Current next: plan Layout split panes before implementation because
  multi-chart ownership, active chart identity, replay interval sync, and
  viewport synchronization rules must be explicit.
- Chart runtime still owns visible range observation and chart rendering.
- Replay runtime still owns cursor, reveal state, and no-future display
  invariants.
- Bar data runtime remains the only source of `/v4/bars` requests.
- Toolbar polish, order/journal overlays, rich drawings, and full settings
  templates must wait until their target phases unless this roadmap is updated.
- SaaS infrastructure is not Phase 3 work. Interaction state should be designed
  so it can later be persisted, but public auth, billing, and server persistence
  remain out of scope.

## Phase 4 - Trading And Journal MVP

Status: pending Phase 3 gate.

Goal: add the core trading simulator and Live Execution Review workflow.

Planned:

- place order model;
- order markers;
- position and PnL state;
- account balance display;
- execution review entry tied to replay cursor and decision context;
- process-quality tags such as early entry, correct execution, stop too tight,
  hesitation, and profitable mistake;
- news/economic event baseline.

Gate:

- Orders and journal entries are tied to canonical replay time and remain stable
  under timezone, timeframe, and viewport changes.
- Orders and journal entries have explicit user/workspace/session ownership so
  they can move from local persistence to server persistence later.
- Actual orders/fills and replay decisions can coexist on the same chart context
  without creating a second chart ownership path.
- Live Execution Review separates process quality from PnL outcome so a winning
  trade can still be marked as an execution error and a losing trade can still be
  marked as correct execution.
- This phase validates the SaaS product thesis: Historical Replay Review plus
  Live Execution Review training history, not replay alone.

## Phase 5 - Review And Annotation Tools

Status: pending Phase 4 gate.

Goal: reintroduce high-value review/study tools from V4 without importing V4's
coupled ownership model.

Planned:

- chart notes;
- drawing tools;
- order review;
- evidence/segment/PDA-style study tools;
- topical Historical Replay Review and Live Execution Review comparison sets;
- statistics and analysis over review artifacts, tags, orders, and outcomes;
- visualization dashboards for review-derived metrics, distributions,
  timelines, and drilldowns;
- decision-support summaries that identify what the trader should practice or
  avoid next;
- selective V4 workflow migration through V5 contracts.

Gate:

- Annotation state has a clear owner, renders through chart runtime boundaries,
  and does not mutate replay/bar runtime state directly.
- Statistics and analysis consume structured review artifacts and canonical
  refs, not detached screen state or generic note blobs.
- Dashboards can drill from aggregate visualizations back to source chart
  moments, orders/fills, notes, evidence, and tags.

## Phase 6 - Persistence, Templates, And Multi-user Maturity

Status: pending earlier gates.

Goal: turn the MVP into a durable multi-user workspace.

Planned:

- server-backed workspace/session/order/journal persistence;
- auth and account identity;
- subscription and billing experiments only after the training loop has proven
  repeated value;
- market data entitlement, usage limits, and hosted cost controls;
- persisted user/workspace chart settings;
- chart presentation templates;
- layout persistence;
- import/export;
- AI-assisted review analysis over structured artifacts, evidence, tags, and
  statistics;
- server-backed multi-user boundaries;
- collaboration-ready data model hardening.

Gate:

- A user can leave and return to a workspace with replay, chart presentation,
  journal, orders, and layouts restored through explicit storage contracts.
- Hosted SaaS concerns are introduced behind existing repositories/runtimes
  without feature modules directly reading server APIs or persistence.
- AI assistance, if introduced, cites or references the underlying review
  artifacts it used and does not become an ungrounded generic chat surface.

## Step Selection Protocol

Before starting a new V5 step:

1. Identify the current active phase and open gate.
2. State why the step advances that gate.
3. Move unrelated ideas to the appropriate phase backlog.
4. Keep the step bounded enough to commit substeps independently.
5. Add or update smoke/browser coverage before closing the step.

Current active phase: Phase 3.

Current recommended next step: define the V5 Layout split-pane contract before
implementing multi-chart UI.
