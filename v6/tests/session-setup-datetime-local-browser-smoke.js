import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

async function createSessionCase({ end, expectedEndIso, expectedStartIso, name, start }) {
  const page = await openV6Page({ height: 900, width: 1440 });
  try {
    return JSON.parse(await evaluate(page.client, `
      (async () => JSON.stringify(await (async () => {
        localStorage.removeItem('v6.sessions.metadata');
        const commands = await import('/v6/src/runtime/commands.js');
        const contracts = await import('/v6/src/contracts/app-contracts.js');

        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        async function waitForApplied() {
          const deadline = performance.now() + 8000;
          let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
          while (applyState.status !== 'applied' && performance.now() < deadline) {
            await sleep(40);
            applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
          }
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return applyState;
        }

        document.querySelector('[data-v6-session-setup-name]').value = ${JSON.stringify(name)};
        document.querySelector('[data-v6-session-setup-start]').value = ${JSON.stringify(start)};
        document.querySelector('[data-v6-session-setup-end]').value = ${JSON.stringify(end)};
        document.querySelector('[data-v6-session-auto-end]').checked = false;
        document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('[data-v6-dashboard-create-session]').click();

        const applyState = await waitForApplied();
        const session = await commands.dispatchCommand(contracts.SESSION_COMMANDS.GET_ACTIVE);
        const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const latest = chart.bars?.at(-1) || null;

        return {
          applyState,
          expectedEndIso: ${JSON.stringify(expectedEndIso)},
          expectedStartIso: ${JSON.stringify(expectedStartIso)},
          latestTimestamp: latest?.timestamp || null,
          replay,
          session,
        };
      })()))()
    `));
  } finally {
    await page.cleanup();
  }
}

const first = await createSessionCase({
  end: '2026-05-08T09:30',
  expectedEndIso: '2026-05-08T09:30:00.000Z',
  expectedStartIso: '2026-05-04T09:30:00.000Z',
  name: 'date-local-1',
  start: '2026-05-04T09:30',
});
const second = await createSessionCase({
  end: '2026-04-05T05:23',
  expectedEndIso: '2026-04-05T05:23:00.000Z',
  expectedStartIso: '2026-04-01T05:23:00.000Z',
  name: 'date-local-2',
  start: '2026-04-01T05:23',
});

for (const value of [first, second]) {
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.session.startTime, value.expectedStartIso);
  assert.equal(value.session.endTime, value.expectedEndIso);
  assert.equal(value.replay.startTime, value.session.startTime);
  assert.equal(value.replay.cursorTime, value.session.startTime);
  assert.equal(new Date(value.latestTimestamp * 1000).toISOString(), value.expectedStartIso);
}

console.log('v6 session setup datetime-local browser smoke passed');
