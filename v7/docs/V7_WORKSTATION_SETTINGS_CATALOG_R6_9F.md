# V7 Workstation Settings Catalog And Ownership — R6.9f

Status: planning contract completed headlessly with automated evidence
(2026-07-22)

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
  current-price label presentation.

Official references:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
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
- Cancel, close, backdrop close, and Escape discard the draft.
- Reset restores defaults only in the draft and persists only after Save.
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
| `session` | Replay schedule or Session behavior | Remains in Session Store or its domain owner; never copied into global Settings |
| `pane-operational` | Instrument, TF, Viewport, maximize state, active focus | Remains with Pane/Layout/Viewport owners; never becomes a visual preference |
| `pane-appearance` | Per-Pane color or visibility override | Rejected until a concrete user journey justifies inheritance and override semantics |

Consequences:

- Quick GoTo Custom Settings remain Session-scoped Replay Navigation settings.
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
| OHLC/change readout | Workstation Settings | Pane overlay/readout view | Preserve existing selected/latest Crosshair semantics |
| Current-price line/label | Workstation Settings | Lightweight Chart adapter only | Presentation-only; no Replay or price calculation ownership |
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
| `canvas.backgroundColor` | Canvas background | Chart adapter | Implement |
| `canvas.gridVisible` | Horizontal and vertical grid visibility | Chart adapter | Implement |
| `canvas.gridColor` | Shared grid color | Chart adapter | Implement |
| `canvas.crosshairColor` | Shared Crosshair color | Chart adapter | Implement |
| `canvas.scaleTextColor` | Price/time-axis text color | Chart adapter | Implement |
| `canvas.axisBorderColor` | Price/time-axis border color | Chart adapter | Implement |
| `canvas.scaleFontSize` | Bounded axis font size | Chart adapter | Implement after direct colors |
| `canvas.topMarginPercent` | Price-scale top margin | Chart adapter | Implement after direct colors |
| `canvas.bottomMarginPercent` | Price-scale bottom margin | Chart adapter | Implement after direct colors |
| `canvas.rightMarginBars` | Default/reset right wall | Viewport Runtime | Defer to a separate Viewport-owned slice |

### Candles — first direct series slice

| Stable field id | Control | Consumer | Decision |
| --- | --- | --- | --- |
| `candles.upBodyColor` / `downBodyColor` | Up/down candle body | Chart adapter | Implement |
| `candles.bordersVisible` | Candle borders | Chart adapter | Implement |
| `candles.upBorderColor` / `downBorderColor` | Up/down border color | Chart adapter | Implement |
| `candles.upWickColor` / `downWickColor` | Up/down wick color | Chart adapter | Implement |
| `candles.pricePrecision` | Price decimals | Symbol metadata plus Chart adapter | Defer until metadata/default truth is selected |
| `candles.colorByPreviousClose` | Alternate candle semantics | None | Reject; V7 retains open-versus-close candles |

### Pane information and price presentation

| Stable field id | Control | Consumer | Decision |
| --- | --- | --- | --- |
| `paneReadout.ohlcVisible` | OHLC visibility | Pane overlay/readout | Implement |
| `paneReadout.changeVisible` | Absolute/percent change visibility | Pane overlay/readout | Implement |
| `currentPrice.lineVisible` | Current-price line | Chart adapter | Implement |
| `currentPrice.labelVisible` | Current-price value label | Chart adapter | Implement |
| `paneReadout.symbolVisible` | Symbol identity | Pane overlay/readout | Reject hiding; identity/provenance stays visible |
| `paneReadout.timeframeVisible` | TF identity | Pane overlay/readout | Reject hiding; identity/provenance stays visible |
| `paneReadout.marketStateVisible` | Market-open state | Calendar/readout | Defer until exchange-calendar truth exists |
| `paneReadout.volumeVisible` | Volume | Data/readout | Defer until volume provenance is accepted |

### Interface

| Stable field id | Control | Consumer | Decision |
| --- | --- | --- | --- |
| `interface.paneControlDock` | `hover` or `always` | Replay Workspace UI | Implement; `hidden` waits for alternate accessible actions |
| `interface.theme` | Full dark/light interface | Shared token presentation | Defer until hard-coded replay surfaces consume shared tokens |
| `interface.replayTransportVisible` | Replay transport visibility | Replay Workspace UI | Reject hiding; it is essential Replay state/control |
| `interface.activePaneBoundaryVisible` | Active Pane boundary | Pane grid | Reject hiding in multi-Pane; active ownership must stay unambiguous |
| `interface.failureStateVisible` | Loading/error/unavailable state | Owning UI surface | Reject hiding; failures must remain honest |

The first visibility slice is deliberately small: grid, OHLC, change,
current-price presentation, and Pane control-dock mode. Generic "hide any UI"
would make essential Replay state and failure recovery inaccessible.

### Time presentation and session-aware overlays

- New York Quick GoTo anchor values remain canonical Session settings and are
  not global presentation fields.
- Replay Session range and stored instants never change with formatting.
- User-selectable display timezone/date/time formats remain deferred until one
  shared formatter can cover chart axes, Crosshair labels, calendars, Session
  Browser, and Exact GoTo consistently.
- Trading-day/ICT separators remain future Calendar-owned overlays, not direct
  Settings calculations.

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
- Viewport tests: a changed default right margin preserves every manual wall;
- browser tests: Session A/B share global appearance while their Quick GoTo
  settings remain isolated; hard reload restores both scopes correctly;
- stable-toolbar/performance tests: Settings application and later candle
  refresh do not remount or flash toolbar/transport DOM;
- fixed visual fixtures for defaults and one high-contrast customized state;
- architecture, module-host, source-quality, optional-removal, and
  `git diff --check` gates.

## Delivery Order

1. R6.9f freezes this catalog and ownership contract without production code.
2. After R6.9e human acceptance, R6.9g delivers the already-designed separate
   Exact GoTo Calendar surface.
3. R6.9h activates the versioned Workstation Settings model, persistence,
   runtime, transactional draft shell, and one honest Grid consumer.
4. R6.9i activates the direct Canvas and Candles catalog through chart-owned
   `applyOptions` fan-out.
5. R6.9j activates the bounded Pane readout/current-price/control visibility
   catalog.
6. R6.10 returns to the remaining Symbol/Interval/Time/Date-range layout-sync
   families. Deferred Viewport/time/theme fields receive later bounded steps
   only when their owners are ready.

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
