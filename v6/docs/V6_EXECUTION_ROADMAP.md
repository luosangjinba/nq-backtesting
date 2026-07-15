# V6 Execution Roadmap

## Purpose

This roadmap follows the useful formation order from V5 while moving V6 gates
earlier for the two known V5 failure classes:

- visible K-line delay;
- primary/non-primary multi-pane confusion.

V6 should advance in small executable steps. Each step must leave a testable
boundary, not just a working UI symptom.

## Phase 0 - Startup Governance

### Step 1 - Skeleton And Contracts

- app shell;
- command bus;
- event bus;
- runtime lifecycle registration;
- contract modules;
- boundary smoke forbidding V5 runtime imports.

Gate:

- `v6/index.html` boots;
- commands mutate and events notify;
- no chart/replay/data coupling exists yet.

### Step 2 - Product Baseline Shell

- FXReplay-like chart route shell;
- compact header/footer;
- floating transport placeholder;
- no real chart engine yet.

Gate:

- screenshot smoke verifies the first usable screen is a workstation surface,
  not a landing/demo page.

## Phase 1 - Replay Data Core

### Step 3 - Session Model

- local default profile/workspace;
- replay session creation;
- in-memory repository first.

Gate:

- session create/get smoke;
- no chart/bar-data ownership inside session runtime.

### Step 4 - Bar Data Runtime

- V4 bars API adapter;
- bounded window request planning;
- in-memory window cache;
- forward buffer metadata.

Gate:

- cache hit/miss tests;
- API timing metadata available;
- no chart/replay mutation in bar runtime.

### Step 5 - Replay Runtime

- load initial session;
- start/end/cursor/revealed state;
- Next/Play/Pause/Reset;
- no chart calls inside replay runtime.

Gate:

- replay cursor state tests;
- no-future reveal tests;
- replay can run without chart engine.

## Phase 2 - Chart Data And Viewport Intent

### Step 6 - Unified Pane Model

- one pane record shape;
- default pane id only;
- active pane id;
- static audit forbidding primary/non-primary stores.

Gate:

- single pane uses same model future panes use;
- no `primaryState` / `secondaryState` style split.

### Step 7 - Viewport Intent Domain

- default wall intent;
- manual wall intent from measured logical range;
- cursor advance updates intent cursor only;
- projection to engine logical range.

Gate:

- pure tests for latest offset and span preservation;
- no DOM, chart engine, replay, or bar-data dependency.

### Step 8 - Chart Data Runtime

- pane-local chart bars;
- append/replace chart bars;
- no-future filtering;
- chart bars revision metadata.

Gate:

- append/replace does not mutate viewport intent;
- no replay cursor or bar-data ownership.

### Step 9 - Chart Viewport Runtime

- owns viewport intent per pane;
- consumes replay cursor notifications;
- reapplies current intent after chart data revisions.

Gate:

- data append/replace cannot reset wall origin/revision;
- default and manual wall use the same projection path.

## Phase 3 - Real Chart And Visible Latency

### Step 10 - Chart Engine Adapter

- Lightweight adapter lifecycle;
- `setData` / `update`;
- `setVisibleLogicalRange`;
- native visible logical range measurement;
- test metadata for latest offset/span.

Gate:

- adapter smoke asserts logical range writes directly;
- adapter stores no durable viewport intent.

### Step 11 - Visible Latency Harness

- browser harness for input-to-candle-visible timing;
- phase timings: input, command received, bar available, chart update requested,
  candle visible;
- cache hit/miss split.

Gate:

- cache-hit Next test proves DB/API is not on the visible path;
- failures identify data latency vs frontend/chart latency.

### Step 12 - Single-Pane Default Wall Replay

- initial prefix plus start bar;
- Next/Play from default wall;
- append/update fast path where possible.

Gate:

- latest candle stays on default wall;
- old candles push left;
- p95 visible latency under threshold.

### Step 13 - Manual Wall Replay

- native drag left/right creates manual wall;
- wheel creates manual wall;
- Play/Next preserves manual wall.

Gate:

- latest candle stays at manual wall;
- display-window loading cannot alter viewport intent;
- browser tests assert logical offset/span, not only cursor text.

## Phase 4 - FXReplay Baseline Completion

### Step 14 - Replay Transport Controls

- floating transport;
- Play/Pause/Next;
- speed presets;
- keyboard shortcuts.

Gate:

- controls dispatch commands only;
- visible latency gate still passes.

### Step 15 - Chart Status And OHLC

- top-left OHLC;
- footer status;
- no-future progress/readouts.

Gate:

- status is read-only;
- no chart/replay mutation from status UI.

### Step 16 - Display Timeframe Single-Pane

- active pane timeframe;
- display projection;
- no-future higher timeframe handling.

Gate:

- TF change does not reset viewport intent unless explicit reset/follow;
- latency gate still passes.

## Phase 5 - Multi-Pane Only After Gates

### Step 17 - Layout Runtime Skeleton

- layout mode;
- pane list;
- active pane id;
- sync flags.

Gate:

- adding panes uses same pane record shape;
- no primary/non-primary state split.

### Step 18 - Multi-Pane Chart Hosts

- mount multiple chart hosts through one host lifecycle path;
- pane-local chart data and viewport intent.

Gate:

- same-timeframe Next updates all panes from one coordinated fan-out;
- no secondary event catch-up path.

### Step 19 - Mixed Timeframe Panes

- pane-local timeframe projection;
- interval sync only by explicit sync intent.

Gate:

- active-pane TF does not leak into inactive panes;
- mixed-TF Next visible latency is measured separately.

