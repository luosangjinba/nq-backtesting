import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const hostModule = await import('/v6/src/chart-engine/chart-host-manager.js');

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

      const bars = Array.from({ length: 6 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const loaded = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
        bars,
        latestOffsetBars: 4,
        paneIds: ['pane-left', 'pane-right'],
        prefixBars: 0,
        session: {
          endTime: '2026-06-01T09:35:00.000Z',
          id: 'browser-multi-pane-host-session',
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

      const next = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
      for (const record of next.chartRecords) {
        const viewportRecord = next.viewportRecords.find((item) => item.paneId === record.paneId);
        manager.update(record.paneId, record.bars.at(-1));
        manager.setVisibleLogicalRange(record.paneId, viewportRecord.projection);
      }

      await new Promise((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));

      const ranges = next.chartRecords.map((record) => {
        const measured = manager.measureVisibleLogicalRange(record.paneId);
        const snapshot = manager.snapshot().panes.find((pane) => pane.paneId === record.paneId).snapshot;
        return {
          dataLength: snapshot.dataLength,
          latestLogicalIndex: snapshot.dataLength - 1,
          measured,
          paneId: record.paneId,
        };
      });
      const chartSummary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SUMMARY);
      manager.destroyAll();
      hosts.remove();

      return {
        chartRecords: next.chartRecords.map((record) => ({
          latestTimestamp: record.bars.at(-1).timestamp,
          paneId: record.paneId,
        })),
        chartSummary,
        hostPaneCount: ranges.length,
        ranges,
        replayCursorIndex: next.replayState.cursorIndex,
      };
    })()))()
  `));

  assert.equal(value.hostPaneCount, 2);
  assert.equal(value.replayCursorIndex, 1);
  assert.deepEqual(value.chartRecords, [
    { latestTimestamp: 1780306260, paneId: 'pane-left' },
    { latestTimestamp: 1780306260, paneId: 'pane-right' },
  ]);
  assert.deepEqual(value.chartSummary.panes.map((pane) => pane.paneId), ['pane-left', 'pane-right']);
  value.ranges.forEach((range) => {
    assert.equal(range.dataLength, 2);
    assert.equal(Number.isFinite(range.measured.from), true);
    assert.equal(Number.isFinite(range.measured.to), true);
    assert.equal(range.measured.from <= range.latestLogicalIndex, true);
    assert.equal(range.measured.to >= range.latestLogicalIndex, true);
  });
} finally {
  await page.cleanup();
}

console.log('v6 multi-pane chart host browser smoke passed');
