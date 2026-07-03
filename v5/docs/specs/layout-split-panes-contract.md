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
Step 463 implements the first user-facing Layout command surface. It adds
layout mode/sync commands, enables the toolbar Layout popover, and updates
layout state only. It still does not render multiple chart panes.
Step 464 implements the multi-pane DOM shell. It renders one, two, or three
pane containers from layout state while keeping a single real primary chart
host and placeholder secondary/tertiary panes.
Step 465 makes chart host mounting pane-id aware. The route passes host
elements through chart commands, and chart runtime owns adapter lifecycle per
pane id.
Step 466 stores display timeframe on pane records and wires active-pane
timeframe changes through layout state before replay display reloads.
Step 467 stores pane-level time/date-range sync metadata and wires Go to,
Jump cursor, and chart visible-range events through layout commands.
Step 468 stores pane-level crosshair metadata, mirrors chart-owned crosshair
events through layout commands when `sync.crosshair` is enabled, and completes
the Step 463-468 multi-pane acceptance sequence.
Step 469 changes the Layout popover mode selector to an FXReplay-style icon
matrix while preserving the same layout command boundary.
Steps 470-472 continue the Layout work in layers: explicit variant state,
variant-driven pane shell layout, then real secondary/tertiary chart hosts.
Step 479 adds resizable split boundaries. Layout runtime stores split ratios,
pane shell renders responsive grid tracks from those ratios, and split dragging
clamps adjacent panes so neither side can collapse.
Step 480 hardens active-pane TF semantics. The toolbar keeps one shared TF
dropdown, and its value follows the focused pane instead of adding one TF
control per pane.
Step 481 makes active-pane TF changes pane-local at the chart display layer:
secondary and tertiary panes can load a different TF without rewriting primary
or the global replay display context.
Step 482 hardens pane-local viewport demand after those TF changes: drag/zoom
events on a secondary pane keep their pane id through chart runtime and replay
display loading, and primary playback updates do not rewrite panes with
pane-local display state.
Step 483 hardens the shared replay advancement path used by single-pane and
multi-pane layouts. Forward bars may be cached only in bar-data runtime, rapid
Next clicks are coalesced into a single `stepCount`, and replay runtime renders
only the final display state for a multi-step advance.
Step 484 removes storage latency from the visible Next-bar reveal. Replay
runtime writes the in-memory cursor/display state and chart bars before waiting
for cursor persistence, then patches `persistedCursor` after persistence
resolves.

This is a planning contract, not an implementation step.

Step 491 adds `workstation-decision-backlog.md` as the routing spec for recent
multi-pane decisions before later implementation plans. This file remains the
detailed owner for split-pane layout, active-pane, sync, pane-local viewport,
and resize behavior.

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

Step 463 implementation status:

- `layout.setMode` changes layout runtime mode and normalizes panes for
  `single`, `twice`, or `triple`;
- `layout.setSync` changes root layout sync flags;
- the chart route Layout button opens a compact popover with Single, Twice,
  Triple, and the five sync switches;
- `symbol` sync is visible but disabled in the UI while sessions remain
  single-instrument;
- switching layout mode updates route metadata only and still renders one real
  chart host.

Step 464 implementation status:

- the chart route owns a `data-layout-pane-shell` that reflects layout mode,
  active pane id, and pane count;
- `single`, `twice`, and `triple` render one, two, or three pane containers;
- only the `primary` pane contains the real `data-chart-host`;
- secondary/tertiary panes are placeholders until chart runtime supports
  pane-id-aware host mounting;
- pane selection dispatches `layout.setActivePane` and updates active-pane
  metadata without requesting bars or writing chart series.

Step 465 implementation status:

- chart runtime exposes `chart.mountHost`;
- mounted chart hosts/adapters are tracked by pane id;
- mounting the same host for the same pane is idempotent;
- replacing a host for an existing pane destroys the previous adapter;
- viewport metrics can target a pane id;
- route UI passes the primary host through `chart.mountHost` and still does not
  create adapters, write chart data, or request bars.

Step 466 implementation status:

- layout runtime exposes `layout.setPaneDisplayTimeframe`;
- pane records store `displayTimeframe`;
- with `sync.interval` off, timeframe changes update only the selected pane;
- with `sync.interval` on, timeframe changes copy to all panes;
- chart route display timeframe controls update layout state first;
- primary replay display reload remains routed through replay runtime and
  bar-data runtime.

Step 467 implementation status:

- pane records store `time` and `dateRange`;
- layout runtime exposes `layout.setPaneTime` and
  `layout.setPaneDateRange`;
