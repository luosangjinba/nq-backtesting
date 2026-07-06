import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const transport = root.__v6ReplayTransport;
      const details = document.querySelector('[data-v6-transport-period-details]');
      const syncToggle = document.querySelector('[data-v6-transport-period-sync]');

      const waitForPeriod = async (predicate) => {
        const deadline = performance.now() + 3000;
        let state = await commands.dispatchCommand('playbackPeriod.getState');
        while (!predicate(state) && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          state = await commands.dispatchCommand('playbackPeriod.getState');
        }
        return state;
      };

      details.open = true;
      document.querySelector('[data-v6-transport-period-option="3m"]').click();
      const afterManualThree = await waitForPeriod((state) => state.period === '3m' && !state.sync);
      const activeBeforeSync = await commands.dispatchCommand('pane.getActive');

      syncToggle.checked = true;
      syncToggle.dispatchEvent(new Event('change', { bubbles: true }));
      const afterSyncOn = await waitForPeriod((state) => state.sync === true);

      await commands.dispatchCommand('pane.setDisplayTimeframe', {
        displayTimeframe: 5,
        paneId: activeBeforeSync.id,
      });
      const afterPanePeriodChange = await waitForPeriod((state) => state.period === '5m' && state.sync);
      const paneAfterSyncChange = await commands.dispatchCommand('pane.getActive');

      details.open = true;
      document.querySelector('[data-v6-transport-period-option="30s"]').click();
      const afterManualThirtySeconds = await waitForPeriod((state) => state.period === '30s' && !state.sync);
      const paneAfterManualPeriod = await commands.dispatchCommand('pane.getActive');

      return {
        afterManualThirtySeconds,
        afterManualThree,
        afterPanePeriodChange,
        afterSyncOn,
        ariaThirtySeconds: document.querySelector('[data-v6-transport-period-option="30s"]').getAttribute('aria-checked'),
        label: document.querySelector('[data-v6-transport-period-label]').textContent.trim(),
        paneAfterManualPeriod,
        paneAfterSyncChange,
        syncChecked: syncToggle.checked,
        transportDataset: {
          period: document.querySelector('[data-v6-transport]').dataset.period,
          periodSync: document.querySelector('[data-v6-transport]').dataset.periodSync,
        },
        transportState: transport.getState(),
      };
    })()))()
  `));

  assert.equal(value.afterManualThree.period, '3m');
  assert.equal(value.afterManualThree.sync, false);
  assert.equal(value.afterSyncOn.period, '1m');
  assert.equal(value.afterSyncOn.sync, true);
  assert.equal(value.afterPanePeriodChange.period, '5m');
  assert.equal(value.afterPanePeriodChange.sync, true);
  assert.equal(value.paneAfterSyncChange.displayTimeframe, 5);
  assert.equal(value.afterManualThirtySeconds.period, '30s');
  assert.equal(value.afterManualThirtySeconds.sync, false);
  assert.equal(value.paneAfterManualPeriod.displayTimeframe, 5);
  assert.equal(value.label, '30s');
  assert.equal(value.syncChecked, false);
  assert.deepEqual(value.transportDataset, {
    period: '30s',
    periodSync: 'false',
  });
  assert.equal(value.transportState.period, '30s');
  assert.equal(value.transportState.periodSync, false);
  assert.equal(value.ariaThirtySeconds, 'true');
} finally {
  await page.cleanup();
}

console.log('v6 playback period browser smoke passed');
