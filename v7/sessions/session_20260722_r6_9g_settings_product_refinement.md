# Session — R6.9g Workstation Settings Product Refinement

Date: 2026-07-22
Status: completed headlessly with user-reviewed product detail

## Trigger

The user supplied a second complete FXReplay Settings walkthrough with 31
screenshots and explicit keep/simplify/reject judgments for Symbol, Status
line, Scales and lines, and Canvas. The delivered R6.9f owner/scope contract
remained correct, but several field decisions needed refinement before
production implementation.

## Decision

- record a new R6.9g correction rather than silently rewriting the delivered
  R6.9f step;
- activate Auto/Integer/1-15 decimal precision using existing exact instrument
  increments, applying it consistently to every price readout, and rejecting
  fractional quotes for unsupported instruments;
- retain Body/Border/Wick visibility and colors, with a future verified mapping
  for the library's missing direct Body visibility option;
- activate nullable Volume display using the existing raw/projected/aggregate
  contract and preserve unknown values visibly;
- add shared Crosshair opacity, width, and line style to color;
- make Grid visibility-only and reject gradient, Session breaks, Watermark, and
  editable Canvas/axis boundary color;
- keep independent current-price Name, Value, and Line controls;
- require real-library evidence for all eight Name/Value/Line combinations;
- add simplified semantic time presentation without changing New York Replay
  truth;
- retain the four-tab layout and remove Template/Apply to all.

## Delivered

- current combined R6.9f Catalog updated with the accepted field matrix;
- one standalone R6.9g product-delta record;
- future production slices re-bounded and renumbered R6.9h-m;
- TODO, roadmap, restart handoff, documentation index, and architecture
  required-document list synchronized.

## Evidence

- V7 Instrument Definition and NQ/ES foundation values prove exact
  `priceIncrement` ownership;
- Bar Data Contract, Projection, and fixed-timeframe aggregation prove nullable
  Volume provenance and null propagation;
- the existing chart adapter proves New York IANA/DST display without changing
  bar instants;
- Lightweight Charts 5.2 documentation proves native Crosshair line options,
  built-in/custom price formatters, current-price primitives, and right offset,
  while keeping V7-specific fan-out and Viewport intent inside their owners;
- architecture, source-quality, module-host, JSON, and `git diff --check`
  gates are required before commit.

## Next Boundary

R6.9e remains at its visible human gate. After acceptance, R6.9h implements the
separate Exact GoTo Calendar surface. R6.9i is the first production Settings
slice and must activate the owner/persistence/draft shell plus only one honest
Grid consumer.
