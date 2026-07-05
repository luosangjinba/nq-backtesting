import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

function percentile95(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

const page = await openV6Page({ height: 820, width: 1280 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const hostModule = await import('/v6/src/chart-engine/chart-host-manager.js');
      const latencyModule = await import('/v6/src/latency/visible-latency-timeline.js');

      const originalFetch = window.fetch;
      let fetchCalls = 0;
      window.fetch = (...args) => {
        fetchCalls += 1;
        throw new Error('mixed timeframe visible path must not fetch');
      };

      const hosts = document.createElement('div');
      hosts.style.display = 'grid';
      hosts.style.gap = '8px';
      hosts.style.gridTemplateColumns = '1fr 1fr';
      hosts.style.height = '320px';
      hosts.style.left = '0';
      hosts.style.position = 'fixed';
      hosts.style.top = '0';
      hosts.style.width = '960px';
      hosts.style.zIndex = '-1';
      document.body.appendChild(hosts);

      const leftHost = document.createElement('div');
      const rightHost = document.createElement('div');
      leftHost.style.height = '320px';
      rightHost.style.height = '320px';
      hosts.append(leftHost, rightHost);

      const manager = hostModule.createChartHostManager({
        chartOptions: {
          height: 320,
          layout: {
            background: { color: '#101722', type: 'solid' },
            textColor: '#dce5eb',
          },
          rightPriceScale: { visible: true },
          timeScale: { visible: true },
          width: 476,
        },
        seriesOptions: {
          borderVisible: false,
        },
      });
      manager.mountPane({ host: leftHost, paneId: 'pane-left' });
      manager.mountPane({ host: rightHost, paneId: 'pane-right' });

      const paneDisplayTimeframes = {
        'pane-left': 1,
        'pane-right': 5,
      };
      const bars = Array.from({ length: 16 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const loaded = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
        bars,
        latestOffsetBars: 4,
        paneDisplayTimeframes,
        paneIds: ['pane-left', 'pane-right'],
        prefixBars: 0,
        session: {
          endTime: '2026-06-01T09:45:00.000Z',
          id: 'browser-mixed-timeframe-session',
          startTime: '2026-06-01T09:30:00.000Z',
          symbol: 'NQ',
          timeframe: '1m',
        },
        spanBars: 60,
      });

      for (const record of loaded.chartRecords) {
        const viewportRecord = loaded.viewportRecords.find((item) => item.paneId === record.paneId);
        manager.setData(record.paneId, record.bars);
        manager.setVisibleLogicalRange(record.paneId, viewportRecord.projection);
      }

      const summaries = [];
      const ranges = [];
      for (let step = 0; step < 5; step += 1) {
        const traces = Object.fromEntries(Object.entries(paneDisplayTimeframes).map(([paneId, displayTimeframe]) => {
          const trace = latencyModule.createVisibleLatencyTrace({
            cacheHit: true,
            id: 'mixed-timeframe-' + paneId + '-' + step,
            metadata: { displayTimeframe, paneId },
            now: () => performance.now(),
            thresholdMs: 120,
          });
          trace.mark('input', { source: 'browser-smoke' });
          trace.mark('commandReceived', { command: contracts.DEFAULT_WALL_COMMANDS.NEXT });
          return [paneId, trace];
        }));

        const next = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
        for (const record of next.chartRecords) {
          const displayTimeframe = paneDisplayTimeframes[record.paneId];
          const viewportRecord = next.viewportRecords.find((item) => item.paneId === record.paneId);
          traces[record.paneId].mark('barAvailable', {
            displayTimeframe,
            source: 'default-wall-mixed-fanout',
            targetBarCount: record.bars.length,
          });
          if (displayTimeframe === 1) {
            manager.update(record.paneId, next.chartRecord.bars.at(-1));
          } else {
            manager.setData(record.paneId, record.bars);
          }
          manager.setVisibleLogicalRange(record.paneId, viewportRecord.projection);
          traces[record.paneId].mark('chartUpdateRequested', {
            path: displayTimeframe === 1 ? 'series.update' : 'series.setData',
          });
        }

        await new Promise((resolve) => requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        }));

        for (const [paneId, trace] of Object.entries(traces)) {
          const measured = manager.measureVisibleLogicalRange(paneId);
          const snapshot = manager.snapshot().panes.find((pane) => pane.paneId === paneId).snapshot;
          const latestLogicalIndex = snapshot.dataLength - 1;
          if (!measured || measured.to < latestLogicalIndex || measured.from > latestLogicalIndex) {
            throw new Error('Mixed timeframe latest candle is not visible for ' + paneId);
          }
          trace.mark('candleVisible', {
            latestLogicalIndex,
            visibleFrom: measured.from,
            visibleTo: measured.to,
          });
          const summary = latencyModule.summarizeVisibleLatencyTrace(trace.snapshot());
          latencyModule.assertCacheHitVisiblePath(summary);
          summaries.push({
            ...summary,
            displayTimeframe: paneDisplayTimeframes[paneId],
            paneId,
          });
          ranges.push({
            dataLength: snapshot.dataLength,
            latestLogicalIndex,
            paneId,
            visibleFrom: measured.from,
            visibleTo: measured.to,
          });
        }
      }

      const finalSummary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SUMMARY);
      manager.destroyAll();
      hosts.remove();
      window.fetch = originalFetch;

      return {
        fetchCalls,
        finalSummary,
        ranges,
        summaries,
      };
    })()))()
  `));

  assert.equal(value.fetchCalls, 0);
  assert.equal(value.summaries.length, 10);
  assert.deepEqual([...new Set(value.summaries.map((summary) => summary.paneId))].sort(), ['pane-left', 'pane-right']);
  assert.deepEqual(value.finalSummary.panes.map((pane) => ({
    barCount: pane.barCount,
    paneId: pane.paneId,
  })), [
    { barCount: 6, paneId: 'pane-left' },
    { barCount: 2, paneId: 'pane-right' },
  ]);
  value.summaries.forEach((summary) => {
    assert.equal(summary.cacheHit, true);
    assert.equal(summary.dataFetchRequested, false);
    assert.equal(summary.withinThreshold, true);
    assert.deepEqual(summary.missingPhases, []);
  });
  const leftSamples = value.summaries
    .filter((summary) => summary.paneId === 'pane-left')
    .map((summary) => summary.totalMs);
  const rightSamples = value.summaries
    .filter((summary) => summary.paneId === 'pane-right')
    .map((summary) => summary.totalMs);
  assert.equal(percentile95(leftSamples) <= 120, true);
  assert.equal(percentile95(rightSamples) <= 120, true);
} finally {
  await page.cleanup();
}

console.log('v6 mixed timeframe visible latency browser smoke passed');
