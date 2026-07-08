import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { createBarDataRuntime } = await import('/v6/src/bar-data/bar-data-runtime.js');
      const { createChartDataRuntime } = await import('/v6/src/chart-data/chart-data-runtime.js');
      const { connectChartDataSurfaceBridge } = await import('/v6/src/chart-engine/chart-data-surface-bridge.js');
      const { mountWorkstationChartSurface } = await import('/v6/src/chart-engine/workstation-chart-surface.js');
      const { createLeftwardHistoryExtensionRuntime } = await import('/v6/src/chart-history/leftward-history-extension-runtime.js');
      const { CHART_DATA_COMMANDS, CHART_HISTORY_COMMANDS, REPLAY_COMMANDS } = await import('/v6/src/contracts/app-contracts.js');
      const { clearCommandsForTest, dispatchCommand, registerCommand } = await import('/v6/src/runtime/commands.js');
      const { clearEventsForTest, emitEvent, subscribeEvent } = await import('/v6/src/runtime/events.js');
      const { createRuntimeRegistry } = await import('/v6/src/runtime/lifecycle.js');

      function initialBars(offset = 0) {
        return [
          { close: 100.5 + offset, high: 101 + offset, low: 100 + offset, open: 100 + offset, timestamp: 1780306200 },
          { close: 101.5 + offset, high: 102 + offset, low: 101 + offset, open: 101 + offset, timestamp: 1780306260 },
          { close: 102.5 + offset, high: 103 + offset, low: 102 + offset, open: 102 + offset, timestamp: 1780306320 },
        ];
      }

      clearCommandsForTest();
      clearEventsForTest();
      const fetchCalls = [];
      const windows = new Map([
        ['2026-06-01 09:27|2026-06-01 09:29', {
          bars: [
            { close: 97.5, high: 98, low: 97, open: 97, timestamp: 1780306020 },
            { close: 98.5, high: 99, low: 98, open: 98, timestamp: 1780306080 },
            { close: 99.5, high: 100, low: 99, open: 99, timestamp: 1780306140 },
          ],
          history: { exhaustedBefore: true },
        }],
      ]);
      const fetchBars = async (window) => {
        fetchCalls.push({ ...window });
        const record = windows.get(window.start + '|' + window.end);
        return {
          bars: (record?.bars || []).map((bar) => ({ ...bar })),
          history: record?.history ? { ...record.history } : { exhaustedBefore: true },
        };
      };

      const registry = createRuntimeRegistry();
      registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
      registry.registerRuntime(createChartDataRuntime());
      registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
      await registry.start({ emitEvent, subscribeEvent });
      registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({
        cursorTime: '2026-06-01T09:32:00.000Z',
        status: 'ready',
        symbol: 'NQ',
        timeframe: '1m',
      }));

      const root = document.createElement('section');
      root.dataset.step155SurfaceRoot = '';
      root.style.cssText = 'position:absolute;left:72px;top:96px;width:760px;height:520px;z-index:20;background:#0f1721;';
      root.innerHTML = [
        '<div data-v6-chart-engine-host data-v6-pane-id="pane-a" style="height:250px;width:760px;"></div>',
        '<div data-v6-chart-engine-host data-v6-pane-id="pane-b" style="height:250px;width:760px;margin-top:20px;"></div>',
      ].join('');
      document.body.append(root);

      const surface = mountWorkstationChartSurface(root, { emitEvent });
      root.__surface = surface;
      const dataBridge = connectChartDataSurfaceBridge({ chartSurface: surface, subscribeEvent });

      await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: initialBars(0),
        cursorTimestamp: 1780306320,
        paneId: 'pane-a',
      });
      await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: initialBars(100),
        cursorTimestamp: 1780306320,
        paneId: 'pane-b',
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const beforeB = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });
      const extensionA = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
        instrument: 'NQ',
        paneId: 'pane-a',
        timeframe: '1m',
        visibleRange: { from: -3.2, to: 15 },
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
      const afterA = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-a' });
      const afterA_B = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });

      const extensionB = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
        instrument: 'NQ',
        paneId: 'pane-b',
        timeframe: '1m',
        visibleRange: { from: -3.2, to: 15 },
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
      const afterB = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });

      dataBridge.destroy();
      surface.destroy();
      await registry.stop();
      root.remove();

      return {
        afterA: afterA.bars.map((bar) => bar.timestamp),
        afterA_B: afterA_B.bars.map((bar) => bar.timestamp),
        afterB: afterB.bars.map((bar) => bar.timestamp),
        beforeB: beforeB.bars.map((bar) => bar.timestamp),
        extensionA,
        extensionB,
        fetchCalls,
      };
    })()))()
  `));

  assert.deepEqual(value.afterA, [
    1780306020,
    1780306080,
    1780306140,
    1780306200,
    1780306260,
    1780306320,
  ]);
  assert.deepEqual(value.afterA_B, value.beforeB);
  assert.deepEqual(value.afterB, [
    1780306020,
    1780306080,
    1780306140,
    1780306200,
    1780306260,
    1780306320,
  ]);
  assert.equal(value.extensionA.status, 'loaded');
  assert.equal(value.extensionA.extension.paneId, 'pane-a');
  assert.equal(value.extensionA.extension.plannedWindow.requestCap, 'canvas-left');
  assert.equal(value.extensionB.status, 'loaded');
  assert.equal(value.extensionB.extension.paneId, 'pane-b');
  assert.equal(value.extensionB.extension.loadedWindow.cacheHit, true);
  assert.equal(value.fetchCalls.length, 1);
  assert.equal(value.fetchCalls[0].historyRequest, 'older-window');
  assert.equal(value.fetchCalls[0].requestCap, 'canvas-left');
} finally {
  await evaluate(page.client, `
    (async () => {
      const root = document.querySelector('[data-step155-surface-root]');
      root?.__surface?.destroy?.();
      root?.remove?.();
    })()
  `).catch(() => {});
  await page.cleanup();
}

console.log('v6 multi-pane leftward history browser step 155 smoke passed');
