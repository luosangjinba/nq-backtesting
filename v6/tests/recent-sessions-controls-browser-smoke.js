import assert from 'node:assert/strict';
import {
  evaluate,
  waitForExpression,
} from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.sessions.metadata';

const sessions = [
  {
    accountBalance: 100000,
    autoUpdateEndDate: false,
    createdAt: '2026-07-03T10:00:00.000Z',
    endTime: '2026-07-03T23:00:00.000Z',
    id: 'recent-asia',
    name: 'Asia prep',
    profileId: 'default-profile',
    startTime: '2026-07-03T16:30:00.000Z',
    status: 'created',
    symbol: 'YM',
    symbols: ['YM'],
    timeframe: '1m',
    workspaceId: 'default-workspace',
  },
  {
    accountBalance: 100000,
    autoUpdateEndDate: false,
    createdAt: '2026-07-05T10:00:00.000Z',
    endTime: '2026-07-05T23:00:00.000Z',
    id: 'recent-ny',
    name: 'NY AM',
    profileId: 'default-profile',
    startTime: '2026-07-05T16:30:00.000Z',
    status: 'created',
    symbol: 'ES',
    symbols: ['ES', 'NQ'],
    timeframe: '1m',
    workspaceId: 'default-workspace',
  },
  {
    accountBalance: 100000,
    autoUpdateEndDate: false,
    createdAt: '2026-07-04T10:00:00.000Z',
    endTime: '2026-07-04T23:00:00.000Z',
    id: 'recent-london',
    name: 'London review',
    profileId: 'default-profile',
    startTime: '2026-07-04T16:30:00.000Z',
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
      activeSessionId: null,
      sessions,
      version: 1,
    }))});
  `);
  await reloadAndWait();

  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const rowNames = () => [...document.querySelectorAll('[data-v6-dashboard-session-row] .session-row-main strong')]
        .map((element) => element.textContent.trim());
      const snapshot = async () => ({
        barCache: await commands.dispatchCommand('barData.getCacheSummary'),
        chartEntry: await commands.dispatchCommand('chartEntry.getState'),
        chartSummary: await commands.dispatchCommand('chartData.getSummary'),
        replay: await commands.dispatchCommand('replay.getState'),
      });

      const before = await snapshot();
      const initial = {
        names: rowNames(),
        state: root.__v6SessionDashboard.getState().recentSessions,
      };

      document.querySelector('[data-v6-dashboard-search]').value = 'nq';
      document.querySelector('[data-v6-dashboard-search]').dispatchEvent(new Event('input', { bubbles: true }));
      const afterSearch = {
        names: rowNames(),
        state: root.__v6SessionDashboard.getState().recentSessions,
        snapshot: await snapshot(),
      };

      document.querySelector('[data-v6-dashboard-sort]').click();
      const afterSort = {
        names: rowNames(),
        state: root.__v6SessionDashboard.getState().recentSessions,
        snapshot: await snapshot(),
      };

      document.querySelector('[data-v6-dashboard-search]').value = '';
      document.querySelector('[data-v6-dashboard-search]').dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-v6-dashboard-page-size]').value = '2';
      document.querySelector('[data-v6-dashboard-page-size]').dispatchEvent(new Event('change', { bubbles: true }));
      const pageOne = {
        names: rowNames(),
        readout: document.querySelector('[data-v6-dashboard-page-readout]').textContent,
        state: root.__v6SessionDashboard.getState().recentSessions,
      };
      document.querySelector('[data-v6-dashboard-page-next]').click();
      const pageTwo = {
        names: rowNames(),
        readout: document.querySelector('[data-v6-dashboard-page-readout]').textContent,
        state: root.__v6SessionDashboard.getState().recentSessions,
        snapshot: await snapshot(),
      };

      document.querySelector('[data-v6-dashboard-search]').value = 'ny';
      document.querySelector('[data-v6-dashboard-search]').dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-v6-dashboard-open-session]').click();
      const deadline = performance.now() + 5000;
      let openState = root.__v6SessionDashboard.getState();
      let replay = await commands.dispatchCommand('replay.getState');
      while ((openState.surface !== 'workstation' || replay?.sessionId !== 'recent-ny') && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        openState = root.__v6SessionDashboard.getState();
        replay = await commands.dispatchCommand('replay.getState');
      }
      const opened = {
        active: await commands.dispatchCommand('session.getActive'),
        replay,
        state: openState,
      };

      return {
        afterSearch,
        afterSort,
        before,
        initial,
        opened,
        pageOne,
        pageTwo,
      };
    })()))()
  `));

  assert.deepEqual(value.initial.names, ['NY AM', 'London review', 'Asia prep']);
  assert.deepEqual(value.initial.state, {
    page: 1,
    pageCount: 1,
    pageSize: 5,
    query: '',
    sort: 'newest',
    visibleCount: 3,
  });
  assert.deepEqual(value.before.chartSummary, {
    paneCount: 0,
    panes: [],
  });
  assert.deepEqual(value.before.barCache, {
    barCount: 0,
    keys: [],
    windowCount: 0,
  });
  assert.equal(value.before.replay, null);
  assert.equal(value.before.chartEntry.status, 'idle');

  assert.deepEqual(value.afterSearch.names, ['NY AM', 'London review']);
  assert.equal(value.afterSearch.state.query, 'nq');
  assert.equal(value.afterSearch.state.visibleCount, 2);
  assert.deepEqual(value.afterSearch.snapshot, value.before);

  assert.deepEqual(value.afterSort.names, ['London review', 'NY AM']);
  assert.equal(value.afterSort.state.sort, 'oldest');
  assert.deepEqual(value.afterSort.snapshot, value.before);

  assert.deepEqual(value.pageOne.names, ['Asia prep', 'London review']);
  assert.equal(value.pageOne.readout, '1 of 2');
  assert.deepEqual(value.pageTwo.names, ['NY AM']);
  assert.equal(value.pageTwo.readout, '2 of 2');
  assert.deepEqual(value.pageTwo.snapshot, value.before);

  assert.equal(value.opened.state.surface, 'workstation');
  assert.equal(value.opened.active.id, 'recent-ny');
  assert.equal(value.opened.replay.sessionId, 'recent-ny');
} finally {
  await page.cleanup();
}

console.log('v6 recent sessions controls browser smoke passed');
