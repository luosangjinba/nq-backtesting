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
      const viewportProjection = await import('/v6/src/viewport/viewport-projection.js');

      const originalFetch = window.fetch;
      let fetchCalls = 0;
      window.fetch = (...args) => {
        fetchCalls += 1;
        throw new Error('multi-pane manual wall visible path must not fetch');
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

      const bars = Array.from({ length: 10 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const loaded = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
        bars,
        latestOffsetBars: 8,
        paneIds: ['pane-left', 'pane-right'],
        prefixBars: 0,
        session: {
          endTime: '2026-06-01T09:39:00.000Z',
          id: 'browser-multi-pane-manual-wall-session',
          startTime: '2026-06-01T09:30:00.000Z',
          symbol: 'NQ',
          timeframe: '1m',
        },
        spanBars: 120,
      });

      for (const record of loaded.chartRecords) {
        const viewportRecord = loaded.viewportRecords.find((item) => item.paneId === record.paneId);
        manager.setData(record.paneId, record.bars);
        manager.setVisibleLogicalRange(record.paneId, viewportRecord.projection);
      }

      manager.setVisibleLogicalRange('pane-right', { from: -18, to: 6 });
      await new Promise((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));
      const rightManualRange = manager.measureVisibleLogicalRange('pane-right');
      const rightSnapshot = manager.snapshot().panes.find((pane) => pane.paneId === 'pane-right').snapshot;
      const manualMeasurement = viewportProjection.measureManualWallFromLogicalRange({
        latestLogicalIndex: rightSnapshot.dataLength - 1,
        range: rightManualRange,
      });
      const manualIntent = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
        ...manualMeasurement,
        paneId: 'pane-right',
      });
      const leftBefore = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'pane-left',
      });

      const summaries = [];
      const ranges = [];
      for (let step = 0; step < 4; step += 1) {
        const traces = Object.fromEntries(['pane-left', 'pane-right'].map((paneId) => {
          const trace = latencyModule.createVisibleLatencyTrace({
            cacheHit: true,
            id: 'multi-pane-manual-' + paneId + '-' + step,
            metadata: { paneId },
            now: () => performance.now(),
            thresholdMs: 120,
          });
          trace.mark('input', { source: 'browser-smoke' });
          trace.mark('commandReceived', { command: contracts.DEFAULT_WALL_COMMANDS.NEXT });
          return [paneId, trace];
        }));

        const next = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
        for (const record of next.chartRecords) {
          const viewportRecord = next.viewportRecords.find((item) => item.paneId === record.paneId);
          traces[record.paneId].mark('barAvailable', {
            intentOrigin: viewportRecord.intent.origin,
            source: 'default-wall-forward-buffer',
          });
          manager.update(record.paneId, record.bars.at(-1));
          manager.setVisibleLogicalRange(record.paneId, viewportRecord.projection);
          traces[record.paneId].mark('chartUpdateRequested', { path: 'series.update' });
        }

        await new Promise((resolve) => requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        }));

        for (const record of next.chartRecords) {
          const paneId = record.paneId;
          const measured = manager.measureVisibleLogicalRange(paneId);
          const snapshot = manager.snapshot().panes.find((pane) => pane.paneId === paneId).snapshot;
          const latestLogicalIndex = snapshot.dataLength - 1;
          if (!measured || measured.to < latestLogicalIndex || measured.from > latestLogicalIndex) {
            throw new Error('Multi-pane manual latest candle is not visible for ' + paneId);
          }
          traces[paneId].mark('candleVisible', {
            latestLogicalIndex,
            visibleFrom: measured.from,
            visibleTo: measured.to,
          });
          const summary = latencyModule.summarizeVisibleLatencyTrace(traces[paneId].snapshot());
          latencyModule.assertCacheHitVisiblePath(summary);
          const viewportRecord = next.viewportRecords.find((item) => item.paneId === paneId);
          summaries.push({
            ...summary,
            intentOrigin: viewportRecord.intent.origin,
            paneId,
          });
          ranges.push({
            intent: viewportRecord.intent,
            latestLogicalIndex,
            latestOffsetBars: measured.to - latestLogicalIndex,
            paneId,
            spanBars: measured.to - measured.from,
          });
        }
      }

      const leftAfter = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'pane-left',
      });
      const rightAfter = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'pane-right',
      });
      manager.destroyAll();
      hosts.remove();
      window.fetch = originalFetch;

      return {
        fetchCalls,
        leftAfter,
        leftBefore,
        manualIntent,
        manualMeasurement,
        ranges,
        rightAfter,
        summaries,
      };
    })()))()
  `));

  assert.equal(value.fetchCalls, 0);
  assert.equal(value.leftBefore.intent.origin, 'default');
  assert.equal(value.leftAfter.intent.origin, 'default');
  assert.equal(value.leftAfter.intent.revision, 0);
  assert.equal(value.rightAfter.intent.origin, 'manual');
  assert.equal(value.rightAfter.intent.revision, 1);
  assert.equal(value.manualIntent.intent.origin, 'manual');
  assert.equal(Math.round(value.manualMeasurement.latestOffsetBars), 6);
  assert.equal(Math.round(value.manualMeasurement.spanBars), 24);

  const leftRanges = value.ranges.filter((range) => range.paneId === 'pane-left');
  const rightRanges = value.ranges.filter((range) => range.paneId === 'pane-right');
  leftRanges.forEach((range) => {
    assert.equal(range.intent.origin, 'default');
    assert.equal(range.intent.revision, 0);
    assert.equal(Math.round(range.latestOffsetBars), 8);
  });
  rightRanges.forEach((range) => {
    assert.equal(range.intent.origin, 'manual');
    assert.equal(range.intent.revision, 1);
    assert.equal(Math.round(range.latestOffsetBars), 6);
    assert.equal(Math.round(range.spanBars), 24);
  });

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

console.log('v6 multi-pane manual wall browser smoke passed');
