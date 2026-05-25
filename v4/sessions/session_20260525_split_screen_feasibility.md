# V4 Split Screen Feasibility

## Branch
- `research/v4-split-screen-feasibility`

## Step 1: MVP Scope

## Goal
- Solve the practical review problem: keep the current primary chart workflow intact while viewing a lower-timeframe detail chart for the same time range.
- First target use case:
  - primary chart: 1H structure / segment / PDA review
  - secondary chart: 1M / 5M / 30M execution detail

## MVP Decision
- Build a `primary chart + readonly secondary chart` split-screen first.
- Primary chart remains the current full V4 chart:
  - load range
  - replay
  - right-click PDA creation
  - manual segment creation
  - PDA / segment / composite rendering
  - hit-test selection
  - Inspector
- Secondary chart is readonly in the first pass:
  - displays candlesticks only
  - has independent timeframe
  - loads the same absolute start/end range as the primary chart
  - can show a synchronized replay cursor later

## Explicit Non-Goals For MVP
- No PDA creation on the secondary chart.
- No segment creation on the secondary chart.
- No secondary-chart right-click menu.
- No Inspector selection from the secondary chart.
- No secondary replay controls.
- No PDA / segment / composite rendering on the secondary chart in the first pass.
- No bidirectional viewport synchronization in the first pass.
- No multi-secondary-chart layout.

## Reasoning
- Current V4 is built around singletons:
  - `chart-manager.js` owns one chart and one candlestick series.
  - `bar-store.js` owns one current timeframe and one bars array.
  - PDA / segment renderer and hit-test read the global chart and global timeframe.
  - manual annotation and selection bind to fixed DOM ids such as `#chart` and `#pda-context-menu`.
  - replay controls directly mutate the global chart data.
- Making two fully editable V4 charts immediately would require refactoring chart, data, selection, renderer, context-menu, replay, and Inspector state at the same time.
- A readonly secondary chart gives the needed visual comparison while keeping the primary workflow stable.

## Acceptance Criteria For Step 1
- Scope is fixed as readonly secondary chart.
- Primary chart behavior must not be changed by the MVP.
- Later implementation steps must preserve a clean path to optional future features:
  - secondary PDA / segment rendering
  - crosshair synchronization
  - viewport synchronization
  - secondary-chart click-to-focus

## Next Step
- Step 2: prepare HTML/CSS layout for an optional secondary chart panel while preserving the existing primary chart DOM ids and behavior.

## Step 2: Layout Skeleton

## Implementation
- Added `#chart-stack` as the vertical chart container inside `#chart-area`.
- Wrapped the existing primary chart in `#primary-chart-panel`.
- Preserved the existing primary chart DOM ids:
  - `#chart`
  - `#ohlc-legend`
  - `#pda-context-menu`
  - `#viewport-controls`
- Added a hidden readonly secondary chart shell:
  - `#secondary-chart-panel`
  - `#secondary-chart`
- Added CSS for future split mode:
  - default state keeps the secondary panel hidden and the primary chart full height
  - `#chart-area.split-screen-enabled` will display the secondary panel below the primary panel
  - primary/secondary height split defaults to roughly `64% / 36%`

## Compatibility Notes
- No runtime JS behavior was changed in this step.
- Existing `chart.initChart('chart')` should continue to initialize the same primary chart element.
- Existing right-click menu, viewport controls, replay controls, selection, hit-test, and Inspector bindings still target the original primary chart ids.

## Next Step
- Step 3: add a secondary chart manager for the readonly chart instance without touching the existing primary `chart-manager.js` singleton.

## Step 3: Secondary Chart Manager

## Implementation
- Added `v4/src/chart/secondary-chart-manager.js`.
- The module owns its own secondary chart state:
  - `secondaryChart`
  - `secondarySeries`
  - `resizeObserver`
  - replay/sync cursor primitive
  - active data count / last time
- It reuses existing shared visual configuration:
  - `CHART_THEME`
  - `CANDLESTICK_STYLE`
  - `TIME_SCALE_DISPLAY`
  - tick-size price formatting
  - `VerticalLinePrimitive`
