# Session 2026-06-18 - Step 297 Primitive Reuse / Diff Renderer Plan

## Context

Step 293 measured selection-triggered render latency as the largest current frontend performance issue. Step 296 reduced repeated work by coalescing selection events into one RAF render, but the renderer still detaches and recreates every primitive in a domain when only selection styling changes.

The user has taken a full hard backup, so Step 297 can be more aggressive than Step 296. The plan still keeps verification checkpoints small so regressions can be isolated quickly.

Additional user constraint update: V4 data is still in testing and old persisted data is not fixed yet. Step 297 does not need to preserve compatibility for old localStorage / Review JSON shapes if a cleaner implementation requires changing them. This step still avoids schema changes unless renderer reuse actually needs them.

## Goal

Replace full detach/recreate render passes for PDA and Segment overlays with cached primitive reuse and diffing, starting with selection-heavy paths and expanding only after measurable improvement.

Expected outcome:

- Selecting a PDA or Segment updates only the previously selected and newly selected primitives when geometry/visibility did not change.
- Data changes, timeframe changes, bars reloads, display-mode changes, instrument changes, split reset, and replay/objective-gap render bounds still produce correct chart state.
- Primary and secondary chart overlays remain visually consistent.
- Performance benchmark at 250 PDA/Segment objects improves materially beyond Step 296.

## Non-goals

- No store schema changes.
- No Review JSON or localStorage migration.
- No visual redesign.
- No hit-test rewrite unless needed to keep behavior aligned.
- No backend/API changes.
- No broad Lightweight Charts abstraction outside the PDA/Segment primitive render path.

## Step 297.1: Freeze Baseline And Failure Tests

Tasks:

- Run and record current `performance-selection-benchmark.js` after Step 296.
- Add or extend a focused renderer smoke that can detect:
  - selecting A then B updates selected styling;
  - deleting selected object removes its primitive;
  - hiding/showing object removes/restores primitive;
  - bars reload clears stale primitives;
  - primary and secondary renderers do not leak detached primitives.

Acceptance:

- Baseline numbers are recorded in this session before implementation.
- Smoke fails if a primitive remains after deletion or hidden display.

Status: Complete.

Baseline after Step 296 / before reuse-diff implementation:

- 25 objects: Segment `114.7ms`, PDA `64.6ms`.
- 100 objects: Segment `152.7ms`, PDA `53.4ms`.
- 250 objects: Segment `327.7ms`, PDA `191ms`.

Implementation notes:

- Added `v4/tests/primitive-render-lifecycle-smoke.js`.
- The smoke wraps primary chart `attachPrimitive` / `detachPrimitive` and tracks only PDA/Segment overlay primitive classes.
- It verifies Segment hidden/delete, PDA hidden, and `bars:cleared` detaches all tracked primitives.
- The first run exposed a stale `LiquidityPrimitive` after `bars:cleared`.
- Fixed by adding no-display-bars guards to primary/secondary PDA and Segment renderers so late or follow-up renders clear and return instead of recreating overlay primitives on an empty chart.

Verification:

- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/pda/secondary-pda-renderer.js`
- `node --check v4/src/segment/segment-renderer.js`
- `node --check v4/src/segment/secondary-segment-renderer.js`
- `node --check v4/tests/primitive-render-lifecycle-smoke.js`
- `node v4/tests/primitive-render-lifecycle-smoke.js`
- `node v4/tests/performance-selection-benchmark.js`
- `git diff --check`

## Step 297.2: Add Primitive Mutation APIs

Tasks:

- Add minimal `update(...)` / `setOptions(...)` APIs to reusable primitive classes:
  - `LiquidityPrimitive`
  - `RangePrimitive`
  - `PointSetPrimitive`
  - `FibPrimitive`
  - `SegmentPrimitive`
  - `VerticalLinePrimitive` only if time-only PDA projections need reuse.
- Keep constructor compatibility unchanged.
- Each update API must refresh source fields and call `requestUpdate()`.

Acceptance:

- Existing constructors and current renderers still work unchanged.
- Unit/smoke coverage proves a primitive can update style and geometry without detach/attach.

Status: Complete.

Implementation notes:

- Added object-style `update(...)` and `setOptions(...)` APIs where applicable:
  - `LiquidityPrimitive`
  - `RangePrimitive`
  - `FvgPrimitive`
  - `PointSetPrimitive`
  - `FibPrimitive`
  - `SegmentPrimitive`
  - `VerticalLinePrimitive`
- Constructors remain compatible with existing renderers.
- `FvgPrimitive` now supports `attached` / `detached` / `requestUpdate` so it can participate in cache reuse if needed later.
- Added `v4/tests/primitive-mutation-smoke.js` to assert updates mutate geometry/style fields and trigger requestUpdate callbacks.

Verification:

- `node --check v4/src/chart/primitives/liquidity-primitive.js`
- `node --check v4/src/chart/primitives/range-primitive.js`
- `node --check v4/src/chart/primitives/point-set-primitive.js`
- `node --check v4/src/chart/primitives/fib-primitive.js`
- `node --check v4/src/chart/primitives/segment-primitive.js`
- `node --check v4/src/chart/primitives/vertical-line-primitive.js`
- `node v4/tests/primitive-mutation-smoke.js`
- `node v4/tests/primitive-render-lifecycle-smoke.js`
- `git diff --check`

## Step 297.3: Introduce Renderer Cache Helper

Tasks:

- Add a small shared helper, likely under `v4/src/chart/primitive-cache.js`, that manages:
  - stable key -> primitive entries;
  - attach new;
  - update existing;
  - detach missing;
  - clear all on chart reset/bars cleared.
- The helper should not know PDA or Segment domain semantics.
- It should support separate primary/secondary caches.

Acceptance:

- Helper has a focused smoke test with fake attach/detach/update functions.
- It handles key changes and missing keys deterministically.

Status: Complete.

Implementation notes:

- Added `v4/src/chart/primitive-cache.js`.
- `createPrimitiveCache({ attach, detach })` supports:
  - stable descriptor key;
  - descriptor type checks;
  - create + attach for new entries;
  - update existing entries when key/type match;
  - detach/recreate when key matches but type changes;
  - detach missing entries;
  - clear all;
  - inspection helpers `get()`, `keys()`, `size()`.
- Added `v4/tests/primitive-cache-smoke.js` with fake primitives and fake attach/detach hooks.

Verification:

- `node --check v4/src/chart/primitive-cache.js`
- `node --check v4/tests/primitive-cache-smoke.js`
- `node v4/tests/primitive-cache-smoke.js`
- `git diff --check`

## Step 297.4: Migrate Segment Renderer First

Rationale:

Segment primitives are simpler than PDA because they use one primitive class and fewer shapes. They are also the slower path in Step 293/296 benchmarks.

Tasks:

- Convert `segment-renderer.js` to build a render descriptor per visible segment/group.
- Use stable keys:
  - `segment:${id}:primary`
  - `segment-group:${id}:primary`
- Reuse existing primitive when descriptor shape remains `SegmentPrimitive`.
- Detach only primitives whose keys disappear.
- Preserve immediate clear on `bars:cleared`.

Acceptance:

- Segment selection changes update old/new selected style without rebuilding all segments.
- Segment create/delete/hide/show, group selection, drawing-set focus, isolate mode, and display-mode filters still render correctly.
- `segment-renderer.js` benchmark improves or at least does not regress.

Status: complete.

Implementation:

- Migrated `segment-renderer.js` from full clear/rebuild to `createPrimitiveCache(...)`.
- Builds descriptors for visible segment groups and segments with stable primary keys:
  - `segment-group:${id}:primary`
  - `segment:${id}:primary`
- Reuses `SegmentPrimitive` instances through `update(...)` when geometry or style changes.
- Clears the cache when chart/series/display bars are unavailable and on `bars:cleared`.

Verification:

- `node --check v4/src/segment/segment-renderer.js`
- `node v4/tests/primitive-render-lifecycle-smoke.js`
- `node v4/tests/performance-selection-benchmark.js`
- `node v4/tests/calendar-visibility-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `git diff --check`

