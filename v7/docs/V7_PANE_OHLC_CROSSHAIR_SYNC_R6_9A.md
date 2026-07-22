# V7 Pane OHLC And Crosshair Sync — R6.9a

Status: human accepted as part of the combined Pane gate (2026-07-21)

## Review Corrections

R6.9a closes the first R6.9 visual review findings:

- the active product Pane has a clearly visible `2px` blue boundary;
- every Pane presents its own symbol, timeframe, and compact OHLC; R6.9b later
  integrates this readout into the Canvas and removes the tinted header row;
- a single Pane shows the crosshair-selected candle when one is hit and its
  latest visible candle when the crosshair is outside candle data;
- with multiple Panes and Crosshair sync off, the Pane physically under the
  pointer owns the selected OHLC even when it is not active, while every other
  Pane shows its own latest candle;
- with Crosshair sync on, the selected completion-display timestamp is
  projected to every other Pane. An exact target candle is selected; a mixed-TF
  Pane without an exact target candle keeps its own latest OHLC. Empty Panes
  remain empty and never invent a candle.

OHLC presentation is read-only. It does not add bars, move Replay, request raw
data, change active focus, or create a Workspace transaction.

## Existing-Capability Decision

Lightweight Charts exposes `subscribeCrosshairMove`, `setCrosshairPosition`,
and `clearCrosshairPosition`; its official two-chart example uses these APIs
for synchronization. R6.9a uses those supported APIs rather than drawing a
second synthetic crosshair. The awesome-tradingview catalog did not expose a
component that fits V7's independent product-Pane ownership.

Reference:

- https://tradingview.github.io/lightweight-charts/tutorials/how_to/set-crosshair-position

## Ownership

- the per-Pane Lightweight Chart Adapter is the only layer that subscribes to
  native chart crosshair events, reads the current/latest projected candle,
  and calls programmatic crosshair APIs;
- the Pane-set Adapter owns ephemeral cross-Pane presentation fan-out and
  prevents a programmatic target callback from becoming a new native source by
  accepting native movement only from the Pane physically under the pointer;
- Replay Workspace UI owns only the OHLC DOM, active styling, and the
  `Crosshair` layout switch. The switch is UI-local in this bounded review
  correction and is not Session or Replay state;
- Bar Data, Projection, Replay Runtime, Pane Workspace, and Workspace
  Transaction ownership are unchanged.

The OHLC index is rebuilt only after an accepted chart snapshot is visibly
applied. Native and projected crosshair changes read that accepted index and
cannot write the series.

The 2026-07-22 P1 hardening also makes `ready → empty` a real adapter
transaction. It replaces the child series with an empty set, clears its OHLC
index and chart data attributes, and retains the same Pane-owned adapter for a
later `empty → ready` transition. The full-Pane empty overlay is presentation,
not the mechanism that hides stale market state.

## Layout Geometry Correction

The minimum Pane width increases from `180px` to `280px` so symbol, timeframe,
OHLC, and local controls remain readable. Minimum height remains `120px`. The pure Pane
Layout Domain continues to clamp every nested split from measured subtree
geometry, and accepted ratios remain Session-persisted.

## Gate

- the real Lightweight Charts Harness covers selected/latest/empty lookup,
  native candle hit, blank-area fallback, programmatic projection, reversible
  ready/empty mutation, and negative missing-target/empty cases;
- the Replay Layout browser Harness covers single-Pane OHLC, a non-active
  native source with sync off, same-TF synchronized selection, mixed-TF latest
  fallback, active-border contrast, no Replay/Workspace revisions, and both
  accepted visual fixtures;
- retained one-to-four layout, resize, persistence, all-Pane Replay/RTH,
  Session Browser, performance, architecture, and source-quality gates remain
  required. The final run passed all 39 non-browser and six serial real-Chrome
  Harnesses; `git diff --check` also passes.

This is an R6.9 review correction and the first bounded Crosshair portion of
layout synchronization. R6.9b supplies the follow-up Canvas overlay and Pane
controls; Symbol, interval, time, and date-range sync remain outside this slice.
