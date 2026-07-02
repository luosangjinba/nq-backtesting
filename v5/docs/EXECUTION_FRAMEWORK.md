# V5 Executable Framework Plan

## 1. Background

V4 proved the product direction but also exposed a structural problem: chart
state, date range loading, legacy replay, toolbar behavior, and feature modules
can affect each other too easily.

The failed FX Replay attempts showed that the problem is not one missing patch.
The old frontend control model lets multiple modules compete for chart and
replay ownership. FX Replay requires a stricter runtime architecture.

V5 starts as a parallel frontend/runtime inside this repository. It reuses stable
backend/data capability from V4, but it does not inherit V4's frontend state
ownership.

## 2. Product Target

V5 starts with a session-first FX Replay flow.

User flow:

1. Open session setup page.
2. Select instrument, timeframe, start, and end.
3. Create replay session.
4. Enter chart replay page by session id.
5. Initial chart shows only visible prefix bars plus the start bar.
6. Start bar is the latest visible replay bar.
7. Future bars are revealed only by Next/Play.
8. Left drag requests older prefix windows on demand.
9. Off-screen windows can be released.

## 3. Non-Negotiable Architecture Principles

V5 must be modular, with features decoupled from the main framework.

Hard rules:

- UI modules dispatch commands and subscribe to events.
- UI modules do not directly mutate runtime state.
- Only `chart-runtime` writes chart series.
- Only `bar-data-runtime` requests and caches K-line data.
- Only `replay-runtime` owns replay cursor, reveal state, and no-future-bars
  invariants.
- Feature modules cannot directly control other feature modules.
- Creating a replay session cannot load a full date range into chart state.
- Date range means session boundaries, not preloaded chart history.

These rules are architecture constraints, not style preferences.

## 4. Runtime Ownership

### App Shell

Owns:

- bootstrapping;
- route shell;
- module registration;
- lifecycle start/stop.

Does not own:

- chart series;
- K-line requests;
- replay cursor;
- business feature state.

### Command Bus

Owns:

- command registry;
- command validation;
- command dispatch;
- result/error shape.

Events notify. Commands mutate.

### Event Bus

Owns:

- event names;
- subscriptions;
- state-change notifications.

Events cannot be used as hidden mutation channels.

### Chart Runtime

Owns:

- chart instance lifecycle;
- series creation;
- replace/append/clear bars;
- viewport metrics;
- visual replay cursor markers.

Forbidden:

- direct bars API calls;
- replay cursor decisions;
- session persistence decisions.

### Bar Data Runtime

Owns:

- bars API client usage;
- bounded request planning;
- loaded window cache;
- sparse chunk merge;
- retention/release policy.

Forbidden:

- chart series writes;
- replay cursor mutation;
- full-session preload for initial replay.

### Replay Runtime

Owns:

- active replay session id;
- session start/end;
- start bar timestamp;
- cursor timestamp;
- prefix windows;
- revealed forward windows;
- Next/Play/Pause;
- no-future-bars invariant.

Forbidden:

- direct chart series writes;
- direct bars API calls outside bar data runtime;
- UI-owned replay state.

### Workspace Runtime

Owns:

- current user;
- current workspace;
- preferences;
- layouts.

Does not own replay cursor or chart series.

### Layout Runtime

Future split panes require a dedicated layout boundary.

Owns:

- pane list;
- active pane id;
- pane sync flags;
- layout state that can later be persisted by workspace runtime.

Does not own:

- chart series;
- bars requests;
- replay cursor;
- Settings draft state.

### Feature Modules

Examples:

- session setup;
- replay toolbar;
- overlays;
- notes;
- orders;
- journal;
- analytics.

Allowed:

- render UI;
- hold local view state;
- dispatch commands;
- subscribe to events.

Forbidden:

- import chart internals;
- import bars API client directly;
- mutate replay runtime directly;
- control another feature directly.

## 5. Multi-User Baseline

V5 is multi-user by model from day one.

The first MVP may use a default user, but all user-owned records must already be
scoped to `user_id` or to a parent record that has `user_id`.

The implementation strategy is SaaS-ready, not SaaS-heavy. Keep ownership,
repositories, canonical replay time, and bounded data loading compatible with a
future hosted product, but do not introduce public auth, billing, entitlement,
or production multi-tenancy before the replay + order + journal training loop is
validated.

Minimum model:

- `users`
- `workspaces`
- `replay_sessions`
- `replay_cursors`
- `chart_layouts`

Future model:

- `orders`
- `journal_entries`
- `annotations`
- `preferences`

Rule: no user-owned global singleton state.

Rule: no feature module directly owns persistence. Local storage is an
implementation detail behind repositories/runtimes until server persistence is
introduced.

## 6. Documentation System

The documentation system exists to make every new AI session start from the same
project rules without loading noisy history.

Required structure:

- `AGENTS.md`: repository-level AI entrypoint and reading order.
- `v5/docs/INDEX.md`: V5 documentation map.
- `v5/docs/MVP_ARCHITECTURE.md`: architecture review.
- `v5/docs/EXECUTION_FRAMEWORK.md`: this executable plan.
- `v5/docs/adr/`: durable decisions and why they were made.
- `v5/docs/specs/`: stable rules that future work must preserve.
- `v5/docs/harness/`: executable guard strategy.
- `v5/sessions/`: step handoff records.
- `v5/TODO.md`: active step plan and acceptance standards.

Document loading rule:

- Load the entrypoint and the current step's relevant docs.
- Do not load all historical sessions by default.
- Do not treat temporary fixes as permanent rules.

