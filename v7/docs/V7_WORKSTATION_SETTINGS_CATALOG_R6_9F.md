# V7 Workstation Settings Catalog And Ownership — R6.9f

Status: base planning contract completed headlessly on 2026-07-22; product
catalog refined by R6.9g on 2026-07-22. This document contains the current
combined binding catalog.

## Why This Step Lands Now

V7's Replay, Pane Workspace, Pane Layout, Chart Snapshot Application,
Lightweight Charts adapter, Viewport, Session Store, and shared Calendar
boundaries now have real production owners. That makes this the first point at
which Settings can route each preference to an established consumer instead
of becoming another shell-owned mutation path.

The timing is still safe because chart colors and most workstation presentation
remain construction-time constants. It must not be postponed until indicators,
orders, Journal, or other business modules add more presentation consumers.

This is a planning-only step. It activates no production control, persistence
record, runtime, chart mutation, or visible behavior.

## Existing Capability Check

Lightweight Charts 5.2 already supplies the native hooks needed by the direct
chart portions of this catalog:

- `IChartApi.applyOptions` accepts partial chart options after construction;
- `ISeriesApi.applyOptions` accepts candlestick presentation changes without
  replacing series data;
- chart layout, grid, crosshair, price-scale, and time-scale options cover the
  direct Canvas fields;
- candlestick series options cover body, border, wick, current-price line, and
  current-price label presentation;
- built-in/custom price formats cover metadata-derived Auto precision and
  explicit display precision without changing accepted bar prices;
- Crosshair line options natively cover color, width, and line style; adapter
  color normalization can combine the chosen color and opacity;
- series `title`, `lastValueVisible`, and `priceLineVisible` provide the native
  starting point for current-price Name, Value, and Line, but all eight
  combinations require focused verification before that catalog is activated.

V7 also already owns the two data facts required by the R6.9g refinement:

- every Instrument Definition carries an exact decimal `priceIncrement`, so
  `Auto` precision has an honest metadata source;
- raw and projected bars carry non-negative finite `volume` or explicit
  `null`, and aggregate volume remains `null` when any contributing source
  value is unavailable.

Official references:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceFormatBuiltIn
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceFormatCustom
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CrosshairLineOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TimeScaleOptions
- https://tradingview.github.io/lightweight-charts/tutorials/customization/chart-colors
- https://github.com/tradingview/awesome-tradingview

The ecosystem does not supply V7's application-wide owner, draft transaction,
durable preference record, multi-product-Pane fan-out, or Session/Pane scope
policy. V7 uses native options behind its adapter and owns those product
semantics itself.

## Product Decision

### One global Settings owner

A future `core.workstation-settings` module will own:

- the immutable normalized committed preference value;
- schema version and deterministic migrations;
- default resolution;
- hydration and one monotonic Settings revision;
- atomic Save/Reset commands over an injected persistence port;
- observable validation, persistence, and consumer-application failures.

The Settings UI owns only its DOM and one disposable draft. It must not write
storage, call Lightweight Charts, mutate CSS outside its presentation port,
request bars, move Replay, or issue a Workspace transaction.

### Draft and commit semantics

- Opening Settings copies the latest committed snapshot into a UI-local draft.
- Editing the draft has no external effect in the first implementation.
- Save validates and submits the complete draft as one change.
- Valid draft changes use owner-managed reversible presentation preview.
- Cancel, close, backdrop close, and Escape discard the draft and restore the
  committed presentation.
- Reset restores and previews defaults only in the draft and persists only
  after Save.
- A failed Save keeps the dialog open, reports the specific failure, and leaves
  the prior committed/durable value and every mounted consumer unchanged.
- A successful Save closes only after persistence and all currently mounted
  mandatory consumers acknowledge the same Settings revision.
- A newly mounted consumer must apply the latest committed snapshot before its
  first ready paint.

Live preview is deferred. It requires an explicit reversible preview port and
must never silently turn draft edits into committed chart state.

## Scope Model

| Scope | Meaning | V7 policy |
| --- | --- | --- |
| `workstation` | User-wide presentation preference | One durable global record, shared by Session Browser and Replay Workspace |
| `workspace-chart` | Visual defaults for all current and future product Panes | Stored in the global record and fanned out through chart/presentation owners |
| `session` | Explicit Replay range, instruments, and Session behavior | Remains in Session Store; never copied into global Settings |
| `pane-operational` | Instrument, TF, Viewport, maximize state, active focus | Remains with Pane/Layout/Viewport owners; never becomes a visual preference |
| `pane-appearance` | Per-Pane color or visibility override | Rejected until a concrete user journey justifies inheritance and override semantics |

Consequences:

- Quick GoTo Custom Settings are global Replay Navigation preferences under a
  separate domain-specific key; they are not visual Workstation Settings.
