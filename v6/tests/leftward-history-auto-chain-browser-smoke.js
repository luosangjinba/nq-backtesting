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
        const surface = root.__v6WorkstationChartSurface.getState();
        const visibleRange = surface.panes[0]?.snapshot?.visibleLogicalRange || null;
        return {
          barCount: chart.bars?.length || 0,
          history,
          oldestTimestamp: chart.bars?.[0]?.timestamp || null,
          visibleRange,
        };
      }

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 15,
        paneId: 'main',
      });
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const initial = await snapshot();

      const first = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
        paneId: 'main',
        visibleRange: { from: -120, to: 30 },
      });

      const deadline = performance.now() + 7000;
      let after = await snapshot();
      while (
        after.history.recentRequests.length < 2 &&
        Number(after.visibleRange?.from ?? 0) < 0 &&
        performance.now() < deadline
      ) {
        await sleep(80);
        after = await snapshot();
      }

      return {
        after,
        applyState,
        first,
        initial,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.barCount > 0, true);
  assert.equal(value.first.status, 'loaded', value.first.error || 'first left extension should load');
  assert.equal(value.after.history.recentRequests.length >= 2, true);
  assert.equal(value.after.barCount > value.initial.barCount, true);
  assert.equal(value.after.oldestTimestamp < value.initial.oldestTimestamp, true);
  assert.equal(Number(value.after.visibleRange?.from) >= 0, true);
} finally {
  await page.cleanup();
}

console.log('v6 leftward history auto chain browser smoke passed');