## 7. Spec Policy

Specs are for stable decisions, not guesses.

Write a spec when:

- the decision has been validated;
- the rule will affect future implementation;
- repeating the decision in every new session would be wasteful;
- violating the rule would create real maintenance risk.

Do not write a spec for:

- one-off bug fixes;
- unvalidated UI preferences;
- temporary implementation details;
- decisions likely to change soon.

V5 specs that should exist early:

- runtime ownership boundaries;
- no full date range preload on session creation;
- no future bars in replay display state;
- multi-user ownership baseline;
- feature modules communicate through commands/events.

## 8. Harness Policy

Specs reduce error probability. Harnesses enforce rules.

Add a harness when:

- a rule is high-risk;
- AI may accidentally bypass it;
- violation is hard to see manually;
- the same category of mistake has happened before;
- the behavior is a core invariant.

V5 should prioritize harnesses for:

- UI cannot import chart internals.
- Feature modules cannot import bars API client.
- Only chart runtime can write chart series.
- Only bar data runtime can request bars.
- Only replay runtime can mutate cursor state.
- Session setup cannot trigger full chart date range load.
- Initial replay display cannot include future bars.
- Next advances exactly one active-timeframe bar.
- Left drag loads older prefix by viewport demand, not fixed day caps.

Harnesses do not need broad coverage metrics. They should guard critical
invariants.

## 9. Development Workflow

For each step:

1. Read `v5/docs/INDEX.md`.
2. Read only step-relevant docs/specs.
3. Inspect existing code before editing.
4. Implement one bounded step.
5. Add or update harnesses for any new invariant.
6. Run relevant tests and `git diff --check`.
7. Perform manual acceptance.
8. Update `v5/TODO.md` and session handoff.
9. Decide whether new specs or ADRs are needed.
10. Commit.

Large steps should be handled in a clean conversation to avoid context noise.

## 10. Execution Roadmap

### Step 358 - App Shell Skeleton

Build only the V5 shell.

Deliver:

- V5 static entry page;
- source directory;
- command bus;
- event bus;
- module registry;
- setup route;
- chart replay route;
- initial boundary smoke tests.

Manual acceptance:

- V5 opens without V4 frontend dependency.
- Routes switch correctly.
- No chart/bars/replay behavior exists yet.
- Boundary tests exist before features are added.

### Step 359 - Session And User Model

Add the default-user multi-user baseline.

Deliver:

- user/workspace/session/cursor schema;
- default user/workspace bootstrap;
- create/list/get session API;
- frontend session runtime contracts;
- persistence smoke.

Manual acceptance:

- session can be created and loaded by id;
- session belongs to user/workspace;
- UI cannot write session state directly.

### Step 360 - Session Setup Page

Build the FX Replay setup flow.

Deliver:

- instrument selector;
- timeframe selector;
- start/end date-time controls;
- create session command;
- route to chart by session id.

Manual acceptance:

- setup resembles FX Replay's create-session flow;
- creating session does not load full K-line range;
- chart route receives only session id.

### Step 361 - Chart Runtime Foundation

Build the only chart writer.

Deliver:

- chart initialization;
- replace/append/clear commands;
- viewport metric reader;
- boundary tests against direct chart writes.

Manual acceptance:

- chart renders injected test bars;
- no feature can call series APIs directly.

### Step 362 - Bar Data Runtime

Build the only bars requester/cache owner.

Deliver:

- bars API wrapper;
- bounded request planner;
- window cache;
- retention/release primitives;
- no-full-range preload harness.

Manual acceptance:

- runtime loads bounded windows;
- no initial replay path can request full session range.

### Step 363 - FX Replay Initial Load

Implement the first real replay behavior slice.

Deliver:

- resolve start bar;
- load viewport-sized prefix;
- render prefix plus start through chart runtime;
- no-future-bars invariant;
- real-data browser smoke.

Manual acceptance:

- start bar is latest visible replay bar;
- prefix bars exist when data exists;
- no future bars are displayed or exposed;
- different viewport widths can request different prefix counts.

### Step 364 - Replay Navigation

Implement controlled forward reveal.

Deliver:

- Next;
- Play/Pause;
- stop at session end;
- right-bound clamp.

Manual acceptance:

- 1M advances by one minute;
- 5M advances by five minutes;
- 1H advances by one hour;
- unrevealed future is not visible.

### Step 365 - Prefix Demand And Retention

Implement left-drag older-prefix loading and memory control.

Deliver:

- viewport demand detection;
- older prefix chunk requests;
- sparse merge;
- off-screen release.

Manual acceptance:

- left drag can continue loading older prefix until data availability ends;
- no fixed day caps;
- runtime state shows retained vs released windows.

## 11. V4 Relationship

V4 remains available as legacy/reference.

Reuse:

- backend bars API behavior;
- data import and maintenance logic;
- server utilities;
- useful test helpers and fixtures.

Do not reuse directly:

- legacy replay controls;
- V4 global bar store as replay source of truth;
- date range to full chart load flow;
- feature modules that mutate chart/replay/global state directly.

V5 may study V4 code, but V5 must not copy V4's ownership model.

## 12. Success Definition

The V5 framework is successful when:

- a new AI session can read the docs and understand the boundaries quickly;
- features can be added without editing core runtime internals;
- chart writing has one owner;
- bars loading has one owner;
- replay cursor has one owner;
- critical architecture rules are enforced by harnesses;
- FX Replay initial load behaves like the intended FX Replay model;
- later features can plug into runtime commands/events without taking control of
  the framework.