- Global Settings are persisted under a separate global key and do not increase
  the Session workspace schema.
- Visual preferences already apply to every Pane, so V7 needs no `Apply to all`
  command.
- Settings templates/import/export are outside the current local workstation
  need.

## Consumer Routing

| Preference family | Durable owner | Applying owner | Required invariant |
| --- | --- | --- | --- |
| Canvas native options | Workstation Settings | Lightweight Chart adapter through Pane-set fan-out | Apply to every mounted Pane and to future Pane construction without series data writes |
| Candlestick presentation | Workstation Settings | Lightweight Chart adapter only | `series.applyOptions`; never `setData`/`update` for a style change |
| Shared price formatting | Workstation Settings | Price-presentation formatter plus Lightweight Chart adapter | One precision across price axis, current-price value, OHLC, and absolute change; never round stored bars |
| OHLC/change readout | Workstation Settings | Pane overlay/readout view | Preserve existing selected/latest Crosshair semantics |
| Current-price line/label | Workstation Settings | Lightweight Chart adapter presentation | Preserve independent Name/Value/Line intent; do not silently couple unsupported native combinations |
| Pane control visibility | Workstation Settings | Replay Workspace UI | Do not remove essential recovery/navigation access |
| Workstation design tokens | Workstation Settings | Shared application presentation port | Apply consistently across Session Browser, Calendar, dialogs, and Replay Workspace |
| Default right margin | Workstation Settings | Viewport Runtime | Update default/reset intent only; never overwrite a manual wall |
| Time/date formatting | Workstation Settings | Future shared time-presentation owner | Do not change stored instants, Session range, Replay cutoff, or New York schedule truth |

Chart Settings application is a presentation transaction, not a Workspace
transaction. It must not increment Replay, Pane Workspace, accepted Workspace,
series-data, or Viewport revisions unless the specific field is owned by
Viewport. Multi-Pane application must preserve the prior complete presentation
if any mounted chart rejects the new revision.

## Catalog

Only a field with a real consumer and focused acceptance evidence may become
active. An inactive or deferred field must not appear as a working control.

### Appearance — first direct chart slice

| Stable field id | Control | Consumer | Decision |
| --- | --- | --- | --- |
| `canvas.backgroundColor` | Solid Canvas background | Chart adapter | Implement; no gradient mode |
| `canvas.gridVisible` | Horizontal and vertical grid visibility | Chart adapter | Implement |
| `canvas.gridColor` | User-selectable grid color | Chart adapter | Reject; use the design-token color behind one visibility switch |
| `canvas.crosshairColor` | Shared Crosshair color | Chart adapter | Implement |
| `canvas.crosshairOpacityPercent` | Shared Crosshair opacity | Chart adapter | Implement with a bounded percentage composed into both line colors |
| `canvas.crosshairWidth` | Shared Crosshair thickness | Chart adapter | Implement with supported native line widths |
| `canvas.crosshairStyle` | Solid / dashed / dotted | Chart adapter | Implement as one style for horizontal and vertical lines |
| `canvas.scaleTextColor` | Price/time-axis text color | Chart adapter | Implement |
| `canvas.axisBorderColor` | User-selectable Canvas/axis border color | Chart adapter | Reject; retain the design-token boundary |
| `canvas.scaleFontSize` | Bounded axis font size | Chart adapter | Implement after direct colors |
| `canvas.topMarginPercent` | Price-scale top margin | Chart adapter | Implement after direct colors |
| `canvas.bottomMarginPercent` | Price-scale bottom margin | Chart adapter | Implement after direct colors |
| `canvas.rightMarginBars` | Default/reset right wall | Viewport Runtime | Implement in R6.9l through the Viewport port; never overwrite a manual wall |
| `canvas.sessionBreaks` | RTH/non-RTH special background | None | Reject; it adds visual noise and is not an accepted Calendar overlay |
| `canvas.watermark` | Watermark | None | Reject for current product value |

### Candles — first direct series slice

| Stable field id | Control | Consumer | Decision |
| --- | --- | --- | --- |
| `candles.bodyVisible` | Candle body visibility | Chart adapter | Implement through a verified adapter mapping; the library has no direct body-visible option |
| `candles.upBodyColor` / `downBodyColor` | Up/down candle body | Chart adapter | Implement |
| `candles.bordersVisible` | Candle borders | Chart adapter | Implement |
| `candles.upBorderColor` / `downBorderColor` | Up/down border color | Chart adapter | Implement |
| `candles.wicksVisible` | Candle wick visibility | Chart adapter | Implement with the native series option |
| `candles.upWickColor` / `downWickColor` | Up/down wick color | Chart adapter | Implement |
| `candles.pricePrecision` | Auto / integer / 1-15 decimals | Instrument metadata, shared price formatter, and Chart adapter | Implement; Auto derives from exact `priceIncrement`, manual modes use a tested formatter while preserving the real tick increment |
| `candles.fractionalPrecision` | 1/2, 1/4, 1/8 and other fractional quotes | Instrument metadata | Reject until a supported instrument requires fractions |
| `candles.colorByPreviousClose` | Alternate candle semantics | None | Reject; V7 retains open-versus-close candles |

