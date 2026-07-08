# V6 FXReplay UI Parity Gap Audit

Date: 2026-07-07

## Decision

The V6 workstation shell is now aligned enough with the FXReplay UI kernel in
`v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md` for the current single-pane replay
workstation slice. The remaining gaps are either runtime-owned behaviors that
need explicit owners before interactivity, or shell polish that should be
selected only after diagnostics are moved out of the normal user surface.

This audit supersedes the earlier July 5 priority order. The previous
Session settings panel reservation, left drawing rail reservation, and bottom
chrome audit directions are complete and should not be selected again.

## Current State

| Area | Current V6 surface | Guardrail target | Gap class | Direction |
| --- | --- | --- | --- | --- |
| Session dashboard | Standalone session selector surface with Backtesting session creation, Sessions list, Analytics placeholder, and visible Summary, Stats, Copy, Journal row actions | Simplified FXReplay-like session selector distinct from chart workstation | shell-only UI complete for current slice; durable analytics, replay orders, live orders, Order, and Calendar remain runtime-owned/deferred | Keep session surface separate from chart; do not expose Order or Calendar until owners exist |
| Top toolbar | Compact shell toolbar with one session-back control, symbol/search placeholders, comparison placeholder, interval, Layout, Indicators, undo, redo, session name, ETH placeholder, search, chart settings, screenshot, theme, and fullscreen placeholders | Compact command toolbar around the chart surface | shell-only UI complete for current slice; comparison, indicators, undo/redo, session hours, screenshot, theme, fullscreen need owners before interactivity | Keep placeholders inert; do not add chart-type selector, generic New Layout, Pine/code editor, or chart-forward arrow |
| Timeframe menu | Grouped floating interval dropdown with custom/unsupported intervals disabled and supported minute options routed through display-timeframe runtime | Floating grouped interval dropdown with custom interval entry | shell shell complete; supported interval behavior remains display-timeframe owned | Keep unsupported intervals inert until data/runtime support exists |
| Indicators / undo / redo | Reserved top-toolbar commands, disabled | Reserved top-toolbar commands | runtime-owned behavior deferred | Add owners before making controls interactive |
| Left toolbar | Reserved vertical drawing/tool rail with disabled icon buttons | Vertical drawing/tool icon strip | shell-only UI complete; drawing/action-history owner deferred | Keep drawing tools inert until owner contract exists |
| Right toolbar | Screen-right utility rail with Object tree, Order, Go to, News, Journal, watch/tool, and Session settings entries; Go to and Session settings can open inert shell menus/panels | Narrow utility strip for object tree, order, go-to key times, news/calendar, journal, watch/tool, and session settings | shell-only UI complete for current slice; right-rail actions remain owner-gated | Keep Order, News, Journal, object tree, and watch/tool inert until owners exist; Go to must not mutate replay or viewport state |
| Session settings panel | Right-rail Session settings panel with disabled Session Info, Balance & Assets, Spreads & Commissions, and Date Range placeholders | Session settings distinct from chart settings | shell-only UI complete for current slice; session-settings owner deferred | Keep distinct from Chart Settings and do not persist or dispatch session-settings commands |
| Bottom transport | Compact floating replay transport with drag handle, restart placeholder, speed slider, previous/play/period/next controls, and active-chart-period sync toggle | Compact floating replay transport integrated with bottom chrome | shell present; replay-owned controls stay in replay/chart-entry owners | Keep truncate/restart/previous/period/sync owner-gated; shell must not own replay cursor |
| Trading/account chrome | Dense bottom edge with Buy/Sell, quantity, analytics, account balance, and PnL placeholders | Dense bottom account/trading chrome | shell-only UI complete; trading/account/analytics behavior runtime-owned/deferred | Keep placeholders visibly inert until explicit account/trading owners exist |
| Settings | Centered chart-settings modal shell with left rail tabs, grouped chart controls, Template, Cancel, and Ok footer | Centered chart-settings modal with left tab rail and fixed footer | shell present; only existing settings runtime fields may be interactive | Keep Chart Settings distinct from Session settings; add real chart setting ownership before more controls become active |
| Chart status/OHLC | Pane-local title/OHLC overlay at chart top-left; reset view is a chart-viewport bridge command; duplicate chart-internal Go to/Layout toolbar removed | Pane-local title/OHLC at chart top-left with commands owned by top toolbar/right rail | shell layout complete; status readout remains read-only and reset view remains viewport-owned | Keep chart surface free of duplicate command toolbar |
| Multi-pane chrome | Engine host is single default pane in shell; multi-pane test hosts exist in harness | Explicit pane boundaries, pane-local titles/OHLC/scales | deferred UI; pane model and harnesses exist | Preserve pane model; do not introduce primary/non-primary ownership language |
| Diagnostics | Readiness surface remains visible in the workstation header with runtime/command/gate details | No engineering diagnostics in normal user surface | shell polish gap | Next shell-only candidate is moving readiness diagnostics behind an explicit diagnostics affordance or hiding telemetry from normal view |

## Updated Priority Order

1. Diagnostics visibility cleanup: move readiness runtime/command/gate
   telemetry out of the normal workstation header, or gate it behind an explicit
   diagnostics affordance, without weakening readiness test coverage.
2. Owner contract selection for one deferred interactive family, such as
   drawing/action-history, indicators, account/trading, screenshot/export, or
   session-settings.
3. Multi-pane workstation UI selection after diagnostics cleanup and after the
   pane model owner path is rechecked.

## Ownership Constraints

- Shell-only parity may add inert placeholders, visual rails, menus, and modal
  structure.
- Runtime-owned parity needs an explicit owner before controls become active.
- UI code may dispatch commands and subscribe to events; it must not own chart
  bars, replay cursor, viewport intent, adapter state, or bar cache.
- Indicators, drawing tools, account/trading, undo, redo, screenshot/export,
  session-settings, Order, and Calendar must remain inert until their state
  owner and command/event contracts exist.
- Comparison symbols, RTH/ETH, page layout, theme, and fullscreen controls
  also require explicit owners before they become interactive.

## Stop Conditions

- A UI parity change exposes boundary/cache-hit/test-gate diagnostics in the
  normal user surface.
- A tool control directly mutates chart-engine, chart-data, chart-viewport,
  replay, default-wall, or bar-data internals.
- Settings becomes a dashboard page instead of a chart-settings modal.
- Session settings reuses the chart-settings modal or persists values before a
  session-settings owner exists.
- Multi-pane UI introduces primary/non-primary ownership language or separate
  event paths.
- Trading/account UI appears interactive without an explicit owner.
- Order or Calendar appears as a visible dashboard row action before its owner
  contract is ready.
- The top bar grows FXReplay clone controls that V6 explicitly rejected:
  chart-type selector, generic New Layout, Pine/code editor, or chart-forward
  arrow.

## Completed Direction

The earlier right utility rail, left drawing rail, bottom account/trading
chrome, and right-rail Session settings panel shell directions are complete and
regression-audited. They should continue to reserve inert shell workflows
without implementing those workflows.

## Next Direction

Step 130 should select the next bounded workstation/chart slice from the
updated priority order. Prefer diagnostics visibility cleanup as the next
shell-only slice unless a newly found regression requires a narrower fix first.
