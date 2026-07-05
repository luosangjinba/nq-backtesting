import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      const chartRectBefore = document.querySelector('[data-v6-chart-surface]').getBoundingClientRect();
      const toggle = document.querySelector('[data-v6-display-timeframe-toggle]');
      toggle.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const chartRectOpen = document.querySelector('[data-v6-chart-surface]').getBoundingClientRect();
      const menu = document.querySelector('[data-v6-display-timeframe-menu]');
      const menuRect = menu.getBoundingClientRect();
      const headings = [...menu.querySelectorAll('.timeframe-menu-heading')].map((element) => element.textContent.trim());
      const disabledTexts = [...menu.querySelectorAll('button:disabled')].map((element) => element.textContent.trim());
      const optionFive = menu.querySelector('[data-v6-display-timeframe-option="5"]');
      optionFive.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        ariaExpandedAfterSelect: toggle.getAttribute('aria-expanded'),
        chartHeightBefore: Math.round(chartRectBefore.height),
        chartHeightOpen: Math.round(chartRectOpen.height),
        chartTopBefore: Math.round(chartRectBefore.top),
        chartTopOpen: Math.round(chartRectOpen.top),
        customDisabled: document.querySelector('[data-v6-display-timeframe-custom]')?.disabled === true,
        displayTimeframe: root.dataset.displayTimeframe,
        headings,
        label: document.querySelector('[data-v6-display-timeframe-label]')?.textContent.trim(),
        menuHiddenAfterSelect: menu.hidden,
        menuLeft: Math.round(menuRect.left),
        menuTop: Math.round(menuRect.top),
        optionOneChecked: menu.querySelector('[data-v6-display-timeframe-option="1"]')?.getAttribute('aria-checked'),
        optionFiveChecked: optionFive.getAttribute('aria-checked'),
        readout: document.querySelector('[data-v6-display-timeframe-readout]')?.textContent.trim(),
        selectMissing: !document.querySelector('[data-v6-display-timeframe-select]'),
        unsupportedDisabled: disabledTexts.includes('1 second') && disabledTexts.includes('1 hour') && disabledTexts.includes('1 day'),
      };
    })()))()
  `));

  assert.deepEqual(value.headings, ['Seconds', 'Minutes', 'Hours', 'Days']);
  assert.equal(value.customDisabled, true);
  assert.equal(value.unsupportedDisabled, true);
  assert.equal(value.selectMissing, true);
  assert.equal(value.menuTop > 0, true);
  assert.equal(value.menuLeft >= 0, true);
  assert.equal(value.chartHeightOpen, value.chartHeightBefore);
  assert.equal(value.chartTopOpen, value.chartTopBefore);
  assert.equal(value.displayTimeframe, '5');
  assert.equal(value.label, '5m');
  assert.equal(value.readout, '5m');
  assert.equal(value.optionOneChecked, 'false');
  assert.equal(value.optionFiveChecked, 'true');
  assert.equal(value.menuHiddenAfterSelect, true);
  assert.equal(value.ariaExpandedAfterSelect, 'false');
} finally {
  await page.cleanup();
}

console.log('v6 timeframe menu parity browser smoke passed');