### Pane information and price presentation

| Stable field id | Control | Consumer | Decision |
| --- | --- | --- | --- |
| `paneReadout.ohlcVisible` | OHLC visibility | Pane overlay/readout | Implement |
| `paneReadout.changeVisible` | Absolute/percent change visibility | Pane overlay/readout | Implement |
| `paneReadout.volumeVisible` | Volume visibility | Pane overlay/readout | Implement, default off; render unavailable `null` honestly as `Vol —` |
| `currentPrice.lineVisible` | Current-price line | Chart adapter | Implement |
| `currentPrice.nameVisible` | Symbol name in current-price label | Chart adapter | Implement |
| `currentPrice.valueVisible` | Current-price value label | Chart adapter | Implement |
| `currentPrice.percentageVisible` | Percentage in current-price label | None | Reject; adds no current Replay value |
| `paneReadout.symbolVisible` | Symbol identity | Pane overlay/readout | Reject hiding; identity/provenance stays visible |
| `paneReadout.timeframeVisible` | TF identity | Pane overlay/readout | Reject hiding; identity/provenance stays visible |
| `paneReadout.titleMode` | Description / ticker / both | Symbol/readout | Reject; retain compact symbol plus TF identity |
| `paneReadout.marketStateVisible` | Market-open state | Calendar/readout | Reject until a future exchange-calendar journey requires it |
| `paneReadout.background` | Separate status background | Pane overlay/readout | Reject; readout remains integrated into the Canvas |

### Interface

| Stable field id | Control | Consumer | Decision |
| --- | --- | --- | --- |
| `interface.paneControlDockVisibility` | `hover` / `always` / `hidden` | Replay Workspace UI | Implement for the existing lower-right Maximize/Reset dock |
| `interface.theme` | Full dark/light interface | Shared token presentation | Defer until hard-coded replay surfaces consume shared tokens |
| `interface.replayTransportVisible` | Replay transport visibility | Replay Workspace UI | Reject hiding; it is essential Replay state/control |
| `interface.activePaneBoundaryVisible` | Active Pane boundary | Pane grid | Reject hiding in multi-Pane; active ownership must stay unambiguous |
| `interface.failureStateVisible` | Loading/error/unavailable state | Owning UI surface | Reject hiding; failures must remain honest |

The first visibility slice is deliberately small: grid, OHLC, change, volume,
current-price name/value/line, and Pane control-dock mode. Generic "hide any
UI" would make essential Replay state and failure recovery inaccessible.

R6.9k must exercise all eight Name/Value/Line combinations against real
Lightweight Charts 5.2. If native `title` and `lastValueVisible` cannot preserve
one combination, the adapter must expose a bounded presentation mechanism or
the product contract must return for review; it may not silently couple the
three stored fields.

### Scales and overlays

| Stable field id | Control | Consumer | Decision |
| --- | --- | --- | --- |
| `scales.modeControlVisibility` | Auto/Log control visibility | None yet | Reject until those controls exist |
| `scales.lockPriceToBarRatio` | Lock price/bar ratio | None | Reject |
| `scales.placement` | Left/right/auto price axis | None | Reject; keep the price scale on the right |
| `scales.noOverlappingLabels` | Label collision avoidance | Chart invariant | Always on; not a preference |
| `scales.plusButtonVisible` | Quick plus action | Orders/drawing | Reject from Settings |
| `scales.countdownVisible` | Countdown to bar close | None | Reject for completed-bar replay |
| `overlays.previousDayClose` | Previous-close value/line | Future overlay owner | Defer as a business overlay, not an initial Settings field |
| `overlays.highLow` | High/low value/line | Future overlay owner | Defer as a business overlay, not an initial Settings field |
| `viewport.keepLeftEdgeOnIntervalChange` | Preserve left edge on TF change | Viewport Runtime | Reject; conflicts with accepted default/manual wall intent |

### Time presentation and session-aware overlays

- New York Quick GoTo anchor values remain canonical global Replay Navigation
  preferences and are not time-presentation fields.
- Replay Session range and stored instants never change with formatting.
- `time.displayTimezone` implements only `America/New_York`, `UTC`, and browser
  local presentation. It stores semantic identifiers rather than fixed
  `UTC-4` offsets. New York remains the default.
- `time.dateFormat` implements `YYYY-MM-DD`, `YYYY/MM/DD`, `DD/MM/YYYY`, and
  `MM/DD/YYYY` with visibly different examples in the selector.
