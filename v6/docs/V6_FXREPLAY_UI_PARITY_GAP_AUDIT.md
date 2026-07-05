# V6 FXReplay UI Parity Gap Audit

Date: 2026-07-05

## Decision

The current V6 shell is acceptable as a guarded runtime/workflow scaffold, but
it is not yet aligned with the FXReplay UI kernel documented in
`v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`. Future UI parity work should proceed
from chart-first workstation chrome outward, not by expanding the existing
workflow-panel shape.

## Current State

| Area | Current V6 surface | Guardrail target | Gap class | Direction |
| --- | --- | --- | --- | --- |
| Top toolbar | Product lockup, readiness summary, Sessions/Replay/Journal/Settings buttons | Compact command toolbar with instrument search, symbol, interval, layout, Indicators, undo, redo, account/profile, instrument selector, editor/theme/fullscreen controls | shell-only UI plus future runtime-owned commands | Replace product-lockup emphasis with tool chrome; keep commands disabled until owners exist |
| Timeframe menu | Native select with `1m/5m/15m` | Floating grouped interval dropdown with custom interval entry | shell-only UI now, runtime-owned timeframe behavior remains display-timeframe runtime | Build dropdown UI around existing display-timeframe command path |
| Indicators / undo / redo | Missing | Reserved top-toolbar commands | runtime-owned behavior, shell-only disabled placeholders acceptable | Add disabled placeholders first; implement owners before interactivity |
| Left toolbar | Missing | Vertical drawing/tool icon strip | deferred until drawing/tool runtime owner exists | Reserve shell rail without fake drawing behavior |
| Right toolbar | Missing | Narrow utility strip for order, go-to, news, journal, settings, shortcuts | mixed shell-only and runtime-owned | Add shell rail progressively; route actions through commands/panels |
| Bottom transport | Present as floating replay transport but text-heavy and isolated from full bottom chrome | Compact bottom-center transport integrated with bottom chrome | shell-only UI, replay runtime already owns transport behavior | Restyle/position after top chrome audit; keep dispatch-only controls |
| Trading/account chrome | Missing except current workflow panels | Dense bottom edge with Buy/Sell, quantity, analytics, account balance, PnL | deferred runtime-owned behavior with shell-only placeholders possible | Do not add fake trading workflows; placeholders must be visibly inert |
| Settings | Small inline workflow panel | Centered chart-settings modal with left tab rail and fixed footer | shell-only UI now, settings runtime owns values | Replace panel with modal shell using settings commands |
| Chart status/OHLC | Compact chart toolbar and overlay readout exist | Pane-local title/OHLC at chart top-left | shell-only layout, status runtime remains read-only | Move status toward pane-local overlay, keep read-only subscriptions |
| Multi-pane chrome | Engine host is single default pane in shell; multi-pane test hosts exist in harness | Explicit pane boundaries, pane-local titles/OHLC/scales | deferred UI until current single-pane shell parity stabilizes | Preserve pane model; do not revive primary/non-primary split |
| Diagnostics | Readiness summary still visible in header, telemetry hidden | No engineering diagnostics in normal user surface | shell-only UI | Keep readiness minimal or move to explicit diagnostics mode |

## Priority Order

1. Top toolbar parity shell: instrument/search area, interval command, layout,
   Indicators, undo, redo, account/profile, symbol selector, editor/theme/fullscreen
   placeholders.
2. Timeframe menu parity: replace the native select with a grouped floating
   menu that still dispatches display-timeframe commands.
3. Settings modal parity: replace the inline workflow settings panel with a
   centered modal skeleton using Symbol, Status line, Scales and lines, Canvas
   tabs.
4. Side rail reservations: add left drawing rail and right utility rail as
   inert shell surfaces before adding behavior.
5. Bottom chrome audit: align transport plus account/trading chrome without
   implementing fake trading actions.

## Ownership Constraints

- Shell-only parity may add inert placeholders, visual rails, menus, and modal
  structure.
- Runtime-owned parity needs an explicit owner before controls become active.
- UI code may dispatch commands and subscribe to events; it must not own
  chart bars, replay cursor, viewport intent, adapter state, or bar cache.
- Indicators, drawing tools, account/trading, undo, and redo must remain inert
  until their state owner and command/event contracts exist.

## Stop Conditions

- A UI parity change exposes boundary/cache-hit/test-gate diagnostics in the
  normal user surface.
- A tool control directly mutates chart-engine, chart-data, chart-viewport,
  replay, default-wall, or bar-data internals.
- Settings becomes a dashboard page instead of a chart-settings modal.
- Multi-pane UI introduces primary/non-primary ownership language or separate
  event paths.
- Trading/account UI appears interactive without an explicit owner.

## Next Direction

Step 48 should implement the first shell-only top toolbar parity slice:
instrument/search, interval command entry, Layout, Indicators, undo, redo, and
right-side utility placeholders. Controls that lack owners should render as
disabled or inert placeholders. Controls that lack owners should not appear
interactive beyond accessible labels and disabled state.
