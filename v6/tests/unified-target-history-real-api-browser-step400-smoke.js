import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const samples = [];

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const setupDeadline = performance.now() + 8000;
      let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      while (applyState.status === 'idle' && performance.now() < setupDeadline) {
        await sleep(50);
        applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      }

      for (const timeframe of [30, 60, 120, '1W', '1M']) {
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: 1,
          paneId: 'main',
        });
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: timeframe,
          paneId: 'main',
        });

        const deadline = performance.now() + 15000;
        let history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
        while (performance.now() < deadline) {
          history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
          if (
            history.status === 'loaded' &&
            history.extension?.targetHistory?.status === 'applied' &&
            history.extension?.targetHistory?.window?.timeframe === (
              typeof timeframe === 'number'
                ? ({ 30: '30m', 60: '1h', 120: '2h' })[timeframe]
                : timeframe
            )
          ) break;
          await sleep(80);
        }
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        samples.push({
          barCount: chart.bars?.length || 0,
          diagnostics: history.extension?.diagnostics || null,
          fallbackReason: history.extension?.targetHistory?.reason || null,
          requestedTimeframe: timeframe,
          status: history.status,
          targetStatus: history.extension?.targetHistory?.status || null,
          targetTimeframe: history.extension?.targetHistory?.window?.timeframe || null,
        });
      }
      return { applyStatus: applyState.status, samples };
    })()))()
  `));

  assert.equal(value.applyStatus, 'applied');
  assert.equal(value.samples.length, 5);
  for (const sample of value.samples) {
    assert.equal(sample.status, 'loaded', JSON.stringify(sample));
    assert.equal(sample.targetStatus, 'applied', JSON.stringify(sample));
    assert.equal(sample.diagnostics?.path, 'target-history', JSON.stringify(sample));
    assert.equal(sample.diagnostics?.targetRequestCount, 1, JSON.stringify(sample));
    assert.equal(sample.diagnostics?.sourceRequestCount, 0, JSON.stringify(sample));
    assert.equal(sample.barCount > 1, true, JSON.stringify(sample));
  }
  console.log(JSON.stringify(value.samples, null, 2));
} finally {
  await page.cleanup();
}

console.log('v6 unified target history real api browser step400 smoke passed');