- Public functions prepared for later wiring:
  - `initSecondaryChart(containerId = 'secondary-chart')`
  - `getSecondaryChart()`
  - `getSecondarySeries()`
  - `setSecondaryData(data)`
  - `updateSecondaryBar(bar)`
  - `clearSecondaryData()`
  - `showSecondaryStartOfData(dataCount)`
  - `showSecondaryEndOfData(dataCount)`
  - `showSecondaryCursor(time)`
  - `hideSecondaryCursor()`
  - `destroySecondaryChart()`

## Compatibility Notes
- Existing primary `chart-manager.js` was not modified.
- `app.js` does not initialize the secondary chart yet.
- This step has no runtime effect until later toolbar/store wiring calls `initSecondaryChart()`.

## Next Step
- Step 4: add secondary chart state for `enabled / timeframe / bars / requestedRange` without reusing the primary `bar-store.js`.

## Step 4: Secondary Chart State

## Implementation
- Added `v4/src/data/secondary-chart-store.js`.
- The secondary chart now has its own isolated state:
  - `enabled`
  - `bars`
  - `currentStart`
  - `currentEnd`
  - `currentTimeframe`
  - `requestedRange`
- Default secondary timeframe is `1H`.
- Public functions prepared for later toolbar / loader wiring:
  - `setSecondaryEnabled(nextEnabled)`
  - `isSecondaryEnabled()`
  - `setSecondaryTimeframe(tf)`
  - `getSecondaryTimeframe()`
  - `setSecondaryBars(newBars, start, end, tf, range)`
  - `getSecondaryBars()`
  - `getSecondaryRequestedRange()`
  - `getSecondaryDisplayBars()`
  - `getSecondaryCurrentRange()`
  - `getSecondaryBarCount()`
  - `clearSecondaryBars()`
  - `resetSecondaryChartState()`

## Event Boundary
- Uses independent event names so existing primary chart renderers and replay do not react accidentally:
  - `secondary-chart:settings-changed`
  - `secondary-bars:loaded`
  - `secondary-bars:cleared`
  - `secondary-chart:reset`

## Compatibility Notes
- Existing primary `bar-store.js` was not modified.
- No module imports this secondary store yet, so current runtime behavior remains unchanged.

## Next Step
- Step 5: add toolbar controls for enabling split screen and choosing the secondary timeframe.

## Step 5: Toolbar Controls

## Implementation
- Added Split Screen controls to the existing toolbar:
  - `Split` checkbox
  - `Sub TF` timeframe selector
- The controls use `secondary-chart-store.js`:
  - `Split` writes `setSecondaryEnabled()`
  - `Sub TF` writes `setSecondaryTimeframe()`
- Added `syncSplitScreenLayout()` in `toolbar.js`:
  - toggles `#chart-area.split-screen-enabled`
  - toggles `#secondary-chart-panel.hidden`
  - enables/disables the secondary timeframe selector
  - keeps the selector value in sync with secondary store state
- Added CSS for `.toolbar-toggle`.

## Compatibility Notes
- This step only controls layout and secondary state.
- It still does not initialize `secondary-chart-manager.js`.
- It still does not fetch secondary bars.
- Turning Split on currently reveals an empty secondary panel, which is expected until Step 6.

## Next Step
- Step 6: connect secondary chart initialization and loading; when Split is enabled, fetch secondary bars for the primary chart's current absolute range.

## Step 6: Secondary Chart Loading

## Implementation
- Added `v4/src/ui/secondary-chart-controller.js`.
- Wired it from `app.js` with `initSecondaryChartController()`.
- The controller listens to:
  - `secondary-chart:settings-changed`
  - `secondary-bars:loaded`
  - `secondary-bars:cleared`
  - `secondary-chart:reset`
  - primary `bars:loaded`
  - primary `bars:cleared`
