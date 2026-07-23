# V7 Workstation Settings Foundation — R6.9i

Status: accepted by human interaction and visual review (2026-07-22)

## Product Boundary

R6.9i activates the first production slice of the catalog frozen by R6.9f and
refined by R6.9g. Workstation Settings are one global durable visual preference,
not Session data and not Pane operational state. The four-tab shell is visible,
but only `Canvas / Grid lines` is active in this slice. A field is not exposed
until its real owner and acceptance evidence ship together.

The default is:

```json
{
  "canvas": {
    "gridVisible": true
  }
}
```

## Owner And Persistence

`core.workstation-settings` owns the immutable versioned value, monotonically
increasing revision, recovery state, consumer registry, and atomic Save. It
persists one separate record at `v7.workstation-settings:global` through the
Session Persistence adapter. Session records and the Quick GoTo preference
record are unchanged.

Missing storage starts from revision `0` and defaults. A malformed or unreadable
record recovers to defaults with a visible non-blocking recovery message; it is
never interpreted as Session or chart state. A successful Save replaces the
global record. Hard reload, another Session, and Panes mounted later all receive
the latest committed revision.

## Transaction Contract

Save is a presentation-only transaction:

1. validate one strict immutable candidate;
2. stage every registered consumer before mutation;
3. apply every staged consumer;
4. durably write the candidate record;
5. commit each consumer and publish the new owner snapshot;
6. on any failure, roll back every applied consumer and restore prior durable
   state when it was already changed.

The dialog stays open with explicit feedback after failure. A rejected Save
cannot leave mixed presentation between Panes. Registering a consumer applies
the current committed value immediately, which is also the future-Pane rule.

## UI Contract

The Workspace toolbar opens one four-tab modal: Symbol, Status line, Scales and
lines, and Canvas. Inactive tabs identify their later bounded delivery rather
than presenting fake controls. The modal owns draft DOM state only:

- `Reset` restores defaults in the draft without applying or persisting;
- `Cancel`, close, Escape, and backdrop click discard the draft;
- `OK` requests one owner Save and closes only after acceptance.

## Chart Mapping

The Pane-set adapter is the sole Workstation Settings presentation consumer. It
fans the committed `gridVisible` value to every mounted Lightweight Charts
adapter and applies it to a newly mounted Pane before that Pane's first data
paint. Each child adapter maps it through chart `applyOptions` to both horizontal
and vertical grid-line visibility.

This operation must not change Replay cursor/revision, Workspace transaction
revision, Pane intent, bar count, series-data revision, or Viewport intent.

## Explicit Non-Goals

R6.9i does not activate candle colors/visibility, precision, OHLC/change/Volume,
current-price components, background, Crosshair, scale text, navigation-control
visibility, margins, timezone, date format, weekday, or hour format. Those
remain the focused R6.9j-m slices. It also adds no per-Pane appearance override,
Template, Apply to all, Replay action, market-data request, or Economic Calendar
behavior.

## Acceptance Evidence

- `tests/workstation-settings-harness.js` proves strict schema, durable restore,
  corrupt-record recovery, current/future consumer convergence, and rollback on
  persistence or consumer failure;
- `tests/lightweight-chart-adapter-browser-harness.js` proves the native grid
  mapping without series-data or visible-state revision movement;
- `tests/replay-pane-workspace-browser-harness.js` proves four-tab draft
  semantics, all-current/future-Pane fan-out, hard-reload and cross-Session
  restore, unchanged Replay/Workspace state, and a fixed dialog visual;
- `tests/fixtures/replay-workspace/workstation-settings-dialog.png` is the
  professional dark-shell visual baseline.

Human review is required because this slice adds a visible modal and changes
live chart presentation.
