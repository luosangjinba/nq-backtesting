# V5 MVP Architecture Review

## Decision

Start V5 as a parallel frontend/runtime inside this repository.

V5 reuses stable V4 backend/data capabilities, but it does not continue the V4
frontend control model. The V5 frontend starts with a session-first FX Replay
flow and a strict runtime boundary system.

## Why V5

The recent FX Replay attempts showed that V4's frontend control ownership is too
diffuse for FX Replay semantics:

- date range loading can affect chart state;
- legacy replay can affect chart state;
- toolbar and UI controls can indirectly affect chart state;
- feature modules have accumulated direct knowledge of shared stores.

FX Replay requires a stricter model:

- the setup page creates a session;
- the chart page receives a session id;
- the replay runtime owns cursor and reveal state;
- the bar runtime owns loaded windows;
- the chart runtime is the only chart writer.

## MVP Product Scope

The MVP includes:

- default-user bootstrap;
- workspace and replay session model;
- FX Replay session setup page;
- chart replay page;
- initial replay loading: visible prefix plus start bar;
- no future bars in initial display state;
- Next/Play after initial loading is stable;
- viewport-driven older-prefix loading;
- smoke tests for architecture boundaries and replay invariants.

The MVP does not include:

- public login/register UI;
- subscription/billing;
- journal;
- analytics;
- order execution workflow;
- full annotation migration;
- prop-firm challenge logic;
- multi-pane charting;
- live trading.

## User And Data Ownership

V5 is multi-user by model from day one.

The first implementation can use a `default_user`, but user-owned records must
already be scoped correctly.

V5 is SaaS-ready, not SaaS-heavy, during the replay workstation MVP. This means
domain records and repositories must be shaped so they can move to a server
later, but public auth, billing, entitlement, and production multi-tenancy are
not part of the current MVP. Those systems should wait until replay, chart
interaction, orders, and journal workflows prove a repeatable training loop.

Minimum entities:

- `users`
  - `id`
  - `email` or `name`
  - `created_at`
- `workspaces`
  - `id`
  - `user_id`
  - `name`
  - `created_at`
- `replay_sessions`
  - `id`
  - `user_id`
  - `workspace_id`
  - `instrument`
  - `timeframe`
  - `session_start`
  - `session_end`
  - `status`
  - `created_at`
  - `updated_at`
- `replay_cursors`
  - `session_id`
  - `start_bar_timestamp`
  - `cursor_timestamp`
  - `revealed_count`
  - `updated_at`
- `chart_layouts`
  - `id`
  - `user_id`
  - `workspace_id`
  - `name`
  - `payload`
- future user-owned records:
  - `orders`
  - `journal_entries`
  - `annotations`
  - `preferences`

Rule: every user-owned record must contain `user_id` directly or belong to a
record that contains `user_id`.

Rule: feature modules must not couple directly to `localStorage` or future
server APIs. They use commands/events and runtime/repository contracts so the
storage backend can change without rewriting feature ownership.

## Runtime Boundaries

### App Shell

Owns:

- page bootstrap;
- module registration;
- lifecycle start/stop;
- top-level routing between setup and chart replay.

Does not own:

- bars;
- chart series;
- replay cursor;
- feature business state.

### Command Bus

Owns:

- command names;
- validation;
- command dispatch;
- command result/error shape.

Rule: UI and features change runtime state by dispatching commands, not by
importing runtime internals.

### Event Bus

Owns:

- event names;
- subscription;
- state-change notifications.

Rule: events notify; commands mutate.

### Chart Runtime

The only module allowed to write chart series.

Owns:

- chart instance lifecycle;
- series creation;
- `replaceBars`;
- `appendBars`;
- `clearBars`;
- visible range and viewport metrics;
- visual cursor markers.

Forbidden:

- requesting bars;
- deciding replay semantics;
- reading user/workspace persistence directly.

### Bar Data Runtime

The only module allowed to request K-line data.

Owns:

- bars API client usage;
- bounded request planning;
- cache keys;
- loaded windows;
- release/retention policy;
- dedupe and ordering.

Forbidden:

- writing chart series directly;
- advancing replay cursor;
- loading the whole replay session range for initial display.

### Replay Runtime

The only module allowed to own replay state.

Owns:

- active replay session id;
- session start/end;
- start bar timestamp;
- cursor timestamp;
- revealed forward range;
- prefix demand;
- Next/Play/Pause;
- no-future-bars invariants.

Forbidden:

- direct chart series writes;
- direct bars API calls outside bar data runtime;
- storing state in UI modules.

### Workspace Runtime

Owns:

- current user/workspace context;
- workspace preferences;
- layout persistence.

Forbidden:

- replay cursor progression;
- chart series writes.

### Layout Split Panes

Future split panes must be introduced through an explicit layout contract, not
by duplicating route-owned chart UI.

Rules:

- Layout runtime owns pane list, active pane id, and sync flags.
- Chart runtime owns chart host lifecycle, series writes, visible ranges, and
  follow/manual viewport state per pane.
- Replay runtime owns the shared replay cursor, reveal state, session bounds,
  and no-future invariant.
- Bar data runtime remains the only bars requester/cache owner.
- Settings target the active pane by default unless a shared/global scope is
  explicitly modeled.
- Route UI dispatches commands and renders active-pane controls; it must not
  directly create chart series, request pane bars, or persist layouts.

See `docs/specs/layout-split-panes-contract.md`.

### Feature Modules

Feature modules include setup page UI, replay toolbar, overlays, notes, journal,
orders, analytics, and future panels.

Allowed:

- render UI;
- dispatch commands;
- subscribe to events;
- keep local view state such as open/closed panels.

Forbidden:

- importing chart internals;
- importing bars API client directly;
- mutating replay runtime state directly;
- controlling another feature module directly.

## FX Replay Loading Law

Session setup:

1. The user selects instrument, timeframe, start, and end.
2. The app creates a replay session record.
3. Creating the session does not load the full date range into the chart.
4. The chart page receives only the session id.

Initial chart entry:

1. Resolve the start bar for `session_start`.
2. Load the start bar.
3. Estimate visible prefix demand from chart viewport.
4. Load only prefix bars needed for the visible viewport.
5. Render `prefix bars + start bar`.
6. Do not render or expose bars after the start bar.

Forward replay:

1. Next reveals exactly one active-timeframe bar.
2. Play repeatedly reveals one active-timeframe bar per tick.
3. The session stops at `session_end`.
4. Unrevealed future bars must not be visible display state.

Prefix replay:

1. Left pan creates older-prefix demand.
2. Bar data runtime loads bounded older chunks.
3. Replay runtime merges chunks as sparse windows.
4. Off-screen chunks may be released by explicit retention.
5. Prefix loading is not capped by fixed day counts.

## Forbidden Coupling

These patterns are forbidden in V5:

- UI calls chart series APIs directly.
- UI calls bars API directly.
- Feature imports another feature to mutate it.
- Feature keeps global session/replay state.
- Date range load populates full chart data before replay starts.
- Replay runtime stores a single full array from session start to session end.
- Chart runtime decides whether a bar is future/revealed.
- Bar data runtime decides replay cursor movement.

## Test Strategy

Boundary smoke tests must exist before feature implementation:

- UI cannot import chart runtime internals except through commands/events.
- Feature modules cannot import bars API client.
- Only chart runtime can call chart series write APIs.
- Only bar data runtime can call bars API client.
- Only replay runtime can mutate replay cursor state.

Behavior smoke tests:

- setup creates session without full-range chart load;
- initial replay loads prefix plus start;
- initial replay has no future bars;
- Next advances by one active-timeframe bar;
- Play advances by active timeframe;
- left pan loads older prefix;
- off-screen prefix release is observable.

Manual acceptance standards are recorded in `v5/TODO.md` for each step.

## Migration Strategy

V4 remains available while V5 is built.

Reuse from V4:

- backend K-line API behavior;
- data import and maintenance workflows;
- stable server utilities;
- relevant test fixtures and smoke helpers;
- lessons from the V4 chart adapter, not the old control flow.

Do not directly reuse:

- V4 legacy replay controls;
- V4 global bar store as the replay source of truth;
- V4 date range -> full chart load flow;
- feature modules that directly mutate chart/replay/global state.

Migration begins only after V5 proves the FX Replay core loop.

## Step 357 Closeout

Step 357 is complete when:

- V5 directory exists;
- architecture review is written;
- TODO defines the staged MVP path;
- session handoff records the decisions;
- git status is clean after commit.