- When Split is enabled:
  - waits one animation frame so the hidden panel has been shown
  - initializes `secondary-chart-manager.js`
  - reads the primary chart's current `start/end`
  - fetches bars for `secondaryStore.getSecondaryTimeframe()`
  - writes them into `secondary-chart-store.js`
  - renders the secondary candlestick series
- When primary bars reload while Split is enabled:
  - secondary bars reload for the same absolute range.
- When Sub TF changes while Split is enabled:
  - secondary bars reload for the same primary range.
- Request sequencing prevents stale secondary fetch responses from overwriting newer timeframe/range requests.

## Compatibility Notes
- Primary chart data flow remains unchanged.
- Secondary chart uses independent store events and does not emit primary `bars:loaded`.
- Secondary chart remains readonly:
  - no PDA render
  - no segment render
  - no right-click menu
  - no Inspector selection
  - no secondary replay controls

## Next Step
- Step 7: synchronize the existing primary replay cursor timestamp onto the secondary chart.

## Step 7: Replay Cursor Sync

## Implementation
- `secondary-chart-controller.js` now listens to the primary `replay:changed` event.
- If Split is enabled and primary replay is active:
  - reads `cursorTimestamp`
  - maps it to the current secondary timeframe bucket with `getBucketStart()`
  - converts daily timeframe cursor to the TradingView chart date string
  - draws a readonly vertical cursor on the secondary chart with `showSecondaryCursor()`
- If Split is disabled, replay is off, or the cursor timestamp is invalid:
  - hides the secondary cursor with `hideSecondaryCursor()`

## Compatibility Notes
- This does not slice secondary chart data during replay.
- Secondary chart remains a full readonly context view; the cursor is only a time marker.
- Primary replay controls and primary replay data mutation remain unchanged.

## Next Step
- Step 8: secondary chart lifecycle hardening: ensure close/reset/reload paths clear state predictably and do not leave stale cursors or stale secondary data.

## Step 8: Lifecycle Hardening

## Implementation
- Hardened `secondary-chart-controller.js` lifecycle paths:
  - closing Split now clears secondary bars before destroying the secondary chart
  - primary `bars:cleared` increments request sequence, clears secondary store, and clears secondary chart data
  - starting a secondary reload clears stale secondary bars/data before the new fetch resolves
  - stale fetch responses still cannot overwrite newer Split/Sub TF/range requests because request sequencing remains in place
- Added `lastReplayState` tracking:
  - latest primary replay state is kept inside the secondary controller
  - after secondary bars render or Sub TF reloads, the secondary replay cursor is recalculated from the latest primary `cursorTimestamp`
  - this prevents a cursor drawn for an old secondary timeframe bucket from surviving a Sub TF change

## Compatibility Notes
- Split off means no secondary chart instance and no secondary bars remain in memory.
- Secondary reloads briefly show an empty secondary panel instead of stale old-range data.
- Primary chart lifecycle and replay lifecycle remain unchanged.

## Next Step
- Step 9: run broader verification for primary chart non-regression and split-screen workflows.

## Step 9: Verification

## Static Checks
- `node --check v4/src/app.js`
- `node --check v4/src/ui/toolbar.js`
- `node --check v4/src/ui/secondary-chart-controller.js`
- `node --check v4/src/data/secondary-chart-store.js`
- `node --check v4/src/chart/secondary-chart-manager.js`

All checks passed.

## Service Checks
- `http://127.0.0.1:8766/v4/health` returned ok.
- `http://127.0.0.1:8001/index.html` served normally.

## Browser Workflow Check
- Used headless Chrome DevTools against `http://127.0.0.1:8001/index.html`.
- Initial state:
  - Split off
  - secondary panel hidden
  - secondary canvas count `0`
  - primary chart canvas count `7`
  - Sub TF disabled
- Primary load without Split:
  - loaded `2012-01-25 09:00` to `2012-01-25 10:00`
  - primary chart stayed active
  - secondary panel stayed hidden
  - replay toggle became enabled
- Split load:
  - Split on
  - secondary panel visible
  - Sub TF default was `5M` during the original MVP verification; it was changed to `1H` in the follow-up below
  - secondary canvas count `7`
  - status reported secondary load complete