- with sync off, time/date-range changes update only the selected pane;
- with `sync.time` or `sync.dateRange` on, changes copy to all panes;
- Go to and Jump cursor update pane time through layout commands;
- chart visible-range events update pane date range only when
  `sync.dateRange` is enabled;
- chart runtime remains the owner of visible ranges and replay runtime remains
  the owner of cursor/reveal state.

Step 468 implementation status:

- pane records store `crosshair`;
- layout runtime exposes `layout.setPaneCrosshair`;
- with sync off, crosshair changes update only the selected pane;
- with `sync.crosshair` on, changes copy to all panes;
- chart runtime remains the owner/source of crosshair events;
- chart route mirrors normalized crosshair metadata into layout only when
  `sync.crosshair` is enabled;
- crosshair sync does not write chart series, request bars, or mutate replay
  cursor/reveal state;
- browser acceptance covers layout switching, active pane selection, interval
  sync, time/date-range sync, crosshair sync, and boundary smokes.

Step 469 implementation status:

- the Layout popover uses icon buttons grouped by `1`, `2`, and `3`;
- icon buttons still dispatch through the existing layout command surface;
- orientation-specific icons currently map to bounded modes until Step 470
  models explicit layout variants.

Steps 470-472 planned implementation sequence:

- Step 470 models explicit layout variants:
  `single.default`, `twice.vertical`, `twice.horizontal`, `triple.vertical`,
  `triple.horizontal`, `triple.left`, `triple.right`, `triple.top`, and
  `triple.bottom`;
- Step 471 applies those variants to the pane shell with CSS/DOM layout while
  keeping secondary/tertiary panes as placeholders;
- Step 472 mounts real secondary/tertiary chart hosts through chart runtime and
  only after the variant state and visual shell are stable.

Step 470 implementation status:

- layout state stores `variant` alongside `mode`;
- `mode` remains the pane-count category: `single`, `twice`, or `triple`;
- `layout.setMode` accepts explicit variants and normalizes mode/pane count
  from the variant;
- Layout icon buttons dispatch stable `data-layout-variant-option` values;
- invalid variants and mode/variant mismatches are rejected by layout runtime;
- route metadata exposes the selected variant while host count remains one.

Step 471 implementation status:

- pane shell exposes `data-layout-variant`;
- CSS grid renders the supported variant geometries;
- `twice.horizontal` renders stacked panes;
- `triple.left` renders a larger left primary pane with secondary/tertiary on
  the right;
- secondary/tertiary panes remain placeholders and still do not contain
  `data-chart-host`;
- browser smoke verifies geometry, active-pane metadata, and host count.

Step 472 implementation status:

- secondary/tertiary panes render real `data-chart-host` elements when layout
  state requires them;
- route UI passes all pane hosts through `chart.mountHost`;
- chart runtime owns adapter creation, reuse, replacement, and disconnected
  host cleanup;
- mounted pane hosts receive the current chart runtime display state through
  existing host sync;
- replay cursor/reveal state and bar-data requests remain outside route UI;
- browser smoke verifies two hosts for `twice.*`, three hosts for `triple.*`,
  replay initial no-future behavior, viewport follow behavior, and boundary
  rules.

Step 482 implementation status:

- chart runtime stores pane-local visible range, viewport follow, interaction,
  prefix demand, and viewport demand alongside pane-local bars/display context;
- native Lightweight drag/zoom callbacks carry the mounted pane id into manual
  visible-range handling;
- pane-local viewport demand includes `paneId`;
- replay viewport-demand wiring de-dupes by pane id and passes `paneId` to
  `replay.loadDisplayWindow`;
- primary/global replay bar replacement syncs only primary and non-overridden
  panes, so a pane-local secondary/tertiary chart is not rewritten on every
  playback step.

Step 483 implementation status:

- initial start-bar resolution requests a bounded forward reveal window instead
  of only two bars, caching future source bars in bar-data runtime only;
- bar-data runtime can satisfy a planned window from a larger cached same
  instrument/timeframe window by slicing cached bars;
- replay `next` batches `stepCount > 1` into one cursor persistence update and
  one chart render at the final cursor;
- chart replay controls coalesce rapid Next clicks into one batched command;
- browser regression verifies ten rapid Next clicks advance ten bars without
  issuing additional forward bars requests after initial load.

Step 484 implementation status:

- replay `next` updates cursor/display state and chart output before awaiting
  `session.updateCursor`;
- replay `next` updates `persistedCursor` after persistence resolves;
- regression coverage delays cursor persistence and verifies chart bars are
  already updated while persistence is still pending;
- no-future display rules remain unchanged because the in-memory cursor moves
  before newly revealed bars are written to chart/display state.

