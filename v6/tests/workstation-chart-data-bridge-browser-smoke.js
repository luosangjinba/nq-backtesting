import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: [
          { timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 },
          { timestamp: 1780306260, open: 100.5, high: 102, low: 100, close: 101.5 },
          { timestamp: 1780306320, open: 101.5, high: 103, low: 101, close: 102.5 },
        ],
        paneId: 'default',
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const firstState = root.__v6WorkstationChartSurface.getState();
      await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: [
          { timestamp: 1780306200, open: 900, high: 901, low: 899, close: 900.5 },
        ],
        paneId: 'other-pane',
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const secondState = root.__v6WorkstationChartSurface.getState();
      return {
        applied: secondState.appliedChartData,
        bridgeMounted: Boolean(root.__v6ChartDataSurfaceBridge?.destroy),
        firstDataLength: firstState.panes[0].snapshot.dataLength,
        secondDataLength: secondState.panes[0].snapshot.dataLength,
      };
    })()))()
  `));

  assert.equal(value.bridgeMounted, true);
  assert.equal(value.firstDataLength, 3);
  assert.equal(value.secondDataLength, 3);
  assert.deepEqual(value.applied, [{
    barCount: 3,
    paneId: 'default',
    revision: 1,
  }]);
} finally {
  await page.cleanup();
}

console.log('v6 workstation chart data bridge browser smoke passed');
