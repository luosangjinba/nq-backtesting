import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

      const originalFetch = window.fetch;
      let fetchCalls = 0;
      window.fetch = (...args) => {
        fetchCalls += 1;
        throw new Error('workstation default-wall flow must not fetch on visible path');
      };

      const bars = Array.from({ length: 6 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const session = {
        endTime: '2026-06-01T09:35:00.000Z',
        id: 'workstation-default-wall-flow-session',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      };

      const loaded = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
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
      const loadedSurface = root.__v6WorkstationChartSurface.getState();
      const loadedChartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
        paneId: 'default',
      });
      const loadedViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'default',
      });

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
        loaded: {
          activeProjection: loaded.activeProjection,
          appliedChartData: loadedSurface.appliedChartData,
          appliedViewport: loadedSurface.appliedViewport,
          chartBarCount: loadedChartRecord.bars.length,
          dataLength: loadedSurface.panes[0].snapshot.dataLength,
          latestTimestamp: loadedChartRecord.bars.at(-1).timestamp,
          visibleLogicalRange: loadedSurface.panes[0].snapshot.visibleLogicalRange,
          viewportProjection: loadedViewport.projection,
        },
        next: {
          activeProjection: next.activeProjection,
          appliedChartData: nextSurface.appliedChartData,
          appliedViewport: nextSurface.appliedViewport,
          chartBarCount: nextChartRecord.bars.length,
          dataLength: nextSurface.panes[0].snapshot.dataLength,
          latestTimestamp: nextChartRecord.bars.at(-1).timestamp,
          replayCursorIndex: next.replayState.cursorIndex,
          visibleLogicalRange: nextSurface.panes[0].snapshot.visibleLogicalRange,
          viewportProjection: nextViewport.projection,
        },
      };
    })()))()
  `));

  assert.equal(value.fetchCalls, 0);
  assert.equal(value.loaded.chartBarCount, 1);
  assert.equal(value.loaded.dataLength, 1);
  assert.equal(value.loaded.latestTimestamp, 1780306200);
  assert.deepEqual(value.loaded.visibleLogicalRange, { from: -112, to: 8 });
  assert.deepEqual(value.loaded.viewportProjection, value.loaded.activeProjection);
  assert.deepEqual(value.loaded.appliedChartData, [{
    barCount: 1,
    paneId: 'default',
    revision: 1,
  }]);
  assert.deepEqual(value.loaded.appliedViewport, [{
    chartBarsRevision: 1,
    from: -112,
    origin: 'default',
    paneId: 'default',
    projectionRevision: 0,
    to: 8,
  }]);

  assert.equal(value.next.replayCursorIndex, 1);
  assert.equal(value.next.chartBarCount, 2);
  assert.equal(value.next.dataLength, 2);
  assert.equal(value.next.latestTimestamp, 1780306260);
  assert.deepEqual(value.next.visibleLogicalRange, { from: -111, to: 9 });
  assert.deepEqual(value.next.viewportProjection, value.next.activeProjection);
  assert.deepEqual(value.next.appliedChartData, [{
    barCount: 2,
    paneId: 'default',
    revision: 2,
  }]);
  assert.deepEqual(value.next.appliedViewport, [{
    chartBarsRevision: 2,
    from: -111,
    origin: 'default',
    paneId: 'default',
    projectionRevision: 0,
    to: 9,
  }]);
} finally {
  await page.cleanup();
}

console.log('v6 workstation default wall flow browser smoke passed');
