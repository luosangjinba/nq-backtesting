import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      const root = document.querySelector('[data-v6-root]');
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');

      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-05T16:00';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const fallbackText = document.querySelector('[data-v6-session-chart-boundary]')?.textContent || '';

      await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.LOAD_WINDOW, {
        end: '2026-05-31 18:02',
        instrument: 'NQ',
        start: '2026-05-31 18:00',
        timeframe: 1,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const actualText = document.querySelector('[data-v6-session-chart-boundary]')?.textContent || '';
      const dashboardState = root.__v6SessionDashboard.getState();
      const bridgeState = await commands.dispatchCommand(contracts.CHART_BOUNDARY_METADATA_COMMANDS.GET_STATE);

      return {
        actualText,
        bridgeEarliest: bridgeState.metadata.scopes.find((scope) => scope.instrument === 'NQ')?.earliestLoadedTime || '',
        fallbackText,
        stateEarliest: dashboardState.chartBoundaryMetadata?.scopes?.find((scope) => scope.instrument === 'NQ')?.earliestLoadedTime || '',
      };
    })()))()
  `));

  assert.equal(value.fallbackText, 'Chart starts at prior Globex open: 2026-05-31 18:00');
  assert.equal(value.actualText, 'Chart starts at: 2026-05-31 18:00');
  assert.equal(value.bridgeEarliest, '2026-05-31 18:00');
  assert.equal(value.stateEarliest, '2026-05-31 18:00');
} finally {
  await page.cleanup();
}

console.log('v6 session dashboard boundary bridge browser step 191 smoke passed');