### Step 20 - Pane-Local Manual Walls

- manual wall on one pane;
- other panes keep their own intent.

Gate:

- drag/wheel on one pane does not mutate another pane's viewport intent;
- multi-pane visible latency remains gated.

## Phase 6 - Target Timeframe Data Infrastructure

Only after the existing display-timeframe and replay-gap gates are stable:

- target timeframe data contract and schema discovery;
- server/data-layer aggregation for supported minute, hour, daily, weekly, and
  monthly bars;
- bar-data runtime support for target-TF windows and cache metadata;
- display-timeframe and leftward-history paths that request target bars for
  high-timeframe browsing;
- replay coordination that keeps source `1m` bars as the cursor/no-future/gap
  authority.

Gate:

- high-timeframe leftward history uses target bars instead of large frontend
  `1m` aggregation windows;
- replay cursor movement and no-bar gap skipping remain source-driven;
- browser-visible chart interactions stay responsive while older high-TF
  history loads.

## Phase 7 - Foundation Closeout And Practice Quality

Only after Phase 6 gates pass:

- configured Next Day Open / Next Session / named-session replay navigation;
- Settings parity starts with Step 409 transactional modal semantics, one
  durable/versioned Settings owner, and an honest active surface. The planning-
  only Step 409.5 then defines the complete four-tab catalog, scopes, owner
  routing, and accepted/deferred/rejected fields before more controls become
  active. Production Steps 410-415 implement bounded Canvas, Symbol, Status,
  and Scales slices; Step 416 adds workstation-wide timezone and 12/24-hour
  presentation constrained by
  `v6/docs/V6_GLOBAL_TIME_FORMAT_SETTINGS_CONTRACT.md`; Step 417 closes the
  Settings expansion sequence by rejecting templates, Apply to all, and
  per-Pane Settings overrides. See
  `v6/docs/V6_SETTINGS_CATALOG_ARCHITECTURE_STEP409_5.md`;
- visual polish;
- persistence;
- preserve V5-quality Free Practice replay ergonomics without importing V5
  runtime ownership.

Gate:

- foundation regression packs and human replay acceptance remain green;
- Go-to advances replay cursor/reveal only through an explicit replay-
  navigation coordinator; chart-only inspection remains a separate concern;
- Settings Cancel/close/Escape cannot publish or persist a draft, reload
  restores committed preferences, and no active control lacks a real consumer;
- time format and display timezone remain independent presentation settings,
  while canonical timestamps and `HH:mm` navigation values remain unchanged;
- product work can attach without bypassing chart/replay/bar-data owners.

## Phase 8 - Free Practice Product Baseline

- low-ceremony practice session creation/resume;
- simulated trade plan/order lifecycle appropriate to `1m` data;
- optional drawings, notes, and post-session review;
- journal evidence references back to chart context.

## Post-Stabilization Product Selection — Step 461

The stabilized workstation is conditionally ready for a product thin slice.
Do not build three separate mode shells or begin Semantic Drawing first. The
selected sequence is the generic Validation Campaign loop in
`V6_FIRST_VALIDATION_VERTICAL_SLICE_PLAN_STEP461.md`. Its implementation is
blocked until Step 462 restores the repeated Manual Next/leftward-history
latency failure; the domain/persistence spine then begins at Step 463.

Step 462 restored that gate with a 98.5 ms canonical concurrency sample and a
14/14 named suite. Step 463 is the current product-entry target.

Free Practice remains protected on the same Replay foundation. The validation
workflow may add required fields and provenance, but it may not fork chart,
Replay, viewport, bar-data, layout, or persistence ownership by mode.

Gate:

- a user can complete a useful replay-practice session without creating a
  validation campaign;
- practice artifacts do not mutate replay/chart owners directly;
- `1m` execution limitations are explicit rather than presented as tick-accurate.

## Phase 9 - Validation Campaign Vertical Slice

Implement one thin loop before a broad ICT ontology or dashboard:

- versioned playbook plus falsifiable campaign hypothesis;
- blind replay trial;
- one generic prospective setup observation;
- one planned entry/stop/target and simulated outcome;
- R calculation and one small aggregate;
- result drilldown to the original replay-visible chart evidence.

Gate:

- evidence stores replay cursor/no-future provenance;
- prospective and retrospective artifacts are distinguishable;
- aggregate results expose raw trials and sample size;
- the same replay/chart/runtime owners serve Free Practice and Validation;
- 30-50 real trials demonstrate useful recording speed and trustworthy
  drilldown before semantic expansion.

## Phase 10 - Structured SMC/ICT Extension

Only after the Phase 9 gate:

- versioned user-extensible concepts such as FVG, OB, sweep, displacement,
  bias, session, and liquidity target;
- richer distributions, filters, rule-adherence and evidence review;
- plugin surfaces for community taxonomies and overlays;
- optional fine-grained market-data windows behind the bar-data provider
  boundary if practice evidence justifies them.

Do not start with automatic concept recognition, AI analysis, or a detached
analytics dashboard.

## Permanent Stop Conditions

Do not proceed to the next phase if:

- cache-hit Next has visible delay;
- a replay path updates cursor but candle appears late without a failing test;
- any primary/non-primary state split appears;
- display-window loading changes viewport intent;
- append/replace owns follow/manual behavior.
- validation mode forks replay/chart/bar-data ownership;
- aggregate statistics cannot drill down to immutable raw trials;
- retrospective annotations are counted as prospective evidence without an
  explicit distinction;
- `1m` outcomes are presented as tick-accurate execution.
