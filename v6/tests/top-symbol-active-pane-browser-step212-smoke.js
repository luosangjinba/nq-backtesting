import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      await root.__v6TopSymbolActivePaneBridge.ready;

      function readTopSymbol() {
        const element = document.querySelector('[data-v6-top-symbol]');
        return {
          dataset: element?.dataset.v6TopSymbol || '',
          text: element?.textContent?.trim() || '',
        };
      }

      const initial = readTopSymbol();
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-columns' });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_SYMBOL_INTENT, { paneId: 'secondary', instrument: 'ES' });
      const afterInactiveSymbol = readTopSymbol();

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_ACTIVE, 'secondary');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterActiveSwitch = readTopSymbol();

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_SYMBOL_INTENT, { paneId: 'main', instrument: 'YM' });
      const afterOtherPaneSymbol = readTopSymbol();

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_SYMBOL_INTENT, { paneId: 'secondary', instrument: 'RTY' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterActiveSymbol = readTopSymbol();

      return {
        afterActiveSwitch,
        afterActiveSymbol,
        afterInactiveSymbol,
        afterOtherPaneSymbol,
        initial,
      };
    })()))()
  `));

  assert.deepEqual(value.initial, { dataset: 'NQ', text: 'NQ' });
  assert.deepEqual(value.afterInactiveSymbol, { dataset: 'NQ', text: 'NQ' });
  assert.deepEqual(value.afterActiveSwitch, { dataset: 'ES', text: 'ES' });
  assert.deepEqual(value.afterOtherPaneSymbol, { dataset: 'ES', text: 'ES' });
  assert.deepEqual(value.afterActiveSymbol, { dataset: 'RTY', text: 'RTY' });
} finally {
  await page.cleanup();
}

console.log('v6 top symbol active pane browser step 212 smoke passed');
