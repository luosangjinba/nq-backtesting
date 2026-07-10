import assert from 'node:assert/strict';
import {
  evaluate,
  waitForExpression,
} from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.sessions.metadata';

const persistedSessions = [
  {
    accountBalance: 100000,
    autoUpdateEndDate: false,
    createdAt: '2026-07-01T10:00:00.000Z',
    endTime: '2026-06-05T16:00:00.000Z',
    id: 'v6-session-0001',
    name: '1',
    profileId: 'default-profile',
    startTime: '2026-06-01T09:30:00.000Z',
    status: 'created',
    symbol: 'NQ',
    symbols: ['NQ'],
    timeframe: '1m',
    workspaceId: 'default-workspace',
  },
  {
    accountBalance: 100000,
    autoUpdateEndDate: false,
    createdAt: '2026-07-02T10:00:00.000Z',
    endTime: '2026-06-05T16:00:00.000Z',
    id: 'v6-session-0002',
    name: '2',
    profileId: 'default-profile',
    startTime: '2026-06-01T09:30:00.000Z',
    status: 'created',
    symbol: 'NQ',
    symbols: ['NQ'],
    timeframe: '1m',
    workspaceId: 'default-workspace',
  },
];

const page = await openV6Page({ height: 900, width: 1440 });
try {
  async function reloadAndWait() {
    await page.client.send('Page.reload', { ignoreCache: true });
    await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8000);
  }

  await evaluate(page.client, `
    localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify({
      activeSessionId: 'v6-session-0002',
      sessions: persistedSessions,
      version: 1,
    }))});
  `);
  await reloadAndWait();

  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');

      document.querySelector('[data-v6-session-setup-name]').value = '3';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-05T16:00';
      document.querySelector('[data-v6-session-auto-end]').checked = false;
      document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-v6-dashboard-create-session]').click();

      const deadline = performance.now() + 5000;
      let state = root.__v6SessionDashboard.getState();
      while (state.surface !== 'workstation' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        state = root.__v6SessionDashboard.getState();
      }
      root.__v6SessionDashboard.enterSessionSurface();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const sessions = await commands.dispatchCommand('session.list');
      const rowNames = [...document.querySelectorAll('[data-v6-dashboard-session-row] .session-row-main strong')]
        .map((element) => element.textContent.trim());
      const stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));

      return {
        activeId: (await commands.dispatchCommand('session.getActive'))?.id || '',
        recentSessions: root.__v6SessionDashboard.getState().recentSessions,
        rowNames,
        rows: document.querySelectorAll('[data-v6-dashboard-session-row]').length,
        sessions: sessions.map((session) => ({ id: session.id, name: session.name })),
        storedIds: stored.sessions.map((session) => session.id),
      };
    })()))()
  `));

  assert.equal(value.rows, 3);
  assert.deepEqual(value.rowNames, ['3', '2', '1']);
  assert.deepEqual(value.recentSessions, {
    page: 1,
    pageCount: 1,
    pageSize: 5,
    query: '',
    sort: 'newest',
    visibleCount: 3,
  });
  assert.deepEqual(value.sessions, [
    { id: 'v6-session-0001', name: '1' },
    { id: 'v6-session-0002', name: '2' },
    { id: 'v6-session-0003', name: '3' },
  ]);
  assert.equal(value.activeId, 'v6-session-0003');
  assert.deepEqual(value.storedIds, ['v6-session-0001', 'v6-session-0002', 'v6-session-0003']);
} finally {
  await page.cleanup();
}

console.log('v6 recent sessions persistent id browser smoke passed');
