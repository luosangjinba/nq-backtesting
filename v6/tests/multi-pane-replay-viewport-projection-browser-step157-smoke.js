import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 900, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { createBarDataRuntime } = await import('/v6/src/bar-data/bar-data-runtime.js');
      const { createChartDataRuntime } = await import('/v6/src/chart-data/chart-data-runtime.js');
      const { createChartEntryAutoPlayRuntime } = await import('/v6/src/chart-entry/chart-entry-auto-play-runtime.js');
      const { createChartEntryManualNextRuntime } = await import('/v6/src/chart-entry/chart-entry-manual-next-runtime.js');
      const { createChartViewportRuntime } = await import('/v6/src/chart-viewport/chart-viewport-runtime.js');
      const { connectChartDataSurfaceBridge } = await import('/v6/src/chart-engine/chart-data-surface-bridge.js');
      const { connectChartViewportSurfaceBridge } = await import('/v6/src/chart-engine/chart-viewport-surface-bridge.js');
      const { mountWorkstationChartSurface } = await import('/v6/src/chart-engine/workstation-chart-surface.js');
      const {
        CHART_DATA_COMMANDS,
        CHART_ENTRY_AUTO_PLAY_COMMANDS,
        CHART_ENTRY_MANUAL_NEXT_COMMANDS,
        CHART_VIEWPORT_COMMANDS,
        CHART_VIEWPORT_EVENTS,
        PLAYBACK_PERIOD_COMMANDS,
        REPLAY_COMMANDS,
        REPLAY_EVENTS,
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
      const projectedEvents = [];
      const unsubscribeProjected = subscribeEvent(CHART_VIEWPORT_EVENTS.PROJECTED, (record = {}) => {
        projectedEvents.push({
          paneId: record.paneId,
          projection: record.projection ? { ...record.projection } : null,
        });
      });
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
      registry.registerRuntime(createChartViewportRuntime());
      registry.registerRuntime(createChartEntryManualNextRuntime());
      registry.registerRuntime(createChartEntryAutoPlayRuntime());
      await registry.start({ emitEvent, subscribeEvent });

      let cursorIndex = 1;
      const replayState = (status = 'playing') => ({
        cursorIndex,
        cursorTime: '2026-06-01T09:' + String(30 + cursorIndex).padStart(2, '0') + ':00.000Z',
        revealedCount: cursorIndex + 1,
        sessionId: 'browser-multi-pane-viewport',
        status,
        symbol: 'NQ',
        timeframe: '1m',
      });
      registerCommand(REPLAY_COMMANDS.GET_STATE, () => replayState('ready'));
      registerCommand(REPLAY_COMMANDS.PLAY, () => replayState('playing'));
      registerCommand(REPLAY_COMMANDS.PAUSE, () => replayState('paused'));
      registerCommand(REPLAY_COMMANDS.NEXT, () => {
        cursorIndex += 1;
        const state = replayState(cursorIndex >= 4 ? 'ended' : 'playing');
        emitEvent(REPLAY_EVENTS.ADVANCED, state);
        return state;
      });
      registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({ period: '1m', sync: false }));

      const root = document.createElement('section');
      root.dataset.step157SurfaceRoot = '';
      root.style.cssText = 'position:absolute;left:72px;top:96px;width:760px;height:540px;z-index:20;background:#0f1721;';
      root.innerHTML = [
        '<div data-v6-chart-engine-host data-v6-pane-id="pane-a" style="height:250px;width:760px;"></div>',
        '<div data-v6-chart-engine-host data-v6-pane-id="pane-b" style="height:250px;width:760px;margin-top:20px;"></div>',
      ].join('');
      document.body.append(root);
      const surface = mountWorkstationChartSurface(root, { emitEvent });
      root.__surface = surface;
      const dataBridge = connectChartDataSurfaceBridge({ chartSurface: surface, subscribeEvent });
      const viewportBridge = connectChartViewportSurfaceBridge({ chartSurface: surface, subscribeEvent });

      await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
        cursorTimestamp: 1780306260,
        latestOffsetBars: 8,
        paneId: 'pane-a',
      });
      await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
        cursorTimestamp: 1780306260,
        latestOffsetBars: 12,
        paneId: 'pane-b',
      });
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
      await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
        latestOffsetBars: 6,
        paneId: 'pane-b',
        spanBars: 40,
      });
      await dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
        chartBarsRevision: 1,
        latestLogicalIndex: 0,
        paneId: 'pane-b',
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const beforeB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });
      const manualA = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'pane-a' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterManualA = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-a' });
      const afterManualB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });

      const started = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, { paneId: 'pane-b', speed: 4 });
      let afterAutoB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });
      const deadline = performance.now() + 3000;
      while ((afterAutoB.projection?.latestLogicalIndex || 0) < 2 && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        afterAutoB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });
      }
      await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP).catch(() => null);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterAutoA = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-a' });
      const surfaceState = surface.getState();

      viewportBridge.destroy();
      dataBridge.destroy();
      unsubscribeProjected();
      surface.destroy();
      await registry.stop();
      root.remove();

      return {
        afterAutoA,
        afterAutoB,
        afterManualA,
        afterManualB,
        beforeB,
        fetchCalls,
        manualA,
        projectedEvents,
        started,
        surfaceAppliedViewport: surfaceState.appliedViewport,
      };
    })()))()
  `));

  assert.equal(value.manualA.status, 'advanced');
  assert.equal(value.manualA.advanced.chartRecord.paneId, 'pane-a');
  assert.deepEqual(value.afterManualA.projection, {
    from: -111,
    latestLogicalIndex: 1,
    latestOffsetBars: 8,
    origin: 'default',
    revision: 0,
    spanBars: 120,
    to: 9,
  });
  assert.deepEqual(value.afterManualB.projection, value.beforeB.projection);
  assert.equal(value.afterManualB.intent.origin, 'manual');
  assert.equal(value.afterManualB.intent.latestOffsetBars, value.beforeB.intent.latestOffsetBars);
  assert.equal(value.afterManualB.intent.spanBars, value.beforeB.intent.spanBars);
  assert.equal(value.afterManualB.intent.revision, value.beforeB.intent.revision);
  assert.equal(value.started.paneId, 'pane-b');
  assert.deepEqual(value.afterAutoA.projection, value.afterManualA.projection);
  assert.deepEqual(value.afterAutoB.projection, {
    from: -32,
    latestLogicalIndex: 2,
    latestOffsetBars: 6,
    origin: 'manual',
    revision: 1,
    spanBars: 40,
    to: 8,
  });
  assert.equal(value.surfaceAppliedViewport.some((record) => (
    record.paneId === 'pane-a'
    && record.from === -111
    && record.to === 9
    && record.origin === 'default'
  )), true);
  assert.equal(value.surfaceAppliedViewport.some((record) => (
    record.paneId === 'pane-b'
    && record.from === -32
    && record.to === 8
    && record.origin === 'manual'
  )), true);
  assert.deepEqual(value.projectedEvents.map((record) => record.paneId), [
    'pane-a',
    'pane-b',
    'pane-b',
    'pane-a',
    'pane-b',
    'pane-b',
  ]);
  assert.deepEqual(value.fetchCalls.map((call) => call.historyRequest || call.direction), [
    'backward',
    'backward',
    'backward',
  ]);
} finally {
  await evaluate(page.client, `
    (async () => {
      const root = document.querySelector('[data-step157-surface-root]');
      root?.__surface?.destroy?.();
      root?.remove?.();
    })()
  `).catch(() => {});
  await page.cleanup();
}

console.log('v6 multi-pane replay viewport projection browser step 157 smoke passed');
