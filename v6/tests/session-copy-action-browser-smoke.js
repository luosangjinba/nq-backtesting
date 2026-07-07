import assert from 'node:assert/strict';
import {
  evaluate,
  waitForExpression,
} from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.sessions.metadata';

const session = {
  accountBalance: 100000,
  autoUpdateEndDate: false,
  createdAt: '2026-07-05T10:00:00.000Z',
  endTime: '2026-07-05T23:00:00.000Z',
  id: 'copy-source',
  name: 'Copy source',
  profileId: 'default-profile',
  startTime: '2026-07-01T16:30:00.000Z',
  status: 'created',
  symbol: 'ES',
  symbols: ['ES', 'NQ'],
  timeframe: '1m',
  workspaceId: 'default-workspace',
};

const page = await openV6Page({ height: 820, width: 1360 });
try {
  await evaluate(page.client, `
    localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify({
      activeSessionId: null,
      sessions: [session],
      version: 1,
    }))});
  `);
  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8000);

  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const snapshot = async () => ({
        barCache: await commands.dispatchCommand('barData.getCacheSummary'),
        chartEntry: await commands.dispatchCommand('chartEntry.getState'),
        chartSummary: await commands.dispatchCommand('chartData.getSummary'),
        replay: await commands.dispatchCommand('replay.getState'),
      });
      const before = await snapshot();
      const names = () => [...document.querySelectorAll('[data-v6-dashboard-session-row] .session-row-main strong')]
        .map((element) => element.textContent.trim());
      const copyButton = document.querySelector('[data-v6-row-action="copy"]');
      const summaryButton = document.querySelector('[data-v6-row-action="summary"]');
      const statsButton = document.querySelector('[data-v6-row-action="analytics"]');

      summaryButton.click();
      statsButton.click();
      copyButton.click();
      const deadline = performance.now() + 5000;
      let sessions = await commands.dispatchCommand('session.list');
      while (sessions.length !== 2 && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        sessions = await commands.dispatchCommand('session.list');
      }

      return {
        after: await snapshot(),
        active: await commands.dispatchCommand('session.getActive'),
        before,
        copyDisabled: copyButton.disabled,
        names: names(),
        sessions,
        state: root.__v6SessionDashboard.getState(),
      };
    })()))()
  `));

  assert.equal(value.copyDisabled, false);
  assert.deepEqual(value.before.barCache, { barCount: 0, keys: [], windowCount: 0 });
  assert.deepEqual(value.before.chartSummary, { paneCount: 0, panes: [] });
  assert.equal(value.before.chartEntry.status, 'idle');
  assert.equal(value.before.replay, null);
  assert.deepEqual(value.after, value.before);
  assert.equal(value.sessions.length, 2);
  assert.equal(value.sessions[0].id, 'copy-source');
  assert.equal(value.sessions[1].id, 'v6-session-0001');
  assert.equal(value.sessions[1].name, 'Copy source Copy');
  assert.equal(value.sessions[1].symbol, 'ES');
  assert.deepEqual(value.sessions[1].symbols, ['ES', 'NQ']);
  assert.equal(value.active.id, value.sessions[1].id);
  assert.equal(value.state.sessionCount, 2);
  assert.deepEqual(value.state.summary, { open: false, owner: null, sessionId: null });
  assert.deepEqual(value.state.analytics, { open: false, owner: null, sessionId: null });
  assert.ok(value.names.includes('Copy source'));
  assert.ok(value.names.includes('Copy source Copy'));
} finally {
  await page.cleanup();
}

console.log('v6 session copy action browser smoke passed');
