# V6 FXReplay UI Guardrails

Date: 2026-07-05

## Purpose

These guardrails capture the FXReplay UI kernel V6 should preserve while
building its own implementation. They are not pixel-copy requirements. The goal
is to keep V6 from drifting into a dashboard, debug console, or generic SaaS
layout while preserving V6 runtime ownership boundaries.

## Reference Screenshots

Primary references:

- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104015.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104030.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104111.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104130.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104146.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104208.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104228.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104336.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104354.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104407.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104427.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104517.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104602.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104731.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104743.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104757.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104815.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114127.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114221.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114325.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114427.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114459.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114559.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114633.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114724.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114816.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114913.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_114923.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_115016.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_115114.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_115149.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_115300.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_115335.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_115409.png`

## UI Kernel

V6 should preserve these interaction and information-architecture traits:

- The chart is the primary surface. Tooling surrounds it and must not become the
  main visual object.
- The top toolbar is compact and command-oriented: instrument search, symbol,
  interval, layout, Indicators, undo, redo, account/profile, instrument selector,
  editor/theme/fullscreen-style controls.
- The left toolbar is a vertical drawing/tool strip using icon buttons.
- The right toolbar is a narrow utility strip for order, go-to, news, journal,
  settings, and related shortcuts.
- The bottom transport is a compact floating control near bottom center.
- Trading/account chrome stays along the bottom edge and remains dense:
  Buy/Sell, quantity, analytics, account balance, realized/unrealized PnL.
- Chart titles and OHLC readouts live inside each pane at the top-left of that
  pane. They are compact, read-only, and close to the chart they describe.
- Multi-pane layouts use explicit pane boundaries, pane-local titles, pane-local
  OHLC, and pane-local price scales.
- Engineering diagnostics such as boundary, cache-hit latency, command counts,
  and test gates must not appear in the normal user surface.

## Top Bar Decision Matrix

V6 should preserve the top-bar kernel, but only the controls that match this
product:

| FXReplay reference area | V6 decision |
| --- | --- |
| Back to session selection | Needed once V6 has a session dashboard/list page. Use one left-arrow control only, labelled as back to the session dashboard. Do not add a matching forward arrow in chart chrome. |
| Symbol search and active symbol | Needed. Symbol identity must be visible in the top bar and pane title. |
| Add comparison symbol | Needed later. It should wait for an explicit comparison/multi-symbol owner. |
| Timeframe selector | Needed. It is already routed through display-timeframe runtime for supported intervals. |
| Chart type selector | Not needed. V6 is candle-only, so do not add a line/bar/area selector. |
| New layout | Not needed. Layout presets should not be added as a generic FXReplay clone control. |
| Indicators | Needed. Keep inert until an indicators owner exists. |
| Undo and redo | Needed. Keep inert until drawing/indicator/action-history ownership exists. |
| Session name | Needed. It should show the user-defined replay session name, such as the FXReplay `test` label. |
| RTH/ETH selector | Needed. ICT analysis uses regular and electronic trading hours, so this requires an explicit session-hours owner before interactivity. |
| Page layout selector | Needed, but only to the third level. The compact layout icon opens the layout panel; the adjacent `NQ-2018`-style text is the layout name, not the instrument selector. Do not expose deeper or generic layout complexity. |
| Search utility | Keep as a placeholder. It should not be removed even if implementation is deferred. |
| Settings | Needed. Chart settings and Session settings must remain distinct surfaces. |
| Screenshot | Needed. Add as an inert placeholder until an export/screenshot owner exists. |
| Pine/code editor | Not needed for now. Do not reserve it in the main toolbar unless the product direction changes. |
| Theme | Needed. Route through settings/theme ownership before interactivity. |
| Fullscreen | Needed. Route through a shell/browser capability boundary before interactivity. |

## Chart Surface Chrome

The chart surface itself should stay focused on pane-local chart information:

- Keep pane title and OHLC/status readout at the chart top-left.
- Do not place duplicate `Go to`, `Layout`, or timeframe text buttons inside
  the chart surface.
- Go-to key times belong on the right utility rail.
- Page layout belongs in the top toolbar layout menu.
- The chart surface may contain chart overlays and pane-local readouts, but not
  a second command toolbar.

## Session Dashboard

The session dashboard/list is a separate surface from the chart workstation:

- The app boots into the standalone session surface.
- The chart top-left back arrow returns to the standalone session surface.
- Do not add a chart-forward arrow. Entering the chart happens only by creating
  or opening a session from the session surface.
- The primary dashboard entries are only `Backtesting session`, `Sessions`, and
  `Analytics`.
- Do not duplicate these entries as a separate tab strip above the same page
  sections. Keep one clear page hierarchy until a real navigation owner exists.
- `Backtesting session` is the create-session entry. The first setup form only
  exposes `Start`, `End`, and an enter-chart action; symbol and timeframe stay
  on V6 defaults until their own owners exist.
- `Sessions` is the existing session list. `Analytics` is reserved for
  session-segment analysis, including replay orders, live orders, and review
  statistics.
- Do not reintroduce a generic Dashboard overview, Tutorials, Prop firm session,
  promotion panels, or performance charts before their runtime owners exist.
- Session list and dashboard actions may use session commands to create a
  session, list sessions, or select the active session identity.
- Creating or opening a session from the session surface enters the chart
  workstation with active-session identity only. It must not load chart bars,
  replay cursor, replay windows, viewport intent, adapter state, or bar cache
  directly.
- Keep dashboard statistics and trading/account analytics shell-only until their
  own runtime owners exist.

## Chart Entry Activation

Chart entry has a dedicated runtime boundary:

- Session surface code may create/open sessions and switch to the workstation.
- `runtime.chartEntry` owns the first activation record for active-session
  identity after `session:created` or `session:opened`.
- The activation runtime may expose activation state for tests and future
  owners, but must not load chart bars, replay windows, viewport intent, adapter
  state, or bar cache directly.
- Chart-entry initialization plans may list future owner steps such as resolving
  start bar, loading bounded replay context, loading replay state, projecting
  the default wall, and applying chart data/viewport. The plan is a contract,
  not execution.
- `runtime.chartEntryInitialization` may read session metadata and call
  `barData.planWindow` to prepare bounded prefix-plus-start context. It must not
  call `barData.loadWindow`, replay load, chart-data writes, viewport mutation,
  or adapter APIs.
- `runtime.chartEntryContext` may consume initialization plans and call
  `barData.loadWindow` for the planned bounded context only. It must expose
  loaded summaries without leaking mutable bar cache records, and it must not
  load replay state, write chart data, mutate viewport intent, or call adapter
  APIs directly.
- `runtime.chartEntryReplayBootstrap` may consume bounded context loaded events,
  read session metadata, and call `replay.loadSession`. It must not advance
  playback, write chart data, mutate viewport intent, project walls, or call
  chart adapter APIs.
- `runtime.chartEntryDefaultWallPlan` may consume replay bootstrap loaded events
  and produce the initial wall plan. It must not call `defaultWall.load`, write
  chart data, mutate viewport intent, advance replay, or call chart adapter APIs.
- `runtime.chartEntryProjectionPreparation` may consume wall plans, read the
  already-loaded bounded context through `barData.getWindow`, and prepare chart
  data plus viewport payloads. It must not write chart data, mutate viewport
  intent, call `defaultWall.load`, fetch bars, advance replay, or call chart
  adapter APIs.
- `runtime.chartEntryProjectionApply` may consume prepared projection payloads
  and dispatch `chartViewport.ensureIntent` followed by `chartData.replaceBars`.
  It must not call chart adapter APIs directly, call `defaultWall.load`, fetch
  bars, advance replay, or re-own bar/replay state.
- `runtime.chartEntryManualNext` may handle transport next by dispatching
  `replay.next`, loading the cursor bar through `barData.loadWindow`, and
  appending through `chartData.appendBars`. It must not call
  `defaultWall.next`, `defaultWall.load`, chart adapter APIs, or route/shell
  internals.
- `runtime.chartEntryAutoPlay` owns chart-entry playback timer lifecycle.
  Transport play/pause may dispatch auto-play start/stop commands with speed
  payloads, but timer cadence and each playback tick must stay in this runtime.
  Transport speed changes while playing may dispatch `chartEntryAutoPlay.setSpeed`;
  they must not rebuild timers or advance replay from shell code.
  Each tick must reuse `chartEntryManualNext.next` or an equivalent chart-entry
  owner API, not `defaultWall.next`, chart adapter APIs, or shell timers.
- Reset View belongs to chart viewport ownership. UI may dispatch
  `chartViewport.resetView` through a thin bridge with current pane chart-data
  revision and latest logical index, but it must not call chart adapter APIs,
  mutate replay cursor, rewrite chart bars, change playback state, or infer a
  time-based range. Reset View restores the pane's remembered default
  right-side wall offset.
- Missing-session open failures must not change activation state.

## Timeframe Menu

The interval menu should behave like a tool dropdown:

- It opens as a narrow floating panel anchored near the top toolbar.
- It groups intervals by seconds, minutes, hours, and days.
- The selected interval is highlighted as a row, not as a large card.
- `Add custom interval...` belongs at the top of the menu.
- The menu overlays the chart and does not reflow chart layout.

## Layout Sync Policy

The layout panel sync switches are multi-pane policy controls:

- `Symbol` means symbol changes apply to all charts within the layout.
- `Interval` means interval changes apply to all charts within the layout.
- `Crosshair` means crosshair movement is synced across all charts within the
  layout.
- `Time` means clicking a chart aligns all charts to the same point of time.
- `Date range` means date-range changes apply to all charts within the layout.

These controls stay inert until layout/pane sync ownership exists, but their
labels, help text, and default states should match the future policy.

## Indicators, Undo, Redo

Indicators, undo, and redo are reserved top-toolbar commands:

- `Indicators` is a compact icon-plus-label command.
- Undo and redo are icon-only commands with clear disabled states.
- Future implementation should route through explicit command/event boundaries
  or a dedicated indicator/drawing runtime. These controls must not directly own
  chart data, replay cursor, viewport intent, or adapter state.

## Replay Transport

The replay transport is not a generic media player:

- It is a compact floating bar mounted at workstation-shell level, not inside
  the chart/canvas surface.
- Its drag boundary is the full browser viewport, not the chart pane, canvas
  box, or price-scale region.
- It should expose a drag handle, truncate action, speed slider, previous bar,
  play/pause, replay step period menu, next bar, and active-chart-period sync
  toggle.
- The replay step period menu is distinct from the chart display timeframe
  selector. It controls replay cadence/step size once an owner exists.
- The sync toggle means replay step period follows the active chart period once
  an owner exists.
- Controls without a runtime owner must look like real reserved tools, but stay
  inert until their command/event boundary exists.

## Settings Kernel

Settings should use a chart-settings modal, not a full page:

- The modal is centered, dark, dense, and form-oriented.
- The left rail is a tab list with icon plus text: Symbol, Status line, Scales and lines, Canvas.
- The right pane contains grouped chart controls with checkboxes, selects,
  color swatches, sliders, and numeric inputs.
- The footer is fixed with Template on the left and Cancel/Ok on the right.
- Settings text should name chart behaviors, not explain implementation details.
- Settings UI dispatches settings commands and subscribes to settings state. It
  must not directly mutate chart series, replay state, bar cache, or viewport
  intent.

## Visual Tone

The product tone is dark, compact, and professional:

- Prefer restrained borders, dense spacing, and low-contrast chrome.
- Use symbols/icons for tool commands where the meaning is familiar.
- Avoid hero sections, explanatory cards, marketing copy, oversized headings,
  and debug/status ribbons in the primary chart surface.
- Use floating panels and menus for tools; do not convert tool choices into
  large dashboard panels.

## Ownership Guardrails

UI parity work must preserve V6 boundaries:

- UI dispatches commands and subscribes to events.
- Only chart-engine writes adapter series data and logical ranges.
- Only chart-data owns pane-local bars and revisions.
- Only chart-viewport owns viewport intent and projection.
- Only replay/default-wall runtimes own replay cursor and wall progression.
- Settings, indicators, drawing tools, and account/trading UI need explicit
  state owners before they become interactive.

## Non-Goals

- Do not copy FXReplay pixels, spacing, icons, or exact labels blindly.
- Do not implement unfinished trading/account actions as decorative fake
  workflows.
- Do not expose test harness status to ordinary users.
- Do not let UI parity bypass the replay, chart-data, chart-viewport, or
  chart-engine boundaries.
