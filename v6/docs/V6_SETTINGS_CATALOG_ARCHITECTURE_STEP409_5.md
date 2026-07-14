# Step 409.5 - Settings Catalog And Ownership Architecture

Status: accepted planning constraint; production implementation is gated by
Step 409 human visual acceptance.

## Why This Planning Step Exists

FXReplay is a useful interaction reference, but copying its four tabs field by
field would mix chart-engine options, viewport intent, replay/session rules,
and workstation preferences into one Settings runtime. V6 instead defines the
complete catalog first, then implements bounded slices through their owning
modules.

This step does not add a production setting. It replaces the old assumption
that Step 410 should immediately add 12/24-hour formatting with an ordered,
owner-aware Settings plan.

## Existing Capability Check

Lightweight Charts 5.2 already exposes suitable options for the direct visual
parts of the catalog:

- `LayoutOptions`: chart background, scale text color, and scale font size;
- `GridOptions`: horizontal and vertical grid-line styles;
- `CrosshairOptions`: horizontal and vertical crosshair-line styles;
- `PriceScaleOptions`: border style and top/bottom `scaleMargins`;
- `TimeScaleOptions`: border style and right-side offset.

Official references:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LayoutOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/GridOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CrosshairOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceScaleOptions
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TimeScaleOptions
- https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples
- https://github.com/tradingview/awesome-tradingview

The official plugin examples and awesome-tradingview index do not provide an
application Settings owner, a transactional draft, an ICT-aware day separator,
or a shared timezone/time-format preference. V6 must keep those application
semantics in its own owners while using chart options instead of rebuilding
native chart rendering.

## Architecture Decision

### One catalog and one transactional shell

The Settings modal may present multiple tabs, but it is a catalog-driven shell,
not the runtime owner of every feature. Each catalog entry records:

- stable field id;
- tab and group;
- value type and default source;
- scope;
- owning runtime or surface;
- consumer bridge;
- persistence and migration policy;
- apply mode;
- implementation status and acceptance owner.

The Step 409 draft/OK/Cancel/Reset transaction remains the only modal commit
protocol. A field must not become active until its consumer and acceptance test
exist in the same bounded step.

### Scopes

V6 uses these scopes and does not create a separate store per tab:

| Scope | Meaning | Initial policy |
| --- | --- | --- |
| `workstation` | User-wide presentation preference | Durable global record |
| `workspace-chart` | Visual defaults for every current pane | Initial Canvas/Symbol/Status/Scales scope |
| `pane` | Explicit active-pane override | Deferred until a proven multi-pane need |
| `symbol` | Instrument metadata/default such as tick precision | Data/symbol owner, optional user override later |
| `session` | Replay-session behavior or schedule | Existing Session or Replay Navigation owner, not copied into global Settings |

`Apply to all` is therefore not part of the first implementation. Initial chart
presentation commits already target all panes through one workspace-chart
bridge. A future pane override may add `Apply to all`, but only after an
inheritance/reset contract is selected.

### Owner routing

- Settings runtime validates and persists committed preference records.
- Settings shell owns only DOM draft behavior and tab navigation.
- Chart Surface bridge maps committed visual preferences to adapter options.
- Chart Viewport runtime remains the only owner of default/manual walls and
  reset-view intent.
- Session Calendar owns ET/DST day boundaries.
- Status readout owns title/OHLC/change/volume presentation.
- Symbol/data metadata owns tick size and default price precision.
- Replay Navigation keeps canonical `HH:mm` schedule values.

No tab may call Lightweight Charts, mutate replay, request bars, or write raw
browser storage.

## Binding Catalog

### Canvas

