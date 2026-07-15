import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

async function runCase(displayTimeframe) {
  const page = await openV6Page({ height: 760, width: 1200 });
  try {
    return JSON.parse(await evaluate(page.client, `
      (async () => JSON.stringify(await (async () => {
        const commands = await import('/v6/src/runtime/commands.js');
        const contracts = await import('/v6/src/contracts/app-contracts.js');
        const start = Date.parse('2026-06-01T00:00:00Z') / 1000;
        const bars = Array.from({ length: 120 }, (_, index) => ({
          close: index + 0.75,
          high: index + 1,
          low: index - 1,
          open: index + 0.25,
          timestamp: start + (index * 60),
        }));
        await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
          bars,
          cursorTimestamp: bars.at(-1).timestamp,
          paneId: 'main',
        });
        const toggle = document.querySelector('[data-v6-display-timeframe-toggle]');
        toggle.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector('[data-v6-display-timeframe-option="${displayTimeframe}"]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
          paneId: 'main',
        });
        const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
        const projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        return {
          barCount: chartRecord.bars.length,
          firstBar: chartRecord.bars[0],
          label: document.querySelector('[data-v6-display-timeframe-label]')?.textContent.trim(),
          menuOpen: toggle.getAttribute('aria-expanded'),
          paneDisplayTimeframe: pane.displayTimeframe,
          projection: projectionState.lastProjection,
          rootDataset: document.querySelector('[data-v6-root]').dataset.displayTimeframe,
        };
      })()))()
    `));
  } finally {
    await page.cleanup();
  }
}

const tenMinute = await runCase(10);
assert.equal(tenMinute.rootDataset, '10');
assert.equal(tenMinute.label, '10m');
assert.equal(tenMinute.menuOpen, 'false');
assert.equal(tenMinute.paneDisplayTimeframe, 10);
assert.equal(tenMinute.barCount, 12);
assert.equal(tenMinute.firstBar.open, 0.25);
assert.equal(tenMinute.firstBar.close, 9.75);
assert.equal(tenMinute.projection.sourceTimeframe, 1);
assert.equal(tenMinute.projection.targetTimeframe, 10);
assert.equal(tenMinute.projection.buckets[0].expectedSourceBars, 10);

const oneHour = await runCase(60);
assert.equal(oneHour.rootDataset, '60');
assert.equal(oneHour.label, '1h');
assert.equal(oneHour.menuOpen, 'false');
assert.equal(oneHour.paneDisplayTimeframe, 60);
assert.equal(oneHour.barCount, 2);
assert.equal(oneHour.firstBar.open, 0.25);
assert.equal(oneHour.firstBar.close, 59.75);
assert.equal(oneHour.projection.sourceTimeframe, 1);
assert.equal(oneHour.projection.targetTimeframe, 60);
assert.equal(oneHour.projection.buckets[0].expectedSourceBars, 60);

console.log('v6 minute hour timeframe browser step265 smoke passed');