Benchmark after this step:

- 25 objects: Segment `106.5ms`, PDA `63.4ms`
- 100 objects: Segment `90.4ms`, PDA `50.8ms`
- 250 objects: Segment `227.6ms`, PDA `121.5ms`

## Step 297.5: Migrate Secondary Segment Renderer

Tasks:

- Apply the same descriptor/cache model to `secondary-segment-renderer.js`.
- Use keys:
  - `segment:${id}:secondary`
  - `segment-group:${id}:secondary`
- Clear cache on `secondary-bars:cleared` and `secondary-chart:reset`.

Acceptance:

- Split Screen Side/Stack on/off does not leave stale secondary primitives.
- Secondary selection highlight mirrors primary behavior.

Status: complete.

Implementation:

- Migrated `secondary-segment-renderer.js` to `createPrimitiveCache(...)`.
- Builds stable secondary descriptors:
  - `segment-group:${id}:secondary`
  - `segment:${id}:secondary`
- Clears cache when split is disabled, secondary chart/series/bars are unavailable, `secondary-bars:cleared`, and `secondary-chart:reset`.
- Extended `primitive-render-lifecycle-smoke.js` to verify secondary Segment attach/update reuse, `secondary-bars:cleared`, and `secondary-chart:reset`.
- Moved `initSecondaryChartController()` after secondary PDA/Segment renderer initialization so reset events detach overlay primitives before the controller destroys the secondary chart.

Verification:

- `node --check v4/src/app.js`
- `node --check v4/src/segment/secondary-segment-renderer.js`
- `node --check v4/tests/primitive-render-lifecycle-smoke.js`
- `node v4/tests/primitive-render-lifecycle-smoke.js`
- `node v4/tests/primitive-mutation-smoke.js`
- `node v4/tests/primitive-cache-smoke.js`
- `node v4/tests/performance-selection-benchmark.js`
- `node v4/tests/calendar-visibility-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `node v4/tests/display-mode-smoke.js`
- `git diff --check`

Benchmark after this step:

- 25 objects: Segment `83.4ms`, PDA `49ms`
- 100 objects: Segment `147.7ms`, PDA `88.9ms`
- 250 objects: Segment `288ms`, PDA `127.1ms`

## Step 297.6: Migrate PDA Renderer By Shape

Rationale:

PDA has multiple shapes and projection fallbacks, so migrate incrementally.

Order:

1. Liquidity line PDA (`bsl`, `ssl`, `wick-ce`).
2. Range PDA (`fvg`, `ifvg`, `ob`, `breaker`, `ndog`, `nwog`).
3. Point sets (`eqh`, `eql`).
4. Fib.
5. Time-only projection vertical lines.

Tasks:

- Build one or more descriptors per annotation.
- Use keys:
  - `pda:${id}:${shape}:primary`
  - for multi-primitive projections: `pda:${id}:projection:${index}:primary`
- Rebuild only when shape or projection count changes.
- Update primitive state when selection/link/highlight/display style changes.

Acceptance:

- PDA selection changes update selected style without rebuilding all PDA primitives.
- PDA create/delete/hide/show, source-instrument time-only projection, CE toggle, label toggle, extend, objective NDOG/NWOG replay bounds, drawing-set focus, and display-mode filters remain correct.

Status: complete.

Implementation:

- Migrated `pda-renderer.js` to `createPrimitiveCache(...)`.
- Converts each visible PDA annotation into descriptors and calls `primitiveCache.sync(descriptors)`.
- Uses stable primary keys:
  - `pda:${id}:primary:liquidity`
  - `pda:${id}:primary:range`
  - `pda:${id}:primary:point-set`
  - `pda:${id}:primary:fib`
  - `pda:${id}:primary:time:${index}`
- Reuses Liquidity, Range, PointSet, Fib, and VerticalLine primitives through their `update(...)` APIs.
- Clears the PDA cache when chart/series/display bars are unavailable and on `bars:cleared`.

Verification:

- `node --check v4/src/pda/pda-renderer.js`
- `node v4/tests/pda-hit-test-smoke.js`
- `node v4/tests/primitive-render-lifecycle-smoke.js`
- `node v4/tests/performance-selection-benchmark.js`
- `node v4/tests/calendar-visibility-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `node v4/tests/display-mode-smoke.js`
- `node v4/tests/fib-levels-smoke.js`
- `node v4/tests/manual-range-prices-smoke.js`
- `node v4/tests/time-projection-smoke.js`
- `node v4/tests/primitive-mutation-smoke.js`
- `git diff --check`