| Field id | Product control | Scope / owner | Decision |
| --- | --- | --- | --- |
| `canvas.backgroundColor` | Background color | workspace-chart / Chart Surface | Implement |
| `canvas.gridVisible` | One grid visibility toggle | workspace-chart / Chart Surface | Implement; maps both grid directions |
| `canvas.gridColor` | One grid color | workspace-chart / Chart Surface | Implement |
| `canvas.daySeparators` | Off / trading day 18:00 ET / ICT day 00:00 ET / both | workspace-chart + Session Calendar overlay | Implement after direct options |
| `canvas.tradingDaySeparatorStyle` | 18:00 ET line color/style | workspace-chart + Session Calendar overlay | Implement with separator slice |
| `canvas.ictDaySeparatorStyle` | 00:00 ET line color/style | workspace-chart + Session Calendar overlay | Implement with separator slice |
| `canvas.crosshairColor` | Shared crosshair color | workspace-chart / Chart Surface | Implement |
| `canvas.scaleTextColor` | Price/time-axis text color | workspace-chart / Chart Surface | Implement |
| `canvas.scaleFontSize` | Price/time-axis font size | workspace-chart / Chart Surface | Implement with bounded range |
| `canvas.axisBorderColor` | Price-axis and time-axis border color | workspace-chart / Chart Surface | Implement |
| `canvas.navigationVisibility` | Hover / always / hidden for V6 fullscreen/reset controls | workspace-chart / Shell presentation | Implement after direct options |
| `canvas.topMarginPercent` | Price-scale top margin | workspace-chart / Chart Surface | Implement through `scaleMargins` |
| `canvas.bottomMarginPercent` | Price-scale bottom margin | workspace-chart / Chart Surface | Implement through `scaleMargins` |
| `canvas.rightMarginBars` | Latest-bar default/reset wall | workspace-chart / Chart Viewport | Implement through Viewport Intent conversion, never a second adapter-owned wall |
| `canvas.watermark` | Watermark | none | Reject for current product value |
| `canvas.paneControlsVisibility` | Unknown FXReplay pane control | none | Reject until a V6 use case exists |

Top/bottom margins are live price-scale margins, not merely reset coordinates.
Right margin is measured in bars and must be translated by Chart Viewport; it
must not make `TimeScaleOptions.rightOffset` a second durable viewport owner.

### Symbol

| Field id | Product control | Scope / owner | Decision |
| --- | --- | --- | --- |
| `symbol.upBodyColor` / `downBodyColor` | Candle body colors | workspace-chart / series presentation | Implement |
| `symbol.upBorderColor` / `downBorderColor` | Candle border colors | workspace-chart / series presentation | Implement |
| `symbol.upWickColor` / `downWickColor` | Candle wick colors | workspace-chart / series presentation | Implement |
| `symbol.pricePrecision` | Auto or 0-6 decimals | symbol default + optional workspace override / symbol metadata | Implement simplified list |
| `symbol.fractionalPrecision` | Bond-style fractions | symbol metadata | Defer until a supported instrument requires it |
| `symbol.colorByPreviousClose` | Color bar by previous close | none | Reject; V6 keeps open-vs-close candle semantics |
| `symbol.displayTimezone` | Exchange / New York / UTC / Local | workstation / time presentation | Implement globally, not as a Symbol-owned field |

Timezone persistence must use stable semantic/IANA identifiers such as
`America/New_York`, not a fixed `UTC-4` label, so DST remains correct.

### Status line

| Field id | Product control | Scope / owner | Decision |
| --- | --- | --- | --- |
| `status.titleMode` | Hidden / ticker / description / both | workspace-chart / Status Readout | Implement |
| `status.marketStateVisible` | Replay-cursor market-state dot | session calendar + Status Readout | Defer until exchange-calendar truth exists |
| `status.ohlcVisible` | OHLC values | workspace-chart / Status Readout | Implement |
| `status.barChangeVisible` | Absolute and percent change | workspace-chart / Status Readout | Implement |
| `status.volumeVisible` | Volume | data contract + Status Readout | Defer until volume provenance is reliable |
| `status.background` | Status row background/opacity | workspace-chart / Status Readout | Implement |

Market state must be computed from the replay cursor and exchange calendar; it
must never display the computer's current real-market state during replay.

### Scales and lines

