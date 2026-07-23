# V7 Layout Sync Time — R6.10c

Status: executable interaction slice; human review pending (2026-07-23)

## Product Behavior

The Layout menu now exposes Time after Symbol, Interval, and Crosshair. Time is
off by default. Enabling it does not immediately move any Pane. A later ordinary
click inside a source chart aligns every other visible Pane to the clicked
semantic time at the same horizontal position in its own viewport.

Each target retains its own zoom span. A 1-minute source may therefore align a
4-hour target without turning the target into a 1-minute view. Time synchronizes
one point, not the complete visible range; Date range remains absent until
R6.10d.

## Ownership And Projection

- The chart adapter observes the native chart click and emits only the clicked
  display epoch and normalized horizontal position.
- Pane Set Adapter fans that intent to other visible chart adapters. The source
  chart keeps its native click behavior and is not re-projected.
- Each target projects the epoch into its own loaded/future timeline and applies
  a visible logical range with the target's existing span.
- An accepted target projection is captured through the existing Viewport
  controller. No native logical coordinate becomes Session state.
- Replay cursor/revision, Pane Workspace, Bar Data requests, and candle-series
  contents are unchanged by Time synchronization.

Exact target timestamps use their logical index. An epoch between target bars
is interpolated. If the shared accepted cursor lies within a calendar-aligned
aggregate that has no future axis point, the projection may use the latest
completed aggregate. A target before loaded history or beyond accepted future
evidence is a bounded no-op; Time does not fabricate OHLC data or issue a hidden
history request.

Replay truncation owns its chart click while selection is active, so the same
click cannot also synchronize Time. Plain click is also separated from drag
completion: Viewport capture and earlier-history loading occur only when the
pointer has moved beyond the adapter's drag threshold.

## Existing-Approach Audit

Lightweight Charts exposes click events with semantic time/logical coordinates
and visible logical-range APIs. Its documented visible-time range setter clamps
to data, so V7 uses visible logical ranges for target-span preservation and
implements the missing bounded semantic projection inside the adapter. The
official synchronized-crosshair example confirms chart-to-chart coordinate
projection as presentation behavior, but no audited awesome-tradingview entry
supplied V7's Viewport ownership or no-Replay contract.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi>
- <https://tradingview.github.io/lightweight-charts/tutorials/how_to/set-crosshair-position>
- <https://github.com/tradingview/awesome-tradingview>

## Gate

- pure projection tests bind exact, interpolated, bounded-past, calendar-
  aggregate, and invalid-timeline behavior;
- adapter and Pane-set tests bind target-span retention, Viewport capture,
  source exclusion, default-off behavior, and truncation suppression;
- Replay Layout Workspace browser tests bind real mixed-TF projection,
  Replay/Workspace immobility, durable re-entry, and updated visual baselines;
- full architecture, module-host, source-quality, Harness, and diff gates must
  pass before the bounded commit.

R6.10c stops at the interaction gate. R6.10d Date-range synchronization must
not begin until the reviewed Time behavior is accepted.
