# Session — R6.9f Workstation Settings Catalog And Ownership

Date: 2026-07-22
Status: completed headlessly with automated evidence

## Trigger

The user identified the missing global Settings surface after Replay, Pane,
and GoTo behavior had matured. V6 already contained useful appearance and
visibility behavior, but its implementation cannot be copied into V7's owner
graph.

## Decision

- plan Settings now, before indicators, orders, Journal, and other business
  surfaces expand the presentation graph;
- keep one global Workstation Settings record separate from Session Store;
- keep Quick GoTo schedule values Session-scoped and Pane instrument/TF/
  Viewport/layout/focus state with their existing operational owners;
- retain draft-only edits, atomic Save, Cancel/close/Escape discard, and
  draft-only Reset;
- route chart and candle options through the sole Lightweight Charts adapter,
  Pane readout visibility through its DOM owner, and right-margin defaults
  through Viewport Runtime;
- reject per-Pane appearance overrides, Apply-to-all, templates, and generic
  hiding of essential Replay/failure/active-Pane context;
- activate no field until its consumer and focused evidence land together.

## Delivered

- one catalog covering direct Canvas, Candles, Pane information/current price,
  Interface, Viewport, and later time-presentation boundaries;
- one explicit scope and persistence decision;
- consumer routing and multi-Pane/new-Pane application invariants;
- production acceptance and stop conditions;
- an ordered R6.9g Exact GoTo, R6.9h Settings foundation, R6.9i direct
  appearance, R6.9j visibility, then R6.10 sync sequence;
- documentation index, roadmap, TODO, restart handoff, and architecture
  required-document registration.

## Evidence

- current V7 Chart adapter and Session Store boundaries were inspected;
- V6 Settings transaction, catalog, direct Canvas, Symbol, Status, and scope
  decisions were reviewed as product evidence only;
- Lightweight Charts official `IChartApi`, `ISeriesApi`, and color
  customization documentation confirm runtime partial option application;
- architecture/source/document and `git diff --check` gates are required before
  the focused commit.

## Next Boundary

R6.9e remains at its visible human gate. After acceptance, R6.9g implements the
separate range-aware Exact GoTo surface. The first production Settings work is
R6.9h and must start with the owner/persistence/draft transaction plus one real
Grid consumer rather than a complete modal full of disconnected controls.
