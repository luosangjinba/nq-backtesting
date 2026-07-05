import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const bars = Array.from({ length: 6 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const session = {
        endTime: '2026-06-01T09:35:00.000Z',
        id: 'display-timeframe-browser-session',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      };

      await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
        bars,
        latestOffsetBars: 8,
        paneId: 'pane-default',
        prefixBars: 0,
        session,
        spanBars: 120,
      });
      for (let index = 0; index < 5; index += 1) {
        await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
      }
      const beforeViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'pane-default',
      });

      const toggle = document.querySelector('[data-v6-display-timeframe-toggle]');
      toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-display-timeframe-option="5"]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
        paneId: 'pane-default',
      });
      const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
      const viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'pane-default',
      });

      return {
        beforeViewport,
        chartBars: chartRecord.bars,
        controlMounted: Boolean(document.querySelector('[data-v6-root]')?.__v6DisplayTimeframeControl?.getValue),
        menuOpen: document.querySelector('[data-v6-display-timeframe-toggle]')?.getAttribute('aria-expanded'),
        pane,
        rootDataset: document.querySelector('[data-v6-root]').dataset.displayTimeframe,
        selectMissing: !document.querySelector('[data-v6-display-timeframe-select]'),
        toggleText: document.querySelector('[data-v6-display-timeframe-toggle]')?.textContent.trim(),
        viewport,
      };
    })()))()
  `));

  assert.equal(value.controlMounted, true);
  assert.equal(value.menuOpen, 'false');
  assert.equal(value.selectMissing, true);
  assert.equal(value.toggleText, '5m');
  assert.equal(value.rootDataset, '5');
  assert.equal(value.pane.displayTimeframe, 5);
  assert.deepEqual(value.chartBars.map((bar) => bar.timestamp), [1780306200, 1780306500]);
  assert.equal(value.chartBars[0].open, 100);
  assert.equal(value.chartBars[0].close, 104.5);
  assert.equal(value.chartBars[1].open, 105);
  assert.equal(value.chartBars[1].close, 105.5);
  assert.equal(value.viewport.intent.origin, value.beforeViewport.intent.origin);
  assert.equal(value.viewport.intent.revision, value.beforeViewport.intent.revision);
  assert.equal(value.viewport.intent.latestOffsetBars, value.beforeViewport.intent.latestOffsetBars);
  assert.equal(value.viewport.projection.latestLogicalIndex, 1);
} finally {
  await page.cleanup();
}

console.log('v6 display timeframe browser smoke passed');