- Sub TF reload:
  - switched Sub TF to `1M`
  - secondary reloaded successfully
  - status reported `副图已加载 98 根K线`
- Replay cursor path:
  - primary Replay Bar turned on
  - secondary chart remained rendered
  - Split stayed active
- Close Split:
  - Split off
  - secondary panel hidden
  - secondary canvas count `0`
  - Sub TF disabled
  - primary chart canvas count still `7`

## Result
- Step 1-8 MVP is functionally viable as a readonly secondary chart.
- No primary chart regression was observed in the checked paths.

## Next Step
- Step 10: decide whether to stop MVP here and commit, or continue with optional extensions such as secondary PDA/segment rendering, crosshair sync, viewport sync, or click-to-focus.

## Step 10: Crosshair One-Way Sync

## Goal
- Add main-chart-to-secondary-chart hover synchronization while keeping the secondary chart readonly.

## Proposed Scope
- Synchronize only primary chart crosshair to secondary chart.
- Do not synchronize secondary chart crosshair back to primary chart.
- Do not synchronize viewport.
- Do not make the secondary chart selectable or editable.

## Implementation
- Added a separate hover cursor primitive in `secondary-chart-manager.js`.
- Kept hover cursor independent from replay cursor:
  - replay cursor remains stable and slightly stronger
  - hover cursor is lighter and follows mouse movement
- Added public functions:
  - `showSecondaryHoverCursor(time)`
  - `hideSecondaryHoverCursor()`
- In `secondary-chart-controller.js`:
  - listens to primary `chart.onCrosshairMove()`
  - map primary hover time to secondary timeframe bucket
  - calls `showSecondaryHoverCursor(mappedTime)`
  - hide hover cursor when Split is off, primary hover has no time, mouse leaves the primary chart, or secondary has no bars

## Edge Cases
- Numeric intraday chart time can be mapped directly.
- Daily primary chart time uses loaded display bars to recover timestamp before mapping.
- Hover cursor should not replace or erase replay cursor.

## Verification
- `node --check v4/src/chart/secondary-chart-manager.js`
- `node --check v4/src/ui/secondary-chart-controller.js`
- `node --check v4/src/data/secondary-chart-store.js`
- `node --check v4/src/ui/toolbar.js`
- Headless Chrome workflow:
  - opened Split
  - loaded `2012-01-25 09:00` to `2012-01-25 12:00`
  - confirmed default secondary timeframe `1H`
  - enabled primary Replay Bar
  - dispatched mouse move on the primary chart
  - confirmed no runtime exceptions
  - confirmed secondary chart canvas remained rendered

## Completed Follow-up: Default Secondary Timeframe
- Changed the secondary chart default timeframe from `5M` to `1H`.
- Implementation:
  - `v4/src/data/secondary-chart-store.js`
  - `DEFAULT_SECONDARY_TIMEFRAME = 60`
  - toolbar `Sub TF` default-selects `1H`.
- Verification:
  - `node --check v4/src/data/secondary-chart-store.js`
  - `node --check v4/src/ui/toolbar.js`
  - `node --check v4/src/ui/secondary-chart-controller.js`
  - headless Chrome confirmed initial `Sub TF=60/1H` and disabled while Split is off
  - headless Chrome confirmed Split on keeps `Sub TF=60/1H`, renders secondary chart canvas, and loads 1H secondary bars

## Completed Follow-up: Split Layout Mode
- Added a selectable split-screen layout mode.
- `secondary-chart-store.js` now tracks `layout=stack|side`.
- Toolbar now includes a Layout select next to Split / Sub TF.
- Split off disables the Layout select.
- `syncSplitScreenLayout()` toggles:
  - `split-screen-stack`
  - `split-screen-side`
- `Stack` remains default:
  - vertical top/bottom split
  - `#chart-stack { flex-direction: column }`
  - primary/secondary ratio about `64% / 36%`
