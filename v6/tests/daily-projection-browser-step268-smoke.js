import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const ts = (value) => Date.parse(value) / 1000;
      const bars = [
        { open: 100, high: 105, low: 99, close: 104, timestamp: ts('2026-05-31T18:00:00Z') },
        { open: 104, high: 110, low: 103, close: 108, timestamp: ts('2026-06-01T17:59:00Z') },
        { open: 200, high: 205, low: 198, close: 204, timestamp: ts('2026-06-01T18:00:00Z') },
        { open: 204, high: 210, low: 203, close: 208, timestamp: ts('2026-06-02T17:59:00Z') },
      ];

      await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars,
        cursorTimestamp: bars.at(-1).timestamp,
        paneId: 'main',
      });

      const toggle = document.querySelector('[data-v6-display-timeframe-toggle]');
      toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-display-timeframe-option="1D"]').click();
      const deadline = performance.now() + 5000;
      let chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
        paneId: 'main',
      });
      let pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
      let projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      while ((projectionState.lastProjection?.targetTimeframe !== '1D' || chartRecord.bars.length !== 2) && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
          paneId: 'main',
        });
        pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
        projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      }

      return {
        bars: chartRecord.bars,
        error: document.querySelector('[data-v6-root]').dataset.lastDisplayTimeframeError || '',
        hasDailyOption: Boolean(document.querySelector('[data-v6-display-timeframe-option="1D"]')),
        label: document.querySelector('[data-v6-display-timeframe-label]')?.textContent.trim(),
        menuOpen: toggle.getAttribute('aria-expanded'),
        pane,
        projection: projectionState.lastProjection,
        rootDataset: document.querySelector('[data-v6-root]').dataset.displayTimeframe,
      };
    })()))()
  `));

  assert.equal(value.rootDataset, '1D');
  assert.equal(value.label, '1D');
  assert.equal(value.menuOpen, 'false');
  assert.equal(value.pane.displayTimeframe, '1D');
  assert.deepEqual(value.bars.map((bar) => ({
    close: bar.close,
    high: bar.high,
    low: bar.low,
    open: bar.open,
    timestamp: bar.timestamp,
  })), [
    {
      close: 108,
      high: 110,
      low: 99,
      open: 100,
      timestamp: Date.parse('2026-05-31T18:00:00Z') / 1000,
    },
    {
      close: 208,
      high: 210,
      low: 198,
      open: 200,
      timestamp: Date.parse('2026-06-01T18:00:00Z') / 1000,
    },
  ]);
  assert.equal(value.projection.sourceTimeframe, 1);
  assert.equal(value.projection.targetTimeframe, '1D');
  assert.equal(value.projection.buckets[0].key, '2026-06-01');
  assert.equal(value.projection.buckets[1].key, '2026-06-02');
} finally {
  await page.cleanup();
}

console.log('v6 daily projection browser step268 smoke passed');
