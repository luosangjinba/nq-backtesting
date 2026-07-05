import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const latencyModule = await import('/v6/src/latency/visible-latency-timeline.js');
      const chartModule = await import('/v6/src/chart-engine/lightweight-chart-adapter.js');
      const originalFetch = window.fetch;
      let fetchCalls = 0;
      window.fetch = (...args) => {
        fetchCalls += 1;
        throw new Error('cache-hit visible latency path must not fetch');
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

      const forwardBuffer = [
        { timestamp: 1780306380, open: 102.5, high: 104, low: 102, close: 103.5 },
      ];
      const visibleRange = { from: -2, to: 4 };

      const trace = latencyModule.createVisibleLatencyTrace({
        cacheHit: true,
        id: 'cache-hit-next-browser',
        now: () => performance.now(),
        thresholdMs: 120,
      });

      adapter.mount(host);
      adapter.setData([
        { timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 },
        { timestamp: 1780306260, open: 100.5, high: 102, low: 100, close: 101.5 },
        { timestamp: 1780306320, open: 101.5, high: 103, low: 101, close: 102.5 },
      ]);
      adapter.setVisibleLogicalRange(visibleRange);
      await new Promise((resolve) => requestAnimationFrame(resolve));

      trace.mark('input', { source: 'next-button' });
      trace.mark('commandReceived', { command: 'replay.next' });
      const nextBar = forwardBuffer.shift();
      if (!nextBar) throw new Error('Expected a cached forward bar.');
      trace.mark('barAvailable', {
        forwardBufferAfter: forwardBuffer.length,
        source: 'forward-buffer',
      });
      adapter.update(nextBar);
      adapter.setVisibleLogicalRange(visibleRange);
      trace.mark('chartUpdateRequested', { path: 'series.update' });

      await new Promise((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));

      const measured = adapter.measureVisibleLogicalRange();
      const snapshot = adapter.snapshot();
      const latestLogicalIndex = snapshot.dataLength - 1;
      if (!measured || measured.to < latestLogicalIndex || measured.from > latestLogicalIndex) {
        throw new Error('Latest cache-hit candle is not visible in chart metadata.');
      }
      trace.mark('candleVisible', {
        latestLogicalIndex,
        visibleFrom: measured.from,
        visibleTo: measured.to,
      });

      const summary = latencyModule.summarizeVisibleLatencyTrace(trace.snapshot());
      latencyModule.assertCacheHitVisiblePath(summary);

      adapter.destroy();
      host.remove();
      window.fetch = originalFetch;

      return {
        canvasCount: document.querySelectorAll('canvas').length,
        fetchCalls,
        measured,
        snapshot,
        summary,
      };
    })()))()
  `));

  assert.equal(value.fetchCalls, 0);
  assert.equal(value.summary.cacheHit, true);
  assert.equal(value.summary.dataFetchRequested, false);
  assert.equal(value.summary.withinThreshold, true);
  assert.equal(value.summary.failureCause, 'within-threshold');
  assert.equal(value.snapshot.dataLength, 4);
  assert.equal(value.measured.to >= 3, true);
  assert.deepEqual(value.summary.missingPhases, []);
  assert.equal(Number.isFinite(value.summary.phaseDurations['input->commandReceived']), true);
  assert.equal(Number.isFinite(value.summary.phaseDurations['commandReceived->barAvailable']), true);
  assert.equal(Number.isFinite(value.summary.phaseDurations['barAvailable->chartUpdateRequested']), true);
  assert.equal(Number.isFinite(value.summary.phaseDurations['chartUpdateRequested->candleVisible']), true);
} finally {
  await page.cleanup();
}

console.log('v6 visible latency cache-hit browser smoke passed');