- `Side` is available as a desktop/wide-screen option:
  - horizontal left/right split
  - `#chart-stack { flex-direction: row }`
  - primary/secondary ratio about `60% / 40%`
  - secondary chart is on the left
  - primary chart is on the right
  - secondary panel uses `border-right` instead of `border-top`
- No changes were made to secondary data loading or rendering logic.

## Verification
- `node --check v4/src/data/secondary-chart-store.js`
- `node --check v4/src/ui/toolbar.js`
- `node --check v4/src/ui/secondary-chart-controller.js`
- `node --check v4/src/chart/secondary-chart-manager.js`
- Headless Chrome workflow:
  - initial Layout is `stack` and disabled while Split is off
  - Split on enables Layout and keeps `stack`
  - secondary chart loads and renders canvas
  - switching Layout to `side` applies `split-screen-side`
  - `#chart-stack` computed `flex-direction` becomes `row`
  - secondary chart order is left of primary chart
  - secondary panel uses `border-right: 1px` and `border-top: 0`
  - no runtime exceptions observed

## Follow-up: Readonly Overlay Sync

## Goal
- Let the secondary chart display existing PDA / segment / composite context without becoming editable.

## Scope
- Secondary chart remains readonly.
- No secondary-chart editing.
- No secondary-chart hit-test.
- No secondary-chart right-click menu.
- No secondary-chart selection or Inspector opening.
- All source data remains the existing primary/session stores.

## Proposed Implementation
- Add independent secondary renderers:
  - first `secondary-segment-renderer.js` for segment/composite
  - later `secondary-pda-renderer.js` for PDA
- Renderers read existing stores and attach primitives to the secondary chart/series.
- Do not directly reuse current primary renderers because they are hard-bound to:
  - global primary `chart.getChart()`
  - global primary `chart.getSeries()`
  - global primary timeframe
- Preferred direction:
  - extract shared render-time helpers / primitive builders, or
  - keep secondary renderers explicit and pass secondary chart context directly.

## Mapping Rules
- Segment endpoints:
  - use `getSegmentPointRenderTime(point, secondaryTf)`.
- Composite move:
  - use first child start endpoint and last child end endpoint mapped to secondary timeframe.
- PDA timestamps:
  - map with `getBucketStart(timestamp, secondaryTf)`.
- Display filtering:
  - first version follows the same Display Mode resolver as the primary chart.

## Phasing
- Phase 1: sync segment/composite only.
- Phase 2: sync PDA after segment/composite rendering is stable.
- Phase 3: optionally sync selected/linked highlight styling.
- First version can render everything in normal style to avoid confusing the readonly boundary.

## Consolidated Extension Plan

## Order
1. Add readonly secondary segment/composite renderer.
   - New `secondary-segment-renderer.js`.
   - No hit-test, selection, right-click menu, or Inspector.
   - Use `getSegmentPointRenderTime(point, secondaryTf)`.
   - First version uses normal style only.
2. Add readonly secondary PDA renderer.
   - New `secondary-pda-renderer.js`.
   - Start with liquidity-line and range.
   - Add point-set and fib after core PDA rendering is stable.
   - Use `getBucketStart(timestamp, secondaryTf)` for time mapping.
3. Verify.
   - Run `node --check` on changed modules.
   - Headless Chrome coverage:
     - default secondary timeframe is `1H`
     - Stack / Side switching
     - crosshair hover cursor
     - replay cursor and hover cursor coexist
     - segment/composite overlay
     - PDA overlay
     - Split close cleanup
     - primary annotation / segment / Inspector / replay non-regression.

## Priority
- Do steps 1-3 first because they are localized and low risk.
- Do overlay sync after layout/cursor behavior is stable because renderer extraction and duplicate chart context are higher risk.

## Executed: Readonly Segment/Composite Overlay

## Implementation
- Added `v4/src/segment/secondary-segment-renderer.js`.
- The renderer is intentionally separate from the primary `segment-renderer.js`:
  - reads the existing segment and composite stores
  - reads the shared Display Mode resolver
  - attaches primitives to the secondary chart/series only
  - does not register hit-test, click, right-click, selection, or Inspector behavior
