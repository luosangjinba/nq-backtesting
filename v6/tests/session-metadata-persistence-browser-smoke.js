import assert from 'node:assert/strict';
import {
  evaluate,
  waitForExpression,
} from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.sessions.metadata';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  async function reloadAndWait() {
    await page.client.send('Page.reload', { ignoreCache: true });
    await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8000);
  }

  const created = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      localStorage.removeItem(${JSON.stringify(STORAGE_KEY)});
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let rows = document.querySelectorAll('[data-v6-dashboard-session-row]').length;
      let state = document.querySelector('[data-v6-root]').__v6SessionDashboard.getState();
      while ((rows < 1 || state.surface !== 'workstation') && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        rows = document.querySelectorAll('[data-v6-dashboard-session-row]').length;
        state = document.querySelector('[data-v6-root]').__v6SessionDashboard.getState();
      }
      const sessions = await commands.dispatchCommand('session.list');
      const stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
      return {
        rows,
        sessions,
        state,
        stored,
      };
    })()))()
  `));

  assert.equal(created.rows, 1);
  assert.equal(created.sessions.length, 1);
  assert.equal(created.stored.sessions.length, 1);
  assert.equal(created.stored.activeSessionId, created.sessions[0].id);
  assert.equal(created.state.surface, 'workstation');

  await reloadAndWait();
  const listedAfterReload = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const waitForRows = async () => {
        const deadline = performance.now() + 5000;
        let rows = document.querySelectorAll('[data-v6-dashboard-session-row]').length;
        while (rows < 1 && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          rows = document.querySelectorAll('[data-v6-dashboard-session-row]').length;
        }
        return rows;
      };
      const rows = await waitForRows();
      const chartSummary = await commands.dispatchCommand('chartData.getSummary');
      const barCache = await commands.dispatchCommand('barData.getCacheSummary');
      const replay = await commands.dispatchCommand('replay.getState');
      const chartEntry = await commands.dispatchCommand('chartEntry.getState');
      const sessions = await commands.dispatchCommand('session.list');
      return {
        barCache,
        chartEntry,
        chartSummary,
        dashboard: root.__v6SessionDashboard.getState(),
        replay,
        rows,
        rowText: document.querySelector('[data-v6-dashboard-session-row]')?.textContent || '',
        sessions,
      };
    })()))()
  `));

  assert.equal(listedAfterReload.rows, 1);
  assert.equal(listedAfterReload.sessions.length, 1);
  assert.equal(listedAfterReload.dashboard.surface, 'session');
  assert.deepEqual(listedAfterReload.chartSummary, {
    paneCount: 0,
    panes: [],
  });
  assert.deepEqual(listedAfterReload.barCache, {
    barCount: 0,
    keys: [],
    windowCount: 0,
  });
  assert.equal(listedAfterReload.replay, null);
  assert.equal(listedAfterReload.chartEntry.status, 'idle');

  const openedRestored = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      document.querySelector('[data-v6-dashboard-open-session]').click();
      const deadline = performance.now() + 5000;
      let chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      let replay = await commands.dispatchCommand('replay.getState');
      while ((!chart.bars?.length || replay?.status !== 'ready') && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
        replay = await commands.dispatchCommand('replay.getState');
      }
      const chartEntry = await commands.dispatchCommand('chartEntry.getState');
      return {
        chartBarCount: chart.bars?.length || 0,
        chartEntry,
        dashboard: root.__v6SessionDashboard.getState(),
        replay,
      };
    })()))()
  `));

  assert.equal(openedRestored.dashboard.surface, 'workstation');
  assert.equal(openedRestored.chartEntry.activeSessionId, listedAfterReload.sessions[0].id);
  assert.equal(openedRestored.chartBarCount > 0, true);
  assert.equal(openedRestored.replay.status, 'ready');

  await reloadAndWait();
  await evaluate(page.client, `
    localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, '{corrupt-json')
  `);
  await reloadAndWait();
  const corrupted = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const rows = document.querySelectorAll('[data-v6-dashboard-session-row]').length;
      const sessions = await commands.dispatchCommand('session.list');
      const chartSummary = await commands.dispatchCommand('chartData.getSummary');
      const barCache = await commands.dispatchCommand('barData.getCacheSummary');
      return {
        barCache,
        chartSummary,
        rows,
        sessions,
      };
    })()))()
  `));

  assert.equal(corrupted.rows, 0);
  assert.deepEqual(corrupted.sessions, []);
  assert.deepEqual(corrupted.chartSummary, {
    paneCount: 0,
    panes: [],
  });
  assert.deepEqual(corrupted.barCache, {
    barCount: 0,
    keys: [],
    windowCount: 0,
  });
} finally {
  await page.cleanup();
}

console.log('v6 session metadata persistence browser smoke passed');
