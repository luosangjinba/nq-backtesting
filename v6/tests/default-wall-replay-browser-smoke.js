import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

function percentile95(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const chartModule = await import('/v6/src/chart-engine/lightweight-chart-adapter.js');
      const latencyModule = await import('/v6/src/latency/visible-latency-timeline.js');

      const originalFetch = window.fetch;
      let fetchCalls = 0;
      window.fetch = (...args) => {
        fetchCalls += 1;
        throw new Error('default wall cache-hit replay must not fetch on visible path');
      };

      const host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.left = '0';
      host.style.top = '0';
      host.style.width = '720px';
      host.style.height = '360px';
      host.style.zIndex = '-1';
      document.body.appendChild(host);

      const adapter = chartModule.createLightweightChartAdapter({
        chartOptions: {
          height: 360,
          layout: {
            background: { color: '#101722', type: 'solid' },
            textColor: '#dce5eb',
          },
          rightPriceScale: { visible: true },
          timeScale: { visible: true },
          width: 720,
        },
        seriesOptions: {
          borderVisible: false,
        },
      });
      adapter.mount(host);

      const bars = Array.from({ length: 8 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const session = {
        endTime: '2026-06-01T09:37:00.000Z',
        id: 'browser-default-wall-session',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      };

      const loaded = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
        bars,
        latestOffsetBars: 8,
        paneId: 'browser-pane',
        prefixBars: 0,
        session,
        spanBars: 120,
      });
      adapter.setData(loaded.chartRecord.bars);
      adapter.setVisibleLogicalRange(loaded.state.projection);
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const samples = [];
      const ranges = [];
      const summaries = [];

      for (let index = 0; index < 5; index += 1) {
        const trace = latencyModule.createVisibleLatencyTrace({
          cacheHit: true,
          id: 'default-wall-next-' + index,
          now: () => performance.now(),
          thresholdMs: 120,
        });
        trace.mark('input', { source: 'browser-smoke' });
        trace.mark('commandReceived', { command: contracts.DEFAULT_WALL_COMMANDS.NEXT });
        const next = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
        trace.mark('barAvailable', {
          forwardBarCount: next.state.forwardBarCount,
          source: 'default-wall-forward-buffer',
        });
        adapter.update(next.chartRecord.bars[0]);
        adapter.setVisibleLogicalRange(next.state.projection);
        trace.mark('chartUpdateRequested', { path: 'series.update' });

        await new Promise((resolve) => requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        }));

        const measured = adapter.measureVisibleLogicalRange();
        const snapshot = adapter.snapshot();
        const latestLogicalIndex = snapshot.dataLength - 1;
        if (!measured || measured.to < latestLogicalIndex || measured.from > latestLogicalIndex) {
          throw new Error('Default wall latest candle is not visible.');
        }
        trace.mark('candleVisible', {
          latestLogicalIndex,
          visibleFrom: measured.from,
          visibleTo: measured.to,
        });
        const summary = latencyModule.summarizeVisibleLatencyTrace(trace.snapshot());
        latencyModule.assertCacheHitVisiblePath(summary);
        samples.push(summary.totalMs);
        summaries.push(summary);
        ranges.push({
          from: measured.from,
          latestLogicalIndex,
          latestOffsetBars: measured.to - latestLogicalIndex,
          to: measured.to,
        });
      }

      adapter.destroy();
      host.remove();
      window.fetch = originalFetch;

      return {
        fetchCalls,
        ranges,
        samples,
        summaries,
      };
    })()))()
  `));

  assert.equal(value.fetchCalls, 0);
  assert.equal(value.samples.length, 5);
  assert.equal(percentile95(value.samples) <= 120, true);
  value.summaries.forEach((summary) => {
    assert.equal(summary.cacheHit, true);
    assert.equal(summary.dataFetchRequested, false);
    assert.equal(summary.withinThreshold, true);
    assert.deepEqual(summary.missingPhases, []);
  });
  value.ranges.forEach((range) => {
    assert.equal(Math.round(range.latestOffsetBars), 8);
  });
  for (let index = 1; index < value.ranges.length; index += 1) {
    assert.equal(Math.round(value.ranges[index].to - value.ranges[index - 1].to), 1);
    assert.equal(Math.round(value.ranges[index].from - value.ranges[index - 1].from), 1);
  }
} finally {
  await page.cleanup();
}

console.log('v6 default wall replay browser smoke passed');
