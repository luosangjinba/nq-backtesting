import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      while (!chart.bars?.length && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const root = document.querySelector('[data-v6-root]');
      const surface = root.__v6WorkstationChartSurface;
      const initialPane = surface.getState().panes.find((pane) => pane.paneId === 'main');
      const host = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="main"]');
      const rect = host.getBoundingClientRect();
      host.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        clientX: rect.right - 24,
        clientY: rect.top + 120,
      }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterBlankCrosshair = surface.getState();
      const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const readout = document.querySelector('[data-v6-pane-status-readout][data-v6-pane-id="main"]');
      return {
        adapterDataLength: initialPane.snapshot.dataLength,
        chartBarCount: chart.bars.length,
        chartBarsAreReal: chart.bars.every((bar) => ['open', 'high', 'low', 'close'].every((key) => Number.isFinite(Number(bar[key])))),
        crosshairBar: afterBlankCrosshair.crosshair.find((record) => record.paneId === 'main')?.bar || null,
        latestChartTimestamp: chart.bars.at(-1).timestamp,
        readoutMode: readout.dataset.statusOhlc,
        replayCursorTimestamp: Date.parse(replay.cursorTime) / 1000,
        scaffoldPointCount: initialPane.snapshot.scaffoldPointCount,
      };
    })()))()
  `));

  assert.equal(value.scaffoldPointCount, 32);
  assert.equal(value.adapterDataLength, value.chartBarCount);
  assert.equal(value.chartBarsAreReal, true);
  assert.equal(value.latestChartTimestamp <= value.replayCursorTimestamp, true);
  assert.equal(value.crosshairBar, null);
  assert.equal(value.readoutMode, 'latest');
} finally {
  await page.cleanup();
}

console.log('v6 time axis scaffold browser smoke passed');