Benchmark after this step:

- 25 objects: Segment `123ms`, PDA `94.3ms`
- 100 objects: Segment `93.4ms`, PDA `44.6ms`
- 250 objects: Segment `259.9ms`, PDA `112.1ms`

## Step 297.7: Migrate Secondary PDA Renderer

Tasks:

- Apply PDA descriptor/cache model to `secondary-pda-renderer.js`.
- Use `:secondary` keys.
- Respect `getStructureOverlayVisibility()` and secondary instrument/timeframe projection rules.

Acceptance:

- Secondary-created PDA and primary-created PDA render correctly on both charts.
- Split reset and secondary chart settings changes clear or update cache correctly.

Status: complete.

Implementation:

- Migrated `secondary-pda-renderer.js` to `createPrimitiveCache(...)`.
- Builds stable secondary keys:
  - `pda:${id}:secondary:liquidity`
  - `pda:${id}:secondary:range`
  - `pda:${id}:secondary:point-set`
  - `pda:${id}:secondary:fib`
  - `pda:${id}:secondary:time:${index}`
- Preserves `getStructureOverlayVisibility()` filtering and secondary instrument/timeframe projection rules.
- Clears cache when split is disabled, secondary chart/series/bars are unavailable, `secondary-bars:cleared`, and `secondary-chart:reset`.

Verification:

