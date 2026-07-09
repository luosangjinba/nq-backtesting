# V6 Step 232 - Chart Foundation Post Time-Helper Slice Selection

## Decision

Step 233 should implement **Dashboard Chart Boundary Label Product Wording**.

This is a bounded chart-foundation presentation slice. It should improve the
session dashboard's date-range/chart-boundary wording without changing bar-data
requests, replay state, chart data, viewport intent, pane state, or chart
adapter behavior.

## Why This Slice

The time/TF helper migration line is closed for now. The next foundation slice
should return to a user-visible chart foundation gap rather than start a new
feature surface.

The current dashboard can display:

`Chart data from loaded boundary: 2026-05-31 18:00`

That text is technically accurate but still engineering-facing. It exposes
implementation language (`loaded boundary`) in the normal session surface. The
underlying concept is important: for CME futures, a Monday trading-date replay
may legitimately show chart data from the prior Sunday Globex open. The UI
should state that in compact product wording while preserving the Step 188
distinction between selected trading dates and actual chart data boundary.

This is small, visible, and still inside the current foundation priorities:
date range clarity, chart data loading clarity, replay entry confidence, and
no accidental full date-range preload.

## Owner Boundaries

- Session dashboard model owns display-only date/boundary labels.
- Session dashboard UI owns rendering those labels.
- Chart boundary metadata runtime owns loaded chart boundary metadata.
- Bar-data runtime remains the only owner of bar requests and cache behavior.
- Chart-data runtime remains the only owner of chart series data.
- Replay runtime remains the owner of replay cursor and reveal state.
- Chart viewport runtime remains the owner of viewport intent.

## Step 233 Scope

Implement Dashboard Chart Boundary Label Product Wording:

- replace `Chart data from loaded boundary: ...` with compact product wording
  such as `Chart starts at ...`;
- keep the prior Globex-open label clear and compact;
- keep the selected trading date range unchanged;
- preserve `hasActualChartDataBoundary` and `hasPriorGlobexOpen` semantics;
- update model/browser smokes that assert dashboard boundary text;
- do not request bars, preload full date ranges, change chart entry, mutate
  replay, mutate chart-data, or change viewport behavior.

## Non-Goals

- Do not change date range selection behavior.
- Do not add date-range sync across panes.
- Do not change chart entry loading windows or leftward extension windows.
- Do not add new TFs, indicators, Pine Script compatibility, SMC/ICT overlays,
  trading simulation, order tickets, prop firm rule engines, or journal
  workflows.
- Do not move chart series writes, bar-data requests, replay cursor ownership,
  projection ownership, viewport ownership, or pane ownership across runtime
  boundaries.

## Acceptance

- The dashboard model returns product-facing boundary labels.
- Browser coverage proves actual loaded chart boundary text is rendered.
- Existing Step 188 date-range clarity semantics remain intact.
- Database import boundary, product direction, boundary, and chart browser
  regression smokes pass.