- Segment endpoint mapping uses `getSegmentPointRenderTime(point, secondaryTf)`, so existing 1H occurrence-time alignment also applies when the secondary chart is lower timeframe.
- Composite move rendering uses:
  - first child segment start
  - last child segment end
  - both mapped through the secondary timeframe
- First version uses normal readonly styling only. It does not mirror selected/draft/group-child highlight styling, avoiding ambiguity about whether the secondary chart is editable.
- Added secondary primitive helpers in `secondary-chart-manager.js`:
  - `attachSecondaryPrimitive()`
  - `detachSecondaryPrimitive()`
  - `clearSecondaryPrimitives()`
- Wired `initSecondarySegmentRenderer()` from `app.js`.

## Event Coverage
- Re-renders on:
  - `segment:changed`
  - `segment-group:changed`
  - segment/group selection changes
  - `display-mode:changed`
  - `secondary-bars:loaded`
  - `secondary-chart:settings-changed`
- Clears on:
  - `secondary-bars:cleared`
  - `secondary-chart:reset`

## Static Verification
- `node --check v4/src/segment/secondary-segment-renderer.js`
- `node --check v4/src/chart/secondary-chart-manager.js`
- `node --check v4/src/app.js`

All checks passed.

## Next Step
- Add readonly secondary PDA renderer.
- Start with liquidity-line and range PDA shapes, then add point-set/fib after the first PDA overlay pass is stable.

## Executed: Readonly PDA Overlay Phase 1

## Implementation
- Added `v4/src/pda/secondary-pda-renderer.js`.
- The renderer is independent from the primary `pda-renderer.js`:
  - reads existing PDA annotations
  - follows the shared Display Mode resolver via `shouldRenderPda()`
  - attaches primitives to the secondary chart/series only
  - does not register hit-test, right-click, selection, or Inspector behavior
- Phase 1 supports:
  - `liquidity-line`
  - `range`
- Time mapping:
  - canonical/timestamp fields map through `getBucketStart(timestamp, secondaryTf)`
  - daily secondary chart time is converted to the chart date string
- Range behavior preserved:
  - CE/midline
  - `extendBars`
  - label visibility
  - FVG/IFVG borderless style
- First version uses normal readonly styling only and intentionally does not mirror selected/linked highlight styling.
- Wired `initSecondaryPdaRenderer()` from `app.js`.

## Static Verification
- `node --check v4/src/pda/secondary-pda-renderer.js`
- `node --check v4/src/app.js`

All checks passed.

## Remaining
- Run full headless Chrome verification across:
  - default 1H secondary chart
  - Stack / Side layout
  - crosshair and replay cursor coexistence
  - segment/composite overlay
  - PDA liquidity/range overlay
  - Split close cleanup
  - primary workflow non-regression

## Executed: Readonly PDA Overlay Phase 2

## Implementation
- Extended `v4/src/pda/secondary-pda-renderer.js` to support:
  - `point-set`
  - `fib-retracement`
- `point-set` mapping:
  - each EQH/EQL point maps its canonical/timestamp through the secondary timeframe
  - reference price, marker position, label visibility, and extendBars follow the annotation data
- `fib-retracement` mapping:
  - start/end points map through the secondary timeframe
  - level prices reuse the existing Fib formula from the primary renderer
  - level visibility, labels, trend line visibility, and extendBars follow the annotation data
- The secondary PDA renderer remains readonly:
  - no hit-test
  - no selection
  - no right-click
  - no Inspector
  - no selected/linked highlight mirroring

## Static Verification
- `node --check v4/src/pda/secondary-pda-renderer.js`

The check passed.

## Remaining
- Run full headless Chrome verification across:
  - default 1H secondary chart
  - Stack / Side layout
  - crosshair and replay cursor coexistence
  - segment/composite overlay
  - PDA liquidity/range/point-set/fib overlay
  - Split close cleanup
  - primary workflow non-regression
