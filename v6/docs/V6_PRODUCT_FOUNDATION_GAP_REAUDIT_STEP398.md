# Step 398 - Product/Foundation Gap Re-audit

Status: superseded by the Step 402 Go-to semantic correction.

The journey evidence remains useful, but the conclusion below incorrectly
treated the right-rail `Go to` surface as an arbitrary chart date locator. User
acceptance evidence later established that this surface means forward replay
navigation to configured day/session anchors. See
`V6_GOTO_REPLAY_NAVIGATION_PLAN_STEP402.md`.

## Journey evidence matrix

| Journey | Production boundary | Browser evidence | Current finding |
| --- | --- | --- | --- |
| Chart loading | chart-entry, bar-data, chart-data, chart-viewport | app shell, initial HTF entry, replay K-line flow | Closed foundation path |
| Timeframe | display-timeframe, projection, target history | Step 276 display/menu/projection members | Closed foundation path |
| Replay | replay, chart-entry manual/auto, materialization | Step 276 replay-gap and Step 397 transport packs | Closed foundation path |
| Multi-pane | panes, layout, pane reload, layout sync | Step 253 pack and pane/layout browser smokes | Closed foundation path |
| Date range | session entry boundaries, chart viewport, layout range sync | Step 255 boundary-entry pack and Step 166 visible-range sync | Partial: no post-entry date locator/range control |

## Date-range gap

V6 accepts a session start/end boundary at entry and can synchronize an
already-visible logical range between panes. It does not expose a workstation
control that lets the user enter a timestamp/date after entry and navigate the
active chart to it. This is observable in the shell and production search:
date-range appears as session setup and layout sync metadata, not as a chart
navigation command/control.

## Existing capability check

Lightweight Charts 5.2 exposes the required primitives through `ITimeScaleApi`:
`setVisibleRange`, `setVisibleLogicalRange`, `timeToIndex`, and
`scrollToPosition`. Official documentation notes that `setVisibleRange` clamps
to currently loaded data, so V6 must request missing bars through Bar Data
before applying a chart-owned viewport projection.

- Official API: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi
- Ecosystem audit: https://github.com/tradingview/awesome-tradingview

The awesome-tradingview list contains official plugin examples and a visible
price-range utility, but no date-locator/navigation plugin that replaces this
small V6 workflow. The correct direction is to reuse the native time-scale API
behind existing V6 owners, not implement custom chart scrolling mathematics.

## Ownership constraint

A future date locator must remain a UI command surface. Bar Data owns any
missing-window request, Chart Data owns bar replacement/merge, and Chart
Viewport/Chart Surface owns the final visible-range application. The locator
must not call Lightweight Charts or fetch bars directly.

## Journey verification

- Step 276 foundation pack passed `8/8` in `45651ms`, covering loading,
  timeframe switching/projection, leftward history, and replay gaps.
- Step 253 multi-pane foundation pack passed `9/9` in `27520ms`, covering pane
  bootstrap, replay append/viewport, history, reset, maximize, and active focus.
- Step 255 date-range boundary-entry pack passed `7/7` in `19151ms`, covering
  entry alignment, real boundary metadata, initial visibility, playback-period
  boundaries, and leftward gaps.

These results confirm that the Date Range gap is not broken session entry or
broken range synchronization. It is the missing post-entry user action for
locating a date/time in the active workstation chart.

## Selection

The former Active-Pane Loaded-Window Date Locator selection is rejected. Date-
range inspection may be reconsidered later under a distinct name and surface;
it must not redefine the replay-semantic `Go to` control.
