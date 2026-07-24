# V7 Pane Canvas Overlay And Maximize — R6.9b

Status: human accepted as part of the combined Pane gate (2026-07-21)

## Review Corrections

R6.9b integrates the Pane readout into the Canvas instead of reserving a
separate header row. Every Pane now presents:

- the short instrument symbol;
- a compact timeframe whose minute unit is omitted (`1`, `2`, `4`) while
  `s`/`h` remain lowercase and `D`/`W`/`M` remain uppercase;
- accepted selected-or-latest O/H/L/C;
- close-to-previous-visible-close change and percentage.

The chart background is neutral black, axis and readout text are brighter, and
the active Pane keeps a high-contrast blue boundary without a blue-tinted
header strip. Market-open status is deliberately omitted: V7 does not yet have
a reviewed live exchange-status product contract, and a decorative dot must
not imply reliable market-state truth.

## Pane-Local Controls

Reset View and Maximize/Restore are icon-only controls at the upper-right of
each Pane. They are hidden until the Pane is hovered or keyboard-focused and
have stable accessible names.

- Reset View dispatches the existing Viewport reset for that Pane only;
- Maximize is unavailable in a single-Pane layout;
- in a multi-Pane layout, Maximize temporarily lets the selected Pane occupy
  the complete Pane grid while every other chart host remains mounted;
- Restore returns the exact accepted split tree and ratios;
- a layout change exits the transient maximized presentation.

Maximize/Restore is Replay Workspace UI presentation state. It is not Pane
Layout Domain state, is not persisted, and cannot request bars, move Replay,
change Pane count, write a series, or create a Workspace transaction.

## Existing-Capability Decision

Official Lightweight Charts panes share one chart and one time scale. They are
appropriate for series/indicator panes, not V7 product Panes with independent
instruments, timeframes, and Viewports. The awesome-tradingview catalog does
not provide a reusable product-Pane maximize controller that preserves V7
ownership. R6.9b therefore retains one adapter-owned chart per product Pane and
implements maximize only in the outer DOM layout.

Reference:

- https://tradingview.github.io/lightweight-charts/tutorials/how_to/panes
- https://github.com/tradingview/awesome-tradingview

## Gate

- the Lightweight Chart Adapter Harness binds selected/latest OHLC plus change
  value and percentage;
- the Replay Layout browser Harness binds Canvas-overlay geometry, compact
  timeframe labels, brighter typography, hidden/hover controls, absence of a
  global Reset, single-Pane maximize exclusion, two-Pane maximize/restore,
  mounted chart preservation, exact geometry restoration, and zero
  Replay/Workspace revisions;
- fixed `1440×900` fixtures cover maximized, synchronized two-Pane, and mixed
  four-Pane states;
- retained layout, Replay/RTH, performance, architecture, source-quality, and
  browser gates remain mandatory.

The final gate passes all 39 non-browser Harnesses and all six real-Chrome
Harnesses; `git diff --check` also passes. The retained performance run records
100 cache-hit Next samples at p95 `83.8ms`, p99 `96.8ms`, and max `102.8ms`,
with no interaction freeze.

The user accepted this interaction and visual correction with R6.9/R6.9a on
2026-07-21. R6.9c records the subsequent lower-right control-dock placement
request without reopening these accepted interaction semantics.

## Post-acceptance Pointer Correction

The 2026-07-23 phase-one walkthrough found that the global timeframe menu
opened behind a transiently maximized product Pane. The menu and maximized Pane
had both used stacking level `8`; because the Pane grid occurs later in the DOM,
its chart Canvas won pointer hit-testing over the visible menu options.

The correction keeps maximize in the outer DOM presentation boundary and gives
the timeframe menu the same reviewed toolbar-menu stacking level used by the
other workspace menus. It does not change Pane focus, interval ownership,
Workspace transactions, chart hosts, or maximize persistence. The browser gate
now uses actual CDP mouse events and `elementFromPoint` to prove that a menu
option remains the hit target, changes only the maximized active Pane, and does
not exit maximize.
