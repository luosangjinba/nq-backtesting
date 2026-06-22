# Step 309: Chart Context Locate Routing Implementation Plan

Date: 2026-06-22

## Background

Step 308 designed the Split-only workflow migration track. The first implementation item is locate routing because many remaining Split dependencies are primary/secondary branches in Inspector and Calendar actions.

Current locate behavior is scattered across:

- `chart/viewport-controller.js` for primary;
- `chart/secondary-viewport-controller.js` for old Split secondary;
- `pda/pda-locate-actions.js` for PDA projection locate/flash;
- `ui/inspector/calendar-actions.js`;
- `ui/inspector/time-reaction-actions.js`;
- `ui/inspector/order-review-reason-actions.js`;
- `ui/inspector/live-record-actions.js`;
- one-off primary locate in `comparison/comparison-context-menu.js`.

The goal is not to delete Split. The goal is to route locate behavior through a shared chart target contract so Comparison Window can participate where source metadata points to it.

## Product Boundary

- Preserve current primary and secondary behavior.
- Do not remove Split.
- Do not auto-open Comparison Window during locate.
- Do not silently fall back from comparison to primary when the object source is comparison.
- Keep status messages explicit about which target located or why it failed.

## Locate Result Contract

The router should return a structured result:

```js
{
  located: true,
  range: { start, end },
  targets: {
    primary: { located: true, reason: '' },
    secondary: { located: false, reason: 'not-enabled' },
    'comparison-window': { located: true, reason: '' }
  }
}
```

Suggested target ids:

- `primary`
- `secondary`
- `comparison-window`
- `both`

`both` should initially mean current historical behavior: primary + secondary. Comparison should only be included when explicitly requested or when the source object metadata identifies comparison as the target.

## Planned Steps

### Step 309.1: Add Viewport Router Foundation

Implement `v4/src/chart/viewport-router.js`.

Responsibilities:

- Export chart target constants.
- Normalize ranges.
- Route `primary` to `viewport.locateTimestampRange`.
- Route `secondary` to `secondaryViewport.locateSecondaryTimestampRange`.
- Return structured results instead of bare booleans.
- Preserve `flash: false` options.
- Provide helper functions:
  - `locateChartRange(chartId, range, options = {})`;
  - `locateChartRangeMany(chartIds, range, options = {})`;
  - `formatLocateTargets(result)` or equivalent status helper if useful.

Verification:

- Focused smoke covering primary success, secondary disabled, secondary success, invalid range, and `both`.
- Existing primary/secondary callers are not migrated in this step unless needed for tests.

### Step 309.2: Add Comparison Viewport Locate Support

Add Comparison Window range locate support.

Implementation options:

- Add `chart/comparison-viewport-controller.js`, mirroring primary/secondary locate logic with comparison chart/store/manager.
- Or make `viewport-router` use chart context APIs directly for comparison if that remains simple.

Rules:

- Only locate when Comparison Window is enabled and has display bars.
- Do not enable or open Comparison Window automatically.
- Use comparison display bars and comparison timeframe for nearest-bar lookup.
- Reset comparison price scale after locate.
- Add flash support if low-risk; otherwise return located without custom flash in the first pass and document it.

Verification:

- Focused comparison locate smoke with enabled/disabled and loaded/unloaded cases.
- Browser smoke can assert visible logical range changes or a stable located result through an exposed action.

### Step 309.3: Migrate PDA Projection Locate

Update `pda/pda-locate-actions.js`.

Current behavior:

- `locatePdaProjection()` locates primary and secondary only.
- It separately calls primary and secondary viewport controllers.

Target behavior:

- Use viewport router for range locate.
- Include comparison when:
  - `options.chart === 'comparison-window'`; or
  - annotation `sourceChartId === 'comparison-window'` and caller wants source-target locate.
- Preserve current `primary`, `secondary`, and `both` behavior.
- Keep PDA price projection flash when the target chart can render that projection.

Verification:

- PDA locate smoke for primary, secondary, both, and comparison source annotation.
- Ensure old status copy can still distinguish primary/secondary until callers migrate.

### Step 309.4: Migrate Calendar Locate

Update `ui/inspector/calendar-actions.js`.

Current behavior:

- Generic calendar object locate calls primary and secondary directly.
- PDA calendar locate uses `locatePdaProjection`.

Target behavior:

- Generic locate uses router with current default `both` behavior.
- PDA locate uses migrated `locatePdaProjection`.
- Comparison-source objects should route to comparison when available.
- Chart Note focused-date behavior remains tied to primary chart notes unless separately expanded.

Verification:

- Browser smoke or focused DOM smoke for calendar object locate preserving primary/secondary.
- Comparison-source PDA/FVG/Segment locate reaches comparison after comparison support exists.

### Step 309.5: Migrate Order Review And Live Record Reason Locate

Update:

- `ui/inspector/order-review-reason-actions.js`
- `ui/inspector/live-record-actions.js`

Current behavior:

- PDA refs use `locatePdaProjection`.
- Segment refs branch on `sourceChartId === 'secondary'`; comparison falls back to primary.
- Chart Notes use primary chart note flash only.

Target behavior:

- Use router for Segment and other range-bearing refs based on `sourceChartId`.
- `sourceChartId=comparison-window` routes to comparison and reports unavailable if comparison is closed/unloaded.
- PDA refs use migrated `locatePdaProjection`.
- Chart Note can remain primary-only unless/until chart notes are represented in comparison source metadata.

Verification:

- Focused smoke for order review reason locate with primary, secondary, comparison source ids.
- Live Record equivalent smoke or shared helper test if logic is extracted.

### Step 309.6: Migrate Time Reaction Locate

Update `ui/inspector/time-reaction-actions.js`.

Current behavior:

- Locate target selector supports primary/secondary.
- Ref locate uses primary/secondary branches and `locatePdaProjection`.
- Order Setup locate is primary-only.

Target behavior:

- Internal locate uses router.
- Existing UI selector remains primary/secondary unless comparison is explicitly added to the selector.
- Comparison target should be representable in the locate model so future UI can expose it without another architecture change.
- Order Setup locate remains primary unless a future source-specific setup range model exists.

Verification:

- Time Reaction locate smoke preserves primary/secondary.
- Comparison ref locate works for comparison-source PDA/Segment after upstream migrations.

### Step 309.7: Verification And Closeout

Run and record:

- focused viewport router smoke;
- PDA locate smoke;
- comparison browser smoke;
- SMT selection smoke if PDA/SMT locate interaction was touched;
- `git diff --check`.

Closeout updates:

- Mark Step 309 complete in TODO/session.
- Document remaining locate limitations, if any.

## Risks

- Flash primitives are not identical across chart managers.
- PDA price projection flash may need chart-specific support for comparison.
- Some callers expect booleans and simple status copy; router returns richer results.
- Comparison Window should not be opened implicitly, so some locate attempts will correctly fail where secondary used to be available.

## Non-goals

- Do not remove Split.
- Do not migrate pick-preview in Step 309.
- Do not migrate hit-test link in Step 309.
- Do not add fixed-layout replacement behavior to Comparison Window.
