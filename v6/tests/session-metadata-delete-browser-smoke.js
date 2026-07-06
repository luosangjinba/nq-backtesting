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

  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      localStorage.removeItem(${JSON.stringify(STORAGE_KEY)});

      const waitForRows = async (expected) => {
        const deadline = performance.now() + 5000;
        let rows = document.querySelectorAll('[data-v6-dashboard-session-row]').length;
        while (rows !== expected && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          rows = document.querySelectorAll('[data-v6-dashboard-session-row]').length;
        }
        return rows;
      };
      const waitForWorkstationReady = async (sessionId) => {
        const deadline = performance.now() + 5000;
        let chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
        let chartEntry = await commands.dispatchCommand('chartEntry.getState');
        let replay = await commands.dispatchCommand('replay.getState');
        while (
          (
            chartEntry.activeSessionId !== sessionId ||
            !chart.bars?.length ||
            replay?.sessionId !== sessionId ||
            replay?.status !== 'ready'
          ) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
          chartEntry = await commands.dispatchCommand('chartEntry.getState');
          replay = await commands.dispatchCommand('replay.getState');
        }
        return {
          chart,
          chartEntry,
          replay,
        };
      };
      const createSession = async ({ start, end }) => {
        document.querySelector('[data-v6-session-setup-start]').value = start;
        document.querySelector('[data-v6-session-setup-end]').value = end;
        document.querySelector('[data-v6-dashboard-create-session]').click();
        const deadline = performance.now() + 5000;
        let state = root.__v6SessionDashboard.getState();
        while (state.surface !== 'workstation' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          state = root.__v6SessionDashboard.getState();
        }
        const session = await commands.dispatchCommand('session.getActive');
        await waitForWorkstationReady(session.id);
        return session;
      };
      const goDashboard = async () => {
        document.querySelector('[data-v6-dashboard-toggle]').click();
        const deadline = performance.now() + 5000;
        let state = root.__v6SessionDashboard.getState();
        while (state.surface !== 'session' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          state = root.__v6SessionDashboard.getState();
        }
        return state;
      };
      const snapshots = async () => ({
        chartEntry: await commands.dispatchCommand('chartEntry.getState'),
        chartSummary: await commands.dispatchCommand('chartData.getSummary'),
        replay: await commands.dispatchCommand('replay.getState'),
      });

      const first = await createSession({
        end: '2026-06-03T16:00',
        start: '2026-06-01T09:30',
      });
      await goDashboard();
      await waitForRows(1);

      const second = await createSession({
        end: '2026-06-05T16:00',
        start: '2026-06-04T09:30',
      });
      const beforeDelete = await snapshots();
      await goDashboard();
      await waitForRows(2);

      document.querySelector(\`[data-v6-dashboard-delete-session="\${first.id}"]\`).click();
      const inactiveRows = await waitForRows(1);
      const afterInactiveDelete = {
        active: await commands.dispatchCommand('session.getActive'),
        dashboard: root.__v6SessionDashboard.getState(),
        snapshots: await snapshots(),
        stored: JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})),
      };

      document.querySelector(\`[data-v6-dashboard-delete-session="\${second.id}"]\`).click();
      const activeRows = await waitForRows(0);
      const afterActiveDelete = {
        active: await commands.dispatchCommand('session.getActive'),
        dashboard: root.__v6SessionDashboard.getState(),
        snapshots: await snapshots(),
        stored: JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})),
      };

      return {
        activeRows,
        afterActiveDelete,
        afterInactiveDelete,
        beforeDelete,
        first,
        inactiveRows,
        second,
      };
    })()))()
  `));

  assert.equal(value.inactiveRows, 1);
  assert.equal(value.afterInactiveDelete.active.id, value.second.id);
  assert.deepEqual(value.afterInactiveDelete.dashboard.sessions.map((session) => session.id), [value.second.id]);
  assert.deepEqual(value.afterInactiveDelete.stored.sessions.map((session) => session.id), [value.second.id]);
  assert.equal(value.afterInactiveDelete.stored.activeSessionId, value.second.id);
  assert.deepEqual(value.afterInactiveDelete.snapshots, value.beforeDelete);

  assert.equal(value.activeRows, 0);
  assert.equal(value.afterActiveDelete.active, null);
  assert.deepEqual(value.afterActiveDelete.dashboard.sessions, []);
  assert.deepEqual(value.afterActiveDelete.stored.sessions, []);
  assert.equal(value.afterActiveDelete.stored.activeSessionId, null);
  assert.deepEqual(value.afterActiveDelete.snapshots, value.beforeDelete);

  await reloadAndWait();
  const afterReload = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
      return {
        active: await commands.dispatchCommand('session.getActive'),
        rows: document.querySelectorAll('[data-v6-dashboard-session-row]').length,
        sessions: await commands.dispatchCommand('session.list'),
        stored,
      };
    })()))()
  `));

  assert.equal(afterReload.active, null);
  assert.equal(afterReload.rows, 0);
  assert.deepEqual(afterReload.sessions, []);
  assert.deepEqual(afterReload.stored.sessions, []);
  assert.equal(afterReload.stored.activeSessionId, null);
} finally {
  await page.cleanup();
}

console.log('v6 session metadata delete browser smoke passed');