- `time.dayOfWeekVisible` controls the weekday prefix on detailed Crosshair/
  calendar labels without forcing a weekday onto every dense intraday tick.
- `time.hourFormat` implements 12-hour and 24-hour presentation everywhere.
- These fields activate only when one shared formatter can cover chart axes,
  Crosshair labels, calendars, Session Browser, and Exact GoTo consistently.
- Trading-day/ICT separators remain future Calendar-owned overlays, not direct
  Settings calculations.
- FXReplay-style RTH `Session breaks` background remains rejected; it is not
  the same product feature as a future ICT/trading-day boundary overlay.

## Persistence Boundary

The global record will use a dedicated namespace such as
`v7.workstation-settings:global`, with its own schema and revision. It may reuse
the existing injected browser-storage adapter, but it must not reuse Session
identity keys, Session Store CAS methods, or the Session workspace envelope.

Hydration rules:

- no stored value resolves to normalized defaults;
- older supported versions migrate deterministically and are rewritten only by
  the Settings owner;
- malformed or unsupported records report an observable recovery state and
  fall back safely without preventing workstation startup;
- only normalized committed values are durable;
- every consumer receives the same immutable Settings revision.

## Required Evidence For Production Slices

- model tests: defaults, strict normalization, unknown fields, schema versions,
  migrations, corruption, and unavailable persistence;
- runtime tests: hydrate-before-snapshot, one Save/Reset commit, failure
  preservation, and monotonic Settings revision;
- UI tests: draft isolation, Cancel/close/Escape/backdrop, draft-only Reset,
  Save failure, keyboard focus, and reopen from latest committed state;
- adapter tests: all current Panes plus newly created Panes, no `setData` or
  `update`, no Replay/Workspace/Pane revision, and complete rollback on failure;
- Symbol tests: Body/Border/Wick visibility and colors survive every
  combination; Auto precision derives from exact `priceIncrement`; manual
  integer/1-15 decimal overrides format axis/current-price/OHLC/change
  consistently without changing stored values or the real tick increment; and
  fractional modes remain unavailable;
- readout tests: OHLC/change behavior is unchanged, aggregate Volume is shown
  only when enabled, `null` remains visibly unknown rather than zero, and all
  eight current-price Name/Value/Line combinations are truthful;
- Canvas tests: one grid toggle, solid background, shared Crosshair
  color/opacity/width/style, text presentation, and all three control-dock
  visibility modes apply to every Pane;
- Viewport tests: a changed default right margin preserves every manual wall;
- time tests: New York DST, UTC/local display, four real date formats,
  weekday toggle, and 12/24-hour formatting never change canonical instants;
- browser tests: Session A/B share global appearance and the global Quick GoTo
  schedule while the two domain-specific records remain independently owned;
  hard reload restores both scopes correctly;
- stable-toolbar/performance tests: Settings application and later candle
  refresh do not remount or flash toolbar/transport DOM;
- fixed visual fixtures for defaults and one high-contrast customized state;
- architecture, module-host, source-quality, optional-removal, and
  `git diff --check` gates.

## Delivery Order

1. R6.9f freezes the base catalog and ownership contract without production
   code.
2. R6.9g records the user-reviewed product refinement for Precision, Volume,
   Crosshair, simplified Grid, current-price controls, and time presentation.
3. After R6.9e human acceptance, R6.9h delivers the already-designed separate
   Exact GoTo Calendar surface.
4. R6.9i activates the versioned Workstation Settings model, persistence,
   runtime, transactional four-tab shell, and one honest Grid consumer.
5. R6.9j activates Symbol candle presentation and Auto/manual price precision.
6. R6.9k activates OHLC/change/Volume and current-price name/value/line controls.
7. R6.9l activates solid Canvas background, shared Crosshair presentation,
   scale text, control-dock visibility, and owner-routed margins.
8. R6.9m activates shared New York/UTC/local, date, weekday, and 12/24-hour
   presentation.
9. R6.10 returns to the remaining Symbol/Interval/Time/Date-range layout-sync
   families. Full theme editing remains deferred until all surfaces consume
   shared tokens.

## Stop Conditions

Stop a production Settings step if it:

- stores a global preference in a Session record;
- moves Pane instrument, TF, Viewport, active focus, layout, maximize, or Replay
  state into global Settings;
- lets Settings UI or runtime call Lightweight Charts directly;
- uses style changes to call `setData`, request bars, move Replay, or issue a
  Workspace transaction;
- exposes a field before its real consumer and acceptance test exist;
- applies only to the active Pane or requires a later `Apply to all` repair;
- creates per-Pane appearance overrides, templates, or import/export without a
  new user journey;
- adds a fake theme switch while chart/workstation surfaces remain hard-coded;
- lets a draft, failed Save, or stale Settings revision become visible.