| Field id | Product control | Scope / owner | Decision |
| --- | --- | --- | --- |
| `scales.modeControlsVisibility` | Hover / always / hidden for Auto/Log controls | workspace-chart / Shell presentation | Defer until controls exist |
| `scales.currentPriceNameVisible` | Symbol name in current-price label | workspace-chart / series presentation | Implement |
| `scales.currentPriceValueVisible` | Current-price value label | workspace-chart / series presentation | Implement |
| `scales.currentPriceLineVisible` | Current-price line | workspace-chart / series presentation | Implement |
| `scales.dateFormat` | ISO / DD-MM / MM-DD presentation | workstation / time presentation | Defer to shared date-format slice |
| `scales.timeFormat` | 24-hour / 12-hour | workstation / time presentation | Implement through existing global time contract |
| `scales.dayOfWeekVisible` | Weekday on time labels | workstation / time presentation | Defer until label-density behavior is proven |
| `scales.lockPriceToBarRatio` | Coupled price/time zoom | none | Reject |
| `scales.placement` | Left/right/auto price scale | none | Reject; V6 keeps the price scale right-aligned |
| `scales.noOverlappingLabels` | Avoid label collisions | Chart Surface invariant | Always on; no user setting |
| `scales.plusButton` | Quick order/drawing button | Orders/Drawing | Not Settings; future feature surface |
| `scales.countdownToBarClose` | Live bar countdown | none | Reject for completed-bar historical replay |
| `scales.previousDayClose` | Previous close overlay | future chart overlay | Not Settings until overlay exists |
| `scales.highLow` | High/low overlay | future chart overlay | Not Settings until overlay exists |
| `scales.keepLeftEdgeOnIntervalChange` | Preserve left edge on TF switch | none | Reject; conflicts with Viewport Intent and default/manual wall rules |

## Shared UI Primitives

The shell may reuse small input components across tabs:

- checkbox/switch;
- select and segmented choice;
- color field with one shared normalization/contrast policy;
- bounded numeric field with unit suffix;
- searchable timezone select;
- controlled canonical `HH:mm` time selector;
- tab/group renderer driven by catalog metadata.

Reusing controls does not merge feature owners. Color parsing may be shared;
applying candle colors and applying crosshair colors still travel through their
own consumer mappings.

## Reset And Rejected Configuration Management

- `Reset` remains draft-only and resolves defaults for the currently visible
  tab; it persists only through OK.
- Step 417 rejects Settings templates, Apply to all, and per-Pane Settings
  overrides for the lightweight V6 product.
- These capabilities may be reconsidered only through a new product decision
  backed by a concrete user journey; competitor parity is insufficient.

## Ordered Implementation Plan

Production work remains blocked until Step 409 human visual acceptance passes.
After that gate:

1. Step 410 - Canvas Direct Chart Options: background, grid visibility/color,
   crosshair color, scale text color/font size, and axis border color.
2. Step 411 - Canvas View And Controls: navigation visibility, top/bottom
   margins, and right-margin bars through Chart Viewport.
3. Step 412 - Session/ICT Day Separators: session-calendar/DST-aware overlays.
4. Step 413 - Symbol Presentation: body/border/wick colors and precision.
5. Step 414 - Status Line Presentation.
6. Step 415 - Scales And Current Price Presentation.
7. Step 416 - Global Time Presentation: timezone, 12/24-hour format, shared
   formatter, and controlled time inputs.
8. Step 417 - Settings Scope Closeout: reject templates, Apply to all, and
   per-Pane Settings overrides; close the expansion sequence without code.

Each step activates only controls with a real consumer, adds migration only for
its own fields, preserves atomic modal commits, and runs multi-pane/reload
acceptance before the next step.

## Stop Conditions

Stop a Settings step if it:

- creates one monolithic runtime that applies every tab;
- adds a visible control before its consumer exists;
- stores a replay/session value in the workspace Settings record;
- lets a chart adapter become the durable owner of viewport intent;
- stores a fixed UTC offset for a DST-aware timezone;
- introduces pane overrides before reset/inheritance/Apply-to-all semantics;
- lets templates capture replay, data, or validation state;
- bypasses the Step 409 transactional draft or versioned persistence boundary.