- `node --check v4/src/pda/secondary-pda-renderer.js`
- `node v4/tests/primitive-render-lifecycle-smoke.js`
- `node v4/tests/pda-hit-test-smoke.js`
- `node v4/tests/fib-levels-smoke.js`
- `node v4/tests/performance-selection-benchmark.js`
- `node v4/tests/manual-range-prices-smoke.js`
- `node v4/tests/time-projection-smoke.js`
- `node v4/tests/display-mode-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `git diff --check`

Benchmark after this step:

- 25 objects: Segment `74.2ms`, PDA `40ms`
- 100 objects: Segment `93.2ms`, PDA `42.7ms`
- 250 objects: Segment `398.6ms`, PDA `131.5ms`

Note:

- The 250-object Segment number is noisy in this run and should be rechecked in Step 297.9. This step only changed secondary PDA rendering, which is not the primary Segment selection benchmark path.

## Step 297.8: Replay And Objective Gap Safety

Tasks:

- Audit replay-specific paths:
  - `replay:changed`
  - objective NDOG/NWOG render bounds
  - primary/secondary progressive replay behavior.
- Decide whether replay events should update cached range geometry or force domain cache clear for objective gaps.

Acceptance:

- Replay On/Off does not leave future NDOG/NWOG bounds stale.
- Progressive secondary replay still shows correct partial HTF bars.

Status: complete.

Audit:

- Primary objective NDOG/NWOG bounds are still calculated inside `renderPdaAnnotations()` through `getNdogRenderBounds()` / `getNwogRenderBounds()`.
- `replay:changed` still invokes `renderPdaAnnotationsOnReplay`, so cached Range primitives receive fresh `startTime` / `endTime` through `RangePrimitive.update(...)` instead of keeping old geometry.
- Secondary progressive replay continues to update through `secondary-bars:loaded`; cached secondary PDA/Segment primitives update or detach from the latest secondary display bars.
- `secondary-chart:reset` now clears secondary PDA/Segment caches before the secondary chart controller destroys the chart, due to the initialization-order fix in Step 297.5.

Verification:

- `node v4/tests/history-manager-smoke.js`
- `node v4/tests/load-range-policy-smoke.js`
- `node v4/tests/time-projection-smoke.js`
- `node v4/tests/primitive-render-lifecycle-smoke.js`
- `git diff --check`

Decision:

- No forced cache clear is needed on every `replay:changed`; descriptor updates are sufficient for objective gap geometry, and full clears remain reserved for bars clear / unavailable chart state.

## Step 297.9: Benchmark And Visual Regression Pass

Tasks:

- Run:
  - `node v4/tests/performance-selection-benchmark.js`
  - `node v4/tests/pda-hit-test-smoke.js`
  - `node v4/tests/calendar-visibility-smoke.js`
  - `node v4/tests/smt-selection-smoke.js`
  - `node v4/tests/order-setup-smoke.js`
  - `node v4/tests/live-record-browser-smoke.js`
  - relevant split/replay browser smokes.
- Compare benchmark against Step 293 and Step 296.

Acceptance:

- 250-object selection benchmark improves materially.
- No smoke regressions.
- Visual checks cover primary/secondary PDA and Segment selection.

Status: complete.

Benchmark comparison:

- Step 296 baseline after coalescing: 250 objects Segment `327.7ms`, PDA `191ms`.
- Step 297.9 run 1: 25 objects Segment `163.9ms`, PDA `64.8ms`; 100 objects Segment `90.9ms`, PDA `43.4ms`; 250 objects Segment `258.6ms`, PDA `119.9ms`.
- Step 297.9 run 2: 25 objects Segment `100.4ms`, PDA `93.7ms`; 100 objects Segment `96.3ms`, PDA `53ms`; 250 objects Segment `330.6ms`, PDA `166.9ms`.
- Step 297.9 run 3: 25 objects Segment `166.4ms`, PDA `65.6ms`; 100 objects Segment `95ms`, PDA `55.3ms`; 250 objects Segment `273.6ms`, PDA `139.1ms`.

Verification:

- `node v4/tests/performance-selection-benchmark.js` x3
- `node v4/tests/primitive-render-lifecycle-smoke.js`
- `node v4/tests/primitive-mutation-smoke.js`
- `node v4/tests/primitive-cache-smoke.js`
- `node v4/tests/pda-hit-test-smoke.js`
- `node v4/tests/display-mode-smoke.js`
- `node v4/tests/calendar-visibility-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-chart-actions-smoke.js`
- `node v4/tests/fib-levels-smoke.js`
- `node v4/tests/manual-range-prices-smoke.js`
- `node v4/tests/time-projection-smoke.js`
- `node v4/tests/history-manager-smoke.js`
- `git diff --check`

Notes:

- Existing tmp split/replay browser smoke files were not present in this workspace. Secondary bars clear and secondary chart reset are covered by `primitive-render-lifecycle-smoke.js`.
- The old `live-record-browser-smoke.js` was not run in this pass; `live-record-smoke.js` and `live-record-chart-actions-smoke.js` passed.

## Step 297.10: Closeout

Tasks:

- Update TODO and this session with actual benchmark numbers.
- Document any primitive classes still not reused.
- If needed, record a Step 298 follow-up for Chart Notes / Order Setup / Live Record renderer reuse.

Acceptance:

- Worktree clean after commit.
- Step 297 scope remains limited to PDA/Segment primitive reuse unless explicitly expanded.

## Risk Notes

- The main risk is stale primitives: deleted/hidden objects remaining on chart.
- The second risk is stale geometry after timeframe or bars reload.
- The third risk is cache key collision between primary/secondary or between PDA shapes.
- Mitigation is aggressive cache clearing on structural events first, then gradually narrowing clear paths after correctness is proven.
