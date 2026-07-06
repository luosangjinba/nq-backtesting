# V6 FXReplay UI Parity Gap Audit

Date: 2026-07-05

## Decision

The current V6 shell is acceptable as a guarded runtime/workflow scaffold. Its
top toolbar, timeframe menu, and right utility rail now have shell-only parity
slices. It is still not fully aligned with the FXReplay UI kernel documented in
`v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`. Future UI parity work should proceed
from chart-first workstation chrome outward, not by expanding the existing
workflow-panel shape.

## Current State

| Area | Current V6 surface | Guardrail target | Gap class | Direction |
| --- | --- | --- | --- | --- |
| Top toolbar | Compact shell toolbar with one session-back control, instrument/search, interval, Layout, Indicators, undo, redo, workflow actions, profile/account, instrument selector, editor/theme/fullscreen placeholders | Compact command toolbar with session-back, symbol/search, comparison add, interval, Indicators, undo/redo, session name, RTH/ETH, three-level page layout, search utility, settings, screenshot, theme, and fullscreen. Exclude chart-type selector, New Layout, Pine/code editor, and a chart-forward arrow for now | shell-only UI complete for first slice; future runtime-owned commands remain inert | Keep placeholders disabled until owners exist; prune controls that V6 explicitly does not need |
| Timeframe menu | Grouped floating interval dropdown with custom/unsupported intervals disabled and supported minute options routed through display-timeframe runtime | Floating grouped interval dropdown with custom interval entry | shell-only UI complete for first slice; runtime-owned timeframe behavior remains display-timeframe runtime | Keep unsupported intervals inert until data/runtime support exists |
| Indicators / undo / redo | Missing | Reserved top-toolbar commands | runtime-owned behavior, shell-only disabled placeholders acceptable | Add disabled placeholders first; implement owners before interactivity |
| Left toolbar | Missing | Vertical drawing/tool icon strip | deferred until drawing/tool runtime owner exists | Reserve shell rail without fake drawing behavior |
| Right toolbar | Screen-right shell rail outside the chart price scale with Object tree, Order, Go to, News, Journal, watch/tool, and Session settings entries; Go to exposes an inert key-time menu | Narrow utility strip for object tree, order, go-to key times, news/calendar, journal, watch/tool, and session settings | shell-only UI complete for first slice; runtime-owned actions remain inert | Keep placeholders disabled until owners exist; Go to menu may open but must not mutate replay or viewport state |
| Bottom transport | Compact floating replay transport with drag handle, truncate placeholder, speed slider, previous/play/period/next controls, and active-chart-period sync toggle | Compact floating replay transport integrated with bottom chrome | shell-only UI complete for first slice; replay runtime still owns play/next behavior | Keep truncate/previous/period/sync inert until explicit owners exist |
| Trading/account chrome | Missing except current workflow panels | Dense bottom edge with Buy/Sell, quantity, analytics, account balance, PnL | deferred runtime-owned behavior with shell-only placeholders possible | Do not add fake trading workflows; placeholders must be visibly inert |
| Settings | Centered chart-settings modal shell with Symbol, Status line, Scales and lines, Canvas rail and fixed Template/Cancel/Ok footer | Centered chart-settings modal with left tab rail and fixed footer | shell-only UI complete for first slice; settings runtime still owns values | Keep modal shell; add real chart setting ownership before more controls become active |
| Chart status/OHLC | Pane-local title/OHLC overlay at chart top-left; duplicate chart-internal Go to/Layout toolbar removed | Pane-local title/OHLC at chart top-left with commands owned by top toolbar/right rail | shell-only layout, status runtime remains read-only | Keep chart surface free of duplicate command toolbar; keep read-only subscriptions |
| Multi-pane chrome | Engine host is single default pane in shell; multi-pane test hosts exist in harness | Explicit pane boundaries, pane-local titles/OHLC/scales | deferred UI until current single-pane shell parity stabilizes | Preserve pane model; do not revive primary/non-primary split |
| Diagnostics | Readiness summary still visible in header, telemetry hidden | No engineering diagnostics in normal user surface | shell-only UI | Keep readiness minimal or move to explicit diagnostics mode |

## Priority Order

1. Session settings panel reservation: make the right-rail Session settings
   entry open a shell-only panel distinct from Workspace Settings, with Session
   Info, Balance & Assets, Spreads & Commissions, and Date Range placeholders.
2. Settings modal parity: replace the inline workflow settings panel with a
   centered modal skeleton using Symbol, Status line, Scales and lines, Canvas
   tabs.
3. Left drawing rail reservation: add a vertical drawing/tool icon strip as an
   inert shell surface before adding behavior.
4. Bottom chrome audit: align transport plus account/trading chrome without
   implementing fake trading actions.

## Ownership Constraints

- Shell-only parity may add inert placeholders, visual rails, menus, and modal
  structure.
- Runtime-owned parity needs an explicit owner before controls become active.
- UI code may dispatch commands and subscribe to events; it must not own
  chart bars, replay cursor, viewport intent, adapter state, or bar cache.
- Indicators, drawing tools, account/trading, undo, and redo must remain inert
  until their state owner and command/event contracts exist.
- Comparison symbols, RTH/ETH, page layout, screenshot, theme, and fullscreen
  controls also require explicit owners before they become interactive.

## Stop Conditions

- A UI parity change exposes boundary/cache-hit/test-gate diagnostics in the
  normal user surface.
- A tool control directly mutates chart-engine, chart-data, chart-viewport,
  replay, default-wall, or bar-data internals.
- Settings becomes a dashboard page instead of a chart-settings modal.
- Multi-pane UI introduces primary/non-primary ownership language or separate
  event paths.
- Trading/account UI appears interactive without an explicit owner.
- The top bar grows FXReplay clone controls that V6 explicitly rejected:
  chart-type selector, generic New Layout, or Pine/code editor.

## Completed Direction

Step 50 should reserve the right utility rail outside the chart price scale and
tight to the screen edge. It should add inert shell entries for Order, Go to,
News, Journal, watch/tool, and Session settings without implementing those workflows.

## Next Direction

Step 51 should reserve the right-rail Session settings panel shell. The panel
must remain distinct from Workspace Settings and must stay inert until a
session-settings owner exists.