Step 479 implementation status:

- layout runtime exposes `layout.setSplitRatio`;
- split state is stored as pane ratios, not pixel widths/heights;
- adjacent split drags are clamped to a 15/85 wall so each pane remains
  visible and usable;
- pane shell renders `fr` grid tracks from layout ratios and only dispatches
  layout commands;
- browser smoke verifies stacked split handles, minimum-wall clamping, chart
  resize metrics, and multi-pane axis/chrome visibility.

Step 480 implementation status:

- the toolbar keeps a single `data-display-timeframe-select`;
- selecting a pane updates the dropdown to that pane's `displayTimeframe`;
- changing the dropdown updates only the active pane when `sync.interval` is
  off;
- changing the dropdown updates all panes when `sync.interval` is on;
- browser smoke verifies the shared-control behavior without adding per-pane
  TF dropdowns.

Step 481 implementation status:

- chart runtime accepts optional `paneId` for bars and display context writes;
- chart host sync resolves pane-local bars/display context per mounted host;
- replay display loading can render a non-primary pane without mutating global
  replay display state;
- active-pane TF changes reload the target pane through replay runtime;
- browser smoke verifies a right-side `twice.vertical` pane can change TF while
  the left pane and global replay display TF stay unchanged.

## Pane Model

A pane record should be serializable and persistence-ready:

- `id`: stable pane id such as `primary` or `secondary`;
- `role`: `primary` or `secondary`;
- `instrument`: display instrument for that pane;
- `displayTimeframe`: chart display timeframe for that pane;
- `presentationSettings`: pane-level presentation settings or a reference to a
  shared preset;
- `viewport`: chart-owned visible range/follow state for that pane;

Root layout state should also carry:

- `mode`: bounded pane-count category, currently `single`, `twice`, or
  `triple`;
- `variant`: specific layout geometry, such as `twice.horizontal` or
  `triple.left`.
- `split`: responsive pane split state. The first implementation stores
  normalized `ratios` by pane id and must not persist fixed pixel dimensions.
  UI drag gestures update adjacent pane shares through `layout.setSplitRatio`,
  and the runtime clamps those shares to a minimum wall.

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

## Implementation Roadmap

Steps 463-468 should proceed in this order:

1. Step 463 - Layout popover command surface. Completed.
   Add `layout.setMode` and `layout.setSync`; enable a compact Layout popover
   with Single, Twice, Triple, and the five sync switches. `symbol` is visible
   but disabled while replay sessions are single-instrument. This step updates
   layout state only and must not render extra panes.
2. Step 464 - Multi-pane DOM shell. Completed.
   Render one, two, or three pane containers from layout state. Keep one real
   chart host initially, render secondary/tertiary placeholders, and dispatch
   `layout.setActivePane` on pane selection.
3. Step 465 - Chart runtime multi-host mounting contract. Completed.
   Make chart host mounting pane-id aware. Chart runtime owns per-pane adapter
   lifecycle and chart writes; route UI only passes host elements through
   commands.
4. Step 466 - Pane display timeframe and Interval sync. Completed.
   Store pane-level display timeframe in layout state. Active pane TF changes
   update one pane unless `sync.interval` is enabled, in which case the value
   copies to all panes through layout/runtime commands.
5. Step 467 - Time and Date range sync. Completed.
   Implement `sync.time` for go-to/jump-time alignment and `sync.dateRange`
   for visible-range mirroring. Chart runtime owns visible ranges; replay
   runtime continues to own cursor/reveal.
6. Step 468 - Crosshair sync and multi-pane acceptance. Completed.
   Implement `sync.crosshair` through chart-owned events/commands with
   deduping/throttling, then verify Single/Twice/Triple, active pane selection,
   interval/time/date-range/crosshair sync, and no-future replay boundaries.

Deferred beyond Step 468:

- `symbol` sync activation, because it needs a multi-instrument replay/session
  contract;
- arbitrary grids and drag-resizable pane layouts;
- saved layout templates and server-backed layout persistence.

Steps 470-472 should proceed next in this order:

1. Step 470 - Layout variant state. Completed.
   Add explicit `variant` state and variant-aware icon dispatch. Keep `mode` as
   the pane-count category and keep only one real primary chart host.
2. Step 471 - Variant pane shell layout. Completed.
   Render the visual geometry for each variant through pane shell data
   attributes and CSS grid. Secondary/tertiary panes remain placeholders.
3. Step 472 - Real multi-pane chart hosts. Completed.
   Render and mount secondary/tertiary `data-chart-host` elements through
   chart runtime. Preserve shared replay cursor, no-future reveal, and
   bar-data runtime ownership.
