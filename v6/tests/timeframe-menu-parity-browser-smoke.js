import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      const toggle = document.querySelector('[data-v6-display-timeframe-toggle]');
      toggle.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const menu = document.querySelector('[data-v6-display-timeframe-menu]');
      const headings = [...menu.querySelectorAll('.timeframe-menu-heading')].map((element) => element.textContent.trim());
      const disabledTexts = [...menu.querySelectorAll('button:disabled')].map((element) => element.textContent.trim());
      const enabledValues = [...menu.querySelectorAll('[data-v6-display-timeframe-option]')]
        .map((element) => element.dataset.v6DisplayTimeframeOption);
      const plannedIds = [...menu.querySelectorAll('[data-v6-display-timeframe-planned]')]
        .map((element) => element.dataset.v6DisplayTimeframePlanned);
      const optionFive = menu.querySelector('[data-v6-display-timeframe-option="5"]');
      optionFive.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        ariaExpandedAfterSelect: toggle.getAttribute('aria-expanded'),
        customDisabled: document.querySelector('[data-v6-display-timeframe-custom]')?.disabled === true,
        displayTimeframe: root.dataset.displayTimeframe,
        enabledValues,
        headings,
        label: document.querySelector('[data-v6-display-timeframe-label]')?.textContent.trim(),
        menuHiddenAfterSelect: menu.hidden,
        optionOneChecked: menu.querySelector('[data-v6-display-timeframe-option="1"]')?.getAttribute('aria-checked'),
        optionFiveChecked: optionFive.getAttribute('aria-checked'),
        plannedIds,
        secondsHidden: !headings.includes('Seconds') && !menu.textContent.includes('1 second'),
        selectMissing: !document.querySelector('[data-v6-display-timeframe-select]'),
        unsupportedDisabled: disabledTexts.includes('1 day') && disabledTexts.includes('1 week') && disabledTexts.includes('1 month'),
      };
    })()))()
  `));

  assert.deepEqual(value.headings, ['Minutes', 'Hours', 'Days', 'Weeks', 'Months']);
  assert.deepEqual(value.enabledValues, ['1', '2', '3', '4', '5', '10', '15', '30', '60', '120', '240', '480', '720']);
  assert.deepEqual(value.plannedIds, ['1D', '1W', '1M']);
  assert.equal(value.customDisabled, true);
  assert.equal(value.secondsHidden, true);
  assert.equal(value.unsupportedDisabled, true);
  assert.equal(value.selectMissing, true);
  assert.equal(value.displayTimeframe, '5');
  assert.equal(value.label, '5m');
  assert.equal(value.optionOneChecked, 'false');
  assert.equal(value.optionFiveChecked, 'true');
  assert.equal(value.menuHiddenAfterSelect, true);
  assert.equal(value.ariaExpandedAfterSelect, 'false');
} finally {
  await page.cleanup();
}

console.log('v6 timeframe menu parity browser smoke passed');
