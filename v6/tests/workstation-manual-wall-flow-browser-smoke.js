import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const viewportProjection = await import('/v6/src/viewport/viewport-projection.js');
      const root = document.querySelector('[data-v6-root]');

      const originalFetch = window.fetch;
      let fetchCalls = 0;
      window.fetch = (...args) => {
        fetchCalls += 1;
        throw new Error('workstation manual-wall flow must not fetch on visible path');
      };

      const bars = Array.from({ length: 7 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const session = {
        endTime: '2026-06-01T09:36:00.000Z',
        id: 'workstation-manual-wall-flow-session',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      };

      await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
        bars,
        latestOffsetBars: 8,
        paneId: 'default',
        prefixBars: 0,
        session,
        spanBars: 120,
      });
      await new Promise((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));
      const loadedChartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
        paneId: 'default',
      });
      const loadedSurface = root.__v6WorkstationChartSurface.getState();
      const latestLogicalIndex = loadedSurface.panes[0].snapshot.dataLength - 1;
      const manualMeasurement = viewportProjection.measureManualWallFromLogicalRange({
        latestLogicalIndex,
        range: { from: -18, to: 6 },
      });

      const manualIntent = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
        ...manualMeasurement,
        paneId: 'default',
      });
      const manualProjection = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
        chartBarsRevision: loadedChartRecord.revision,
        latestLogicalIndex,
        paneId: 'default',
      });
      await new Promise((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));
      const manualSurface = root.__v6WorkstationChartSurface.getState();

      const next = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
      await new Promise((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));
      const nextSurface = root.__v6WorkstationChartSurface.getState();
      const nextChartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
        paneId: 'default',
      });
      const nextViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'default',
      });

      window.fetch = originalFetch;

      return {
        fetchCalls,
        manual: {
          appliedViewport: manualSurface.appliedViewport,
          intent: manualIntent.intent,
          measurement: manualMeasurement,
          projection: manualProjection.projection,
          visibleLogicalRange: manualSurface.panes[0].snapshot.visibleLogicalRange,
        },
        next: {
          activeProjection: next.activeProjection,
          appliedChartData: nextSurface.appliedChartData,
          appliedViewport: nextSurface.appliedViewport,
          chartBarCount: nextChartRecord.bars.length,
          dataLength: nextSurface.panes[0].snapshot.dataLength,
          latestTimestamp: nextChartRecord.bars.at(-1).timestamp,
          replayCursorIndex: next.replayState.cursorIndex,
          viewportIntent: nextViewport.intent,
          viewportProjection: nextViewport.projection,
          visibleLogicalRange: nextSurface.panes[0].snapshot.visibleLogicalRange,
        },
      };
    })()))()
  `));

  assert.equal(value.fetchCalls, 0);
  assert.deepEqual(value.manual.measurement, {
    latestOffsetBars: 6,
    spanBars: 24,
  });
  assert.equal(value.manual.intent.origin, 'manual');
  assert.equal(value.manual.intent.revision, 1);
  assert.equal(value.manual.intent.latestOffsetBars, 6);
  assert.equal(value.manual.intent.spanBars, 24);
  assert.deepEqual(value.manual.projection, {
    from: -18,
    latestLogicalIndex: 0,
    latestOffsetBars: 6,
    origin: 'manual',
    revision: 1,
    spanBars: 24,
    to: 6,
  });
  assert.deepEqual(value.manual.visibleLogicalRange, { from: -18, to: 6 });
  assert.deepEqual(value.manual.appliedViewport, [{
    chartBarsRevision: 1,
    from: -18,
    origin: 'manual',
    paneId: 'default',
    projectionRevision: 1,
    to: 6,
  }]);

  assert.equal(value.next.replayCursorIndex, 1);
  assert.equal(value.next.chartBarCount, 2);
  assert.equal(value.next.dataLength, 2);
  assert.equal(value.next.latestTimestamp, 1780306260);
  assert.equal(value.next.viewportIntent.origin, 'manual');
  assert.equal(value.next.viewportIntent.revision, 1);
  assert.equal(value.next.viewportIntent.latestOffsetBars, 6);
  assert.equal(value.next.viewportIntent.spanBars, 24);
  assert.deepEqual(value.next.viewportProjection, value.next.activeProjection);
  assert.deepEqual(value.next.visibleLogicalRange, { from: -17, to: 7 });
  assert.deepEqual(value.next.appliedChartData, [{
    barCount: 2,
    paneId: 'default',
    revision: 2,
  }]);
  assert.deepEqual(value.next.appliedViewport, [{
    chartBarsRevision: 2,
    from: -17,
    origin: 'manual',
    paneId: 'default',
    projectionRevision: 1,
    to: 7,
  }]);
} finally {
  await page.cleanup();
}

console.log('v6 workstation manual wall flow browser smoke passed');
