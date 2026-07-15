import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.sessions.metadata';

const page = await openV6Page({ height: 900, width: 1440 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem(${JSON.stringify(STORAGE_KEY)});
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const visible = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return !element.hidden && rect.width > 0 && rect.height > 0;
      };

      document.querySelector('[data-v6-quick-session-open]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const opened = {
        assetChips: document.querySelector('[data-v6-selected-asset-chips]')?.textContent || '',
        assetOptions: [...document.querySelectorAll('[data-v6-asset-option]')].map((option) => option.dataset.v6AssetOption),
        createLabel: document.querySelector('[data-v6-dashboard-create-session]')?.textContent.trim() || '',
        modalVisible: visible('[data-v6-quick-session-modal]'),
        nameValue: document.querySelector('[data-v6-session-setup-name]')?.value || '',
        propFirmVisible: document.querySelector('[data-v6-session-setup-form]')?.textContent.includes('Prop Firm Session') || false,
      };

      document.querySelector('[data-v6-asset-picker-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-asset-option="NQ"]').click();
      document.querySelector('[data-v6-asset-option="ES"]').click();
      document.querySelector('[data-v6-session-setup-start]').focus();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-session-setup-name]').value = 'abc';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-07-01T09:30';
      document.querySelector('[data-v6-session-auto-end]').checked = true;
      document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const beforeCreate = {
        autoEndChecked: document.querySelector('[data-v6-session-auto-end]').checked,
        computedEnd: document.querySelector('[data-v6-session-setup-computed-end]').value,
        endDisabled: document.querySelector('[data-v6-session-setup-end]').disabled,
        menuHiddenAfterBlur: document.querySelector('[data-v6-asset-picker-menu]').hidden,
        selectedSymbols: [...document.querySelectorAll('[name="symbols"]')].map((input) => input.value),
      };

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let state = root.__v6SessionDashboard.getState();
      while (state.surface !== 'workstation' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        state = root.__v6SessionDashboard.getState();
      }
      const session = await commands.dispatchCommand('session.getActive');
      const stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
      document.querySelector('[data-v6-dashboard-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      return {
        beforeCreate,
        dashboard: root.__v6SessionDashboard.getState(),
        modalHiddenAfterCreate: document.querySelector('[data-v6-quick-session-modal]').hidden,
        opened,
        rowText: document.querySelector('[data-v6-dashboard-session-row]')?.textContent || '',
        session,
        stored,
        topName: document.querySelector('[data-v6-session-name]')?.textContent || '',
        topSymbol: document.querySelector('[data-v6-top-symbol]')?.textContent || '',
      };
    })()))()
  `));

  assert.equal(value.opened.modalVisible, true);
  assert.equal(value.opened.nameValue, '');
  assert.match(value.opened.assetChips, /Select NQ or ES/);
  assert.deepEqual(value.opened.assetOptions, ['NQ', 'ES']);
  assert.equal(value.opened.propFirmVisible, false);
  assert.equal(value.opened.createLabel, 'Create session');
  assert.deepEqual(value.beforeCreate.selectedSymbols, ['NQ', 'ES']);
  assert.equal(value.beforeCreate.autoEndChecked, true);
  assert.equal(value.beforeCreate.endDisabled, true);
  assert.equal(value.beforeCreate.menuHiddenAfterBlur, true);
  assert.equal(value.beforeCreate.computedEnd, '2026-07-05T09:30');
  assert.equal(value.session.name, 'abc');
  assert.equal(value.session.symbol, 'NQ');
  assert.deepEqual(value.session.symbols, ['NQ', 'ES']);
  assert.equal(value.session.autoUpdateEndDate, true);
  assert.equal(value.stored.sessions[0].name, 'abc');
  assert.deepEqual(value.stored.sessions[0].symbols, ['NQ', 'ES']);
  assert.equal(value.modalHiddenAfterCreate, true);
  assert.equal(value.dashboard.surface, 'session');
  assert.match(value.rowText, /abc/);
  assert.match(value.rowText, /NQ/);
  assert.match(value.rowText, /ES/);
  assert.equal(value.topName, 'abc');
  assert.equal(value.topSymbol, 'NQ');
} finally {
  await page.cleanup();
}

console.log('v6 quick session flow browser smoke passed');
