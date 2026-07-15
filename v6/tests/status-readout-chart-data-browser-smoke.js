import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');

      function text(selector) {
        return document.querySelector(selector)?.textContent?.trim() || '';
      }

      function rect(selector) {
        const element = document.querySelector(selector);
        const box = element?.getBoundingClientRect();
        return box ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          width: box.width,
        } : null;
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      return {
        applyState,
        close: text('[data-v6-status-close]'),
        high: text('[data-v6-status-high]'),
        low: text('[data-v6-status-low]'),
        open: text('[data-v6-status-open]'),
        placeholderPresent: Boolean(document.querySelector('[data-v6-chart-placeholder]')),
        pricePresent: Boolean(document.querySelector('[data-v6-status-price]')),
        rects: {
          close: rect('[data-v6-status-close]'),
          high: rect('[data-v6-status-high]'),
          low: rect('[data-v6-status-low]'),
          open: rect('[data-v6-status-open]'),
          readout: rect('[data-v6-status-readout]'),
          symbol: rect('[data-v6-status-symbol]'),
          timeframe: rect('[data-v6-status-timeframe]'),
        },
        readoutStyle: {
          backgroundColor: getComputedStyle(document.querySelector('[data-v6-status-readout]')).backgroundColor,
          boxShadow: getComputedStyle(document.querySelector('[data-v6-status-readout]')).boxShadow,
          overflow: getComputedStyle(document.querySelector('[data-v6-status-readout]')).overflow,
        },
        symbol: text('[data-v6-status-symbol]'),
        timeframe: text('[data-v6-status-timeframe]'),
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.symbol, 'NQ');
  assert.equal(value.timeframe, '1m');
  assert.equal(value.open, 'O --');
  assert.equal(value.high, 'H --');
  assert.equal(value.low, 'L --');
  assert.equal(value.close, 'C --');
  assert.equal(value.placeholderPresent, false);
  assert.equal(value.pricePresent, false);
  assert.notEqual(value.rects.readout, null);
  assert.equal(value.rects.readout.width > 120, true);
  assert.match(value.readoutStyle.backgroundColor, /^rgba\([^)]*, 0\)$/);
  assert.equal(value.readoutStyle.boxShadow, 'none');
  assert.equal(value.readoutStyle.overflow, 'hidden');

  const ordered = [
    value.rects.symbol,
    value.rects.timeframe,
    value.rects.open,
    value.rects.high,
    value.rects.low,
    value.rects.close,
  ];
  for (const item of ordered) {
    assert.notEqual(item, null);
    assert.equal(item.width > 0, true);
  }
  for (let index = 1; index < ordered.length; index += 1) {
    assert.equal(ordered[index].left >= ordered[index - 1].right, true);
  }
} finally {
  await page.cleanup();
}

console.log('v6 status readout chart data browser smoke passed');
