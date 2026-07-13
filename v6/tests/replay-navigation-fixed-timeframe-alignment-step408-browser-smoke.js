import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 900, width: 1440 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const actions = await import('/v6/src/replay-navigation/replay-navigation-schedule.js');

      async function waitUntil(predicate, timeoutMs = 12000) {
        const deadline = performance.now() + timeoutMs;
        let value = await predicate();
        while (!value && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          value = await predicate();
        }
        return value;
      }

      async function chartSnapshot(paneId = 'main') {
        const record = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId });
        return {
          bars: record.bars.map((bar) => ({ ...bar })),
          latest: record.bars.at(-1) || null,
          revision: record.revision,
        };
      }

      localStorage.removeItem('v6.sessions.metadata');
      await commands.dispatchCommand(contracts.REPLAY_NAVIGATION_PREFERENCES_COMMANDS.RESET);
      document.querySelector('[data-v6-session-setup-name]').value = 'Step 408 fixed alignment';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-05-01T10:00';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-05-05T12:00';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const ready = await waitUntil(async () => {
        const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        return replay?.status === 'ready' ? replay : null;
      });

      await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 60,
        paneId: 'main',
      });
      const hourlyNavigation = await commands.dispatchCommand(contracts.REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
        action: actions.REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION,
        paneIds: ['main'],
      });
      const hourlyReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const hourlyChart = await chartSnapshot();

      await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 240,
        paneId: 'main',
      });
      const fourHourNavigation = await commands.dispatchCommand(contracts.REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
        action: actions.REPLAY_NAVIGATION_ACTIONS.ASIAN_SESSION,
        paneIds: ['main'],
      });
      const fourHourReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const fourHourChart = await chartSnapshot();
      const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'main');

      return {
        fourHourChart,
        fourHourNavigation,
        fourHourReplay,
        hourlyChart,
        hourlyNavigation,
        hourlyReplay,
        pane,
        ready,
      };
    })()))()
  `));

  const timestampOf = (bar) => Number(bar?.timestamp ?? bar?.time);
  const hourlyTimestamps = value.hourlyChart.bars.map(timestampOf);
  const fourHourTimestamps = value.fourHourChart.bars.map(timestampOf);

  assert.equal(value.ready.status, 'ready');
  assert.equal(value.hourlyNavigation.status, 'completed');
  assert.equal(value.hourlyReplay.cursorTime, '2026-05-04T09:30:00.000Z');
  assert.equal(hourlyTimestamps.every((timestamp) => timestamp % 3600 === 0), true);
  assert.equal(
    new Date(timestampOf(value.hourlyChart.latest) * 1000).toISOString(),
    '2026-05-04T09:00:00.000Z',
    '09:30 New York cursor belongs to the canonical 09:00 hourly bucket',
  );

  assert.equal(value.fourHourNavigation.status, 'completed');
  assert.equal(value.fourHourReplay.cursorTime, '2026-05-04T19:00:00.000Z');
  assert.equal(value.pane.displayTimeframe, 240);
  assert.equal(fourHourTimestamps.every((timestamp) => timestamp % (4 * 3600) === 2 * 3600), true);
  assert.equal(
    new Date(timestampOf(value.fourHourChart.latest) * 1000).toISOString(),
    '2026-05-04T18:00:00.000Z',
    '19:00 Asian cursor belongs to the canonical 18:00 four-hour bucket',
  );
  assert.equal(fourHourTimestamps.every((timestamp) => timestamp <= Date.parse(value.fourHourReplay.cursorTime) / 1000), true);
} finally {
  await page.cleanup();
}

console.log('V6 replay navigation fixed timeframe alignment Step 408 browser smoke passed.');
