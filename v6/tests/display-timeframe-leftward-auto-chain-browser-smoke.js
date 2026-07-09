import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      async function waitForApplied() {
        const deadline = performance.now() + 5000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status === 'idle' && performance.now() < deadline) {
          await sleep(40);
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return applyState;
      }

      async function snapshot() {
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
        const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'main');
        const surface = root.__v6WorkstationChartSurface.getState();
        return {
          barCount: chart.bars?.length || 0,
          displayTimeframe: pane.displayTimeframe,
          historyRecentCount: history.recentRequests.length,
          oldestTimestamp: chart.bars?.[0]?.timestamp || null,
          visibleRange: surface.panes[0]?.snapshot?.visibleLogicalRange || null,
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const before = await snapshot();
      await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 15,
        paneId: 'main',
      });

      const deadline = performance.now() + 7000;
      let after = await snapshot();
      while (
        after.historyRecentCount <= before.historyRecentCount &&
        performance.now() < deadline
      ) {
        await sleep(80);
        after = await snapshot();
      }

      return {
        after,
        applyState,
        before,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.before.barCount > 0, true);
  assert.equal(value.after.displayTimeframe, 15);
  assert.equal(value.after.historyRecentCount > value.before.historyRecentCount, true);
  assert.equal(value.after.barCount > 0, true);
} finally {
  await page.cleanup();
}

console.log('v6 display timeframe leftward auto-chain browser smoke passed');
