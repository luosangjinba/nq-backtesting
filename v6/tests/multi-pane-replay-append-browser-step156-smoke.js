import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { createBarDataRuntime } = await import('/v6/src/bar-data/bar-data-runtime.js');
      const { createChartDataRuntime } = await import('/v6/src/chart-data/chart-data-runtime.js');
      const { createChartEntryAutoPlayRuntime } = await import('/v6/src/chart-entry/chart-entry-auto-play-runtime.js');
      const { createChartEntryManualNextRuntime } = await import('/v6/src/chart-entry/chart-entry-manual-next-runtime.js');
      const { connectChartDataSurfaceBridge } = await import('/v6/src/chart-engine/chart-data-surface-bridge.js');
      const { mountWorkstationChartSurface } = await import('/v6/src/chart-engine/workstation-chart-surface.js');
      const {
        CHART_DATA_COMMANDS,
        CHART_ENTRY_AUTO_PLAY_COMMANDS,
        CHART_ENTRY_MANUAL_NEXT_COMMANDS,
        PLAYBACK_PERIOD_COMMANDS,
        REPLAY_COMMANDS,
      } = await import('/v6/src/contracts/app-contracts.js');
      const { clearCommandsForTest, dispatchCommand, registerCommand } = await import('/v6/src/runtime/commands.js');
      const { clearEventsForTest, emitEvent, subscribeEvent } = await import('/v6/src/runtime/events.js');
      const { createRuntimeRegistry } = await import('/v6/src/runtime/lifecycle.js');

      clearCommandsForTest();
      clearEventsForTest();

      function initialBars(offset = 0) {
        return [
          { close: 101 + offset, high: 102 + offset, low: 100 + offset, open: 100 + offset, timestamp: 1780306260 },
        ];
      }

      const fetchCalls = [];
      const fetchBars = async (window) => {
        fetchCalls.push({ ...window });
        const timestamp = Math.floor(new Date(window.end || window.anchor).valueOf() / 1000);
        return {
          bars: [
            { close: 100 + fetchCalls.length, high: 101 + fetchCalls.length, low: 99 + fetchCalls.length, open: 100 + fetchCalls.length, timestamp },
          ],
          history: null,
        };
      };

      const registry = createRuntimeRegistry();
      registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
      registry.registerRuntime(createChartDataRuntime());
      registry.registerRuntime(createChartEntryManualNextRuntime());
      registry.registerRuntime(createChartEntryAutoPlayRuntime());
      await registry.start({ emitEvent, subscribeEvent });

      let cursorIndex = 1;
      const replayState = (status = 'playing') => ({
        cursorIndex,
        cursorTime: '2026-06-01T09:' + String(30 + cursorIndex).padStart(2, '0') + ':00.000Z',
        revealedCount: cursorIndex + 1,
        sessionId: 'browser-multi-pane-replay',
        status,
        symbol: 'NQ',
        timeframe: '1m',
      });
      registerCommand(REPLAY_COMMANDS.GET_STATE, () => replayState('ready'));
      registerCommand(REPLAY_COMMANDS.PLAY, () => replayState('playing'));
      registerCommand(REPLAY_COMMANDS.PAUSE, () => replayState('paused'));
      registerCommand(REPLAY_COMMANDS.NEXT, () => {
        cursorIndex += 1;
        return replayState(cursorIndex >= 4 ? 'ended' : 'playing');
      });
      registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({ period: '1m', sync: false }));

      const root = document.createElement('section');
      root.dataset.step156SurfaceRoot = '';
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
        cursorTimestamp: 1780306260,
        paneId: 'pane-a',
      });
      await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: initialBars(100),
        cursorTimestamp: 1780306260,
        paneId: 'pane-b',
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const beforeB = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });
      const manualA = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'pane-a' });
      const afterManualA = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-a' });
      const afterManualB = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });

      const started = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, { paneId: 'pane-b', speed: 4 });
      let afterAutoB = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });
      const deadline = performance.now() + 3000;
      while (afterAutoB.bars.length < 3 && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        afterAutoB = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });
      }
      await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP).catch(() => null);
      const afterAutoA = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-a' });
      const surfaceState = surface.getState();

      dataBridge.destroy();
      surface.destroy();
      await registry.stop();
      root.remove();

      return {
        afterAutoA: afterAutoA.bars.map((bar) => bar.timestamp),
        afterAutoB: afterAutoB.bars.map((bar) => bar.timestamp),
        afterManualA: afterManualA.bars.map((bar) => bar.timestamp),
        afterManualB: afterManualB.bars.map((bar) => bar.timestamp),
        beforeB: beforeB.bars.map((bar) => bar.timestamp),
        fetchCalls,
        manualA,
        started,
        surfaceApplied: surfaceState.appliedChartData,
      };
    })()))()
  `));

  assert.equal(value.manualA.status, 'advanced');
  assert.equal(value.manualA.advanced.chartRecord.paneId, 'pane-a');
  assert.equal(value.afterManualA.length, 2);
  assert.deepEqual(value.afterManualB, value.beforeB);
  assert.equal(value.started.paneId, 'pane-b');
  assert.equal(value.afterAutoA.length, 2);
  assert.equal(value.afterAutoB.length >= 3, true);
  assert.equal(value.surfaceApplied.some((record) => record.paneId === 'pane-a' && record.barCount === 2), true);
  assert.equal(value.surfaceApplied.some((record) => record.paneId === 'pane-b' && record.barCount >= 3), true);
  assert.deepEqual(value.fetchCalls.map((call) => call.historyRequest || call.direction), [
    'backward',
    'backward',
    'backward',
  ]);
} finally {
  await evaluate(page.client, `
    (async () => {
      const root = document.querySelector('[data-step156-surface-root]');
      root?.__surface?.destroy?.();
      root?.remove?.();
    })()
  `).catch(() => {});
  await page.cleanup();
}

console.log('v6 multi-pane replay append browser step 156 smoke passed');
