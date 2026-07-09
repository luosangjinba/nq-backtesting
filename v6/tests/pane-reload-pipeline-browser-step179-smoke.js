import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { createBarDataRuntime } = await import('/v6/src/bar-data/bar-data-runtime.js');
      const { createChartDataRuntime } = await import('/v6/src/chart-data/chart-data-runtime.js');
      const { createChartDataProjectionRuntime } = await import('/v6/src/chart-data-projection/chart-data-projection-runtime.js');
      const { connectChartDataSurfaceBridge } = await import('/v6/src/chart-engine/chart-data-surface-bridge.js');
      const { connectChartViewportSurfaceBridge } = await import('/v6/src/chart-engine/chart-viewport-surface-bridge.js');
      const { mountWorkstationChartSurface } = await import('/v6/src/chart-engine/workstation-chart-surface.js');
      const { createChartViewportRuntime } = await import('/v6/src/chart-viewport/chart-viewport-runtime.js');
      const {
        BAR_DATA_COMMANDS,
        CHART_DATA_COMMANDS,
        PANE_COMMANDS,
        PANE_INTENT_RELOAD_CHART_DATA_COMMANDS,
        PANE_INTENT_RELOAD_DATA_COMMANDS,
        PANE_INTENT_RELOAD_PLAN_COMMANDS,
        PANE_INTENT_RELOAD_VIEWPORT_COMMANDS,
        REPLAY_COMMANDS,
      } = await import('/v6/src/contracts/app-contracts.js');
      const { createPaneIntentReloadChartDataRuntime } = await import('/v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js');
      const { createPaneIntentReloadDataRuntime } = await import('/v6/src/pane-intent-reload/pane-intent-reload-data-runtime.js');
      const { createPaneIntentReloadRuntime } = await import('/v6/src/pane-intent-reload/pane-intent-reload-runtime.js');
      const { createPaneIntentReloadViewportRuntime } = await import('/v6/src/pane-intent-reload/pane-intent-reload-viewport-runtime.js');
      const { createPaneIntentReloadWindowRuntime } = await import('/v6/src/pane-intent-reload/pane-intent-reload-window-runtime.js');
      const { createPaneRecord } = await import('/v6/src/panes/pane-model.js');
      const { createPaneRuntime } = await import('/v6/src/panes/pane-runtime.js');
      const { createPaneStore } = await import('/v6/src/panes/pane-store.js');
      const { createReplayRuntime } = await import('/v6/src/replay/replay-runtime.js');
      const { clearCommandsForTest, dispatchCommand } = await import('/v6/src/runtime/commands.js');
      const { clearEventsForTest, emitEvent, subscribeEvent } = await import('/v6/src/runtime/events.js');
      const { createRuntimeRegistry } = await import('/v6/src/runtime/lifecycle.js');

      clearCommandsForTest();
      clearEventsForTest();

      function minuteTimestamp(hour, minute) {
        return Math.floor(Date.UTC(2026, 5, 1, hour, minute, 0, 0) / 1000);
      }

      function barsForWindow(window = {}) {
        return [
          { close: 101, high: 102, low: 99, open: 100, timestamp: minuteTimestamp(9, 22) },
          { close: 102, high: 103, low: 100, open: 101, timestamp: minuteTimestamp(9, 23) },
          { close: 103, high: 104, low: 101, open: 102, timestamp: minuteTimestamp(9, 24) },
          { close: 104, high: 105, low: 102, open: 103, timestamp: minuteTimestamp(9, 25) },
          { close: 105, high: 106, low: 103, open: 104, timestamp: minuteTimestamp(9, 26) },
          { close: 106, high: 107, low: 104, open: 105, timestamp: minuteTimestamp(9, 27) },
          { close: 107, high: 108, low: 105, open: 106, timestamp: minuteTimestamp(9, 28) },
          { close: 108, high: 109, low: 106, open: 107, timestamp: minuteTimestamp(9, 29) },
          { close: 109, high: 110, low: 107, open: 108, timestamp: minuteTimestamp(9, 30) },
          { close: 110, high: 111, low: 108, open: 109, timestamp: minuteTimestamp(9, 31) },
          { close: 111, high: 112, low: 109, open: 110, timestamp: minuteTimestamp(9, 32) },
        ];
      }

      async function waitForProjectedCount(count) {
        const deadline = performance.now() + 3000;
        let state = await dispatchCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE);
        while (state.projectedCount < count && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          state = await dispatchCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE);
        }
        return state;
      }

      const root = document.createElement('section');
      root.dataset.step179SurfaceRoot = '';
      root.style.cssText = 'position:absolute;left:72px;top:96px;width:900px;height:560px;z-index:20;background:#0f1721;';
      root.innerHTML = [
        '<div data-v6-chart-engine-host data-v6-pane-id="main" style="height:260px;width:900px;"></div>',
        '<div data-v6-chart-engine-host data-v6-pane-id="secondary" style="height:260px;width:900px;margin-top:24px;"></div>',
      ].join('');
      document.body.append(root);

      const requests = [];
      const paneStore = createPaneStore({
        initialPanes: [
          createPaneRecord({ active: true, displayTimeframe: 1, id: 'main', instrument: 'NQ' }),
          createPaneRecord({ active: false, displayTimeframe: 5, id: 'secondary', instrument: 'ES' }),
        ],
      });
      const registry = createRuntimeRegistry();
      registry.registerRuntime(createPaneRuntime({ store: paneStore }));
      registry.registerRuntime(createReplayRuntime());
      registry.registerRuntime(createBarDataRuntime({
        fetchBars: async (window) => {
          requests.push({ ...window });
          return {
            bars: barsForWindow(window),
            requestedRange: {
              endTs: minuteTimestamp(9, 32),
              startTs: minuteTimestamp(9, 22),
            },
            timing: { durationMs: 3, parseMs: 1, requestMs: 2, source: 'step179-browser-fetch' },
          };
        },
        maxBarsPerWindow: 2500,
      }));
      registry.registerRuntime(createChartDataProjectionRuntime());
      registry.registerRuntime(createChartDataRuntime());
      registry.registerRuntime(createChartViewportRuntime());
      registry.registerRuntime(createPaneIntentReloadRuntime());
      registry.registerRuntime(createPaneIntentReloadWindowRuntime());
      registry.registerRuntime(createPaneIntentReloadDataRuntime());
      registry.registerRuntime(createPaneIntentReloadChartDataRuntime());
      registry.registerRuntime(createPaneIntentReloadViewportRuntime());
      await registry.start({ emitEvent, subscribeEvent });

      const surface = mountWorkstationChartSurface(root, { emitEvent });
      surface.applyLayoutSnapshot({ mode: 'twice', variant: 'twice-horizontal' });
      const chartDataBridge = connectChartDataSurfaceBridge({ chartSurface: surface, subscribeEvent });
      const chartViewportBridge = connectChartViewportSurfaceBridge({ chartSurface: surface, subscribeEvent });
      root.__surface = surface;
      root.__registry = registry;
      root.__chartDataBridge = chartDataBridge;
      root.__chartViewportBridge = chartViewportBridge;

      await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, {
        endTime: '2026-06-01T09:34:00.000Z',
        id: 'step179-browser-session',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1',
      });
      await dispatchCommand(REPLAY_COMMANDS.NEXT);
      await dispatchCommand(REPLAY_COMMANDS.NEXT);
      await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: [{ close: 500, high: 501, low: 499, open: 500, timestamp: minuteTimestamp(9, 30) }],
        cursorTimestamp: minuteTimestamp(9, 30),
        paneId: 'main',
      });
      await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: [{ close: 600, high: 601, low: 599, open: 600, timestamp: minuteTimestamp(9, 30) }],
        cursorTimestamp: minuteTimestamp(9, 30),
        paneId: 'secondary',
      });

      await dispatchCommand(PANE_COMMANDS.SET_SYMBOL_INTENT, { instrument: 'YM', paneId: 'main' });
      await waitForProjectedCount(1);
      await dispatchCommand(PANE_COMMANDS.SET_INTERVAL_INTENT, { displayTimeframe: 5, paneId: 'secondary' });
      const finalViewportState = await waitForProjectedCount(2);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const mainBars = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const secondaryBars = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
      const planState = await dispatchCommand(PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE);
      const dataState = await dispatchCommand(PANE_INTENT_RELOAD_DATA_COMMANDS.GET_STATE);
      const chartDataState = await dispatchCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE);
      const viewportSnapshot = await dispatchCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE);
      const cacheSummary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
      const surfaceState = surface.getState();

      chartViewportBridge.destroy();
      chartDataBridge.destroy();
      surface.destroy();
      await registry.stop();
      root.remove();

      return {
        cacheSummary,
        chartDataState,
        dataState,
        finalViewportState,
        mainBars,
        planState,
        requests,
        secondaryBars,
        surfaceAppliedChartData: surfaceState.appliedChartData,
        surfaceAppliedViewport: surfaceState.appliedViewport,
        surfaceLayout: surfaceState.layout,
        viewportSnapshot,
      };
    })()))()
  `));

  assert.equal(value.finalViewportState.status, 'projected');
  assert.equal(value.planState.plannedCount, 2);
  assert.equal(value.dataState.loadedCount, 2);
  assert.equal(value.chartDataState.replacedCount, 2);
  assert.equal(value.viewportSnapshot.projectedCount, 2);
  assert.equal(value.cacheSummary.windowCount, 2);
  assert.deepEqual(value.requests.map((request) => [request.instrument, request.timeframe, request.end, request.requestCap]), [
    ['YM', 1, '2026-06-01 09:32', 'replay-cursor'],
    ['ES', 1, '2026-06-01 09:32', 'replay-cursor'],
  ]);
  assert.deepEqual(value.mainBars.bars.map((bar) => bar.timestamp), [
    1780305720,
    1780305780,
    1780305840,
    1780305900,
    1780305960,
    1780306020,
    1780306080,
    1780306140,
    1780306200,
    1780306260,
    1780306320,
  ]);
  assert.deepEqual(value.secondaryBars.bars.map((bar) => bar.timestamp), [1780305600, 1780305900, 1780306200]);
  assert.deepEqual(value.surfaceLayout.visiblePaneIds, ['main', 'secondary']);
  assert.equal(value.surfaceAppliedChartData.some((record) => record.paneId === 'main' && record.barCount === 11), true);
  assert.equal(value.surfaceAppliedChartData.some((record) => record.paneId === 'secondary' && record.barCount === 3), true);
  assert.equal(value.surfaceAppliedViewport.some((record) => record.paneId === 'main' && record.projectionRevision >= 0), true);
  assert.equal(value.surfaceAppliedViewport.some((record) => record.paneId === 'secondary' && record.projectionRevision >= 0), true);
} finally {
  await evaluate(page.client, `
    (async () => {
      const root = document.querySelector('[data-step179-surface-root]');
      root?.__chartViewportBridge?.destroy?.();
      root?.__chartDataBridge?.destroy?.();
      root?.__surface?.destroy?.();
      await root?.__registry?.stop?.();
      root?.remove?.();
    })()
  `).catch(() => {});
  await page.cleanup();
}

console.log('v6 pane reload pipeline browser step 179 smoke passed');
