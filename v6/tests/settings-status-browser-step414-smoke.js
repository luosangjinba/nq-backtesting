import assert from 'node:assert/strict';
import { evaluate, waitForExpression } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.persistence.records';
const expected = {
  statusBackgroundColor: '#112233',
  statusBackgroundOpacityPercent: 60,
  statusBarChangeVisible: false,
  statusOhlcVisible: false,
  statusTitleMode: 'hidden',
};

const page = await openV6Page({ height: 820, width: 1280 });
try {
  await evaluate(page.client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8_000);

  const result = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const { emitEvent } = await import('/v6/src/runtime/events.js');
      const root = document.querySelector('[data-v6-root]');
      await root.__v6SettingsStatusReadoutBridge.ready;
      await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.UPDATE, { symbolUpBodyColor: '#abcdef' });
      const main = document.querySelector('[data-v6-pane-status-readout][data-v6-pane-id="main"]');
      const openStatus = async () => {
        document.querySelector('[data-v6-settings-toggle]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector('[data-v6-settings-tab="status"]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      };
      const edit = (values) => Object.entries(values).forEach(([key, value]) => {
        const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
        if (field.type === 'checkbox') field.checked = value;
        else field.value = String(value);
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const presentation = () => ({
        background: getComputedStyle(main).backgroundColor,
        changeDisplay: getComputedStyle(main.querySelector('[data-v6-status-change]')).display,
        ohlcDisplay: getComputedStyle(main.querySelector('[data-v6-status-open]')).display,
        titleDisplay: getComputedStyle(main.querySelector('[data-v6-status-symbol]')).display,
      });

      const before = presentation();
      await openStatus();
      edit(${JSON.stringify(expected)});
      const whileDraft = presentation();
      document.querySelector('[data-v6-settings-close-secondary]').click();
      await openStatus();
      const afterCancel = root.__v6SettingsPanel.getState().settings;
      edit(${JSON.stringify(expected)});
      document.querySelector('[data-v6-settings-reset-draft]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterReset = root.__v6SettingsPanel.getState().settings;
      edit(${JSON.stringify(expected)});
      document.querySelector('[data-v6-settings-ok]').click();
      await new Promise((resolve) => setTimeout(resolve, 30));
      emitEvent(contracts.CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, {
        bar: { close: 102, high: 103, low: 99, open: 100, timestamp: 200 },
        paneId: 'main',
        previousClose: 100,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        afterCancel,
        afterCommit: presentation(),
        afterReset,
        before,
        changeText: main.querySelector('[data-v6-status-change]').textContent,
        committed: await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT),
        paneStates: [...document.querySelectorAll('[data-v6-pane-status-readout]')].map((element) => ({
          change: element.dataset.v6StatusBarChangeVisible,
          ohlc: element.dataset.v6StatusOhlcVisible,
          title: element.dataset.v6StatusTitleMode,
        })),
        whileDraft,
      };
    })()))()
  `));

  assert.deepEqual(result.whileDraft, result.before);
  assert.equal(result.afterCancel.statusTitleMode, 'ticker');
  assert.equal(result.afterReset.statusTitleMode, 'ticker');
  assert.equal(result.afterReset.symbolUpBodyColor, '#abcdef');
  assert.equal(result.afterCommit.background, 'rgba(17, 34, 51, 0.6)');
  assert.equal(result.afterCommit.changeDisplay, 'none');
  assert.equal(result.afterCommit.ohlcDisplay, 'none');
  assert.equal(result.afterCommit.titleDisplay, 'none');
  assert.equal(result.changeText, '+2.00 (+2.00%)');
  for (const [key, value] of Object.entries(expected)) assert.equal(result.committed[key], value);
  assert.deepEqual(result.paneStates, Array(3).fill({ change: 'false', ohlc: 'false', title: 'hidden' }));

  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8_000);
  const restored = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      await root.__v6SettingsStatusReadoutBridge.ready;
      const main = document.querySelector('[data-v6-pane-status-readout][data-v6-pane-id="main"]');
      return {
        background: getComputedStyle(main).backgroundColor,
        change: main.dataset.v6StatusBarChangeVisible,
        ohlc: main.dataset.v6StatusOhlcVisible,
        title: main.dataset.v6StatusTitleMode,
      };
    })()))()
  `));
  assert.deepEqual(restored, {
    background: 'rgba(17, 34, 51, 0.6)',
    change: 'false',
    ohlc: 'false',
    title: 'hidden',
  });
} finally {
  await page.cleanup();
}

console.log('V6 Settings Status browser Step 414 smoke passed.');
