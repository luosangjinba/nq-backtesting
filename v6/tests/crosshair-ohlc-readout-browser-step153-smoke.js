import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const setup = JSON.parse(await evaluate(page.client, `
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

      const host = document.querySelector('[data-v6-chart-engine-host]');
      const hostRect = rect('[data-v6-chart-engine-host]');
      const readoutText = text('[data-v6-status-readout]');
      return {
        applyState,
        canvasCount: host.querySelectorAll('canvas').length,
        hostRect,
        initial: {
          close: text('[data-v6-status-close]'),
          high: text('[data-v6-status-high]'),
          low: text('[data-v6-status-low]'),
          open: text('[data-v6-status-open]'),
        },
        labelCounts: {
          nq: (readoutText.match(/NQ/g) || []).length,
          timeframe: (readoutText.match(/1m/g) || []).length,
        },
        readoutText,
        surfaceState: document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState(),
        symbol: text('[data-v6-status-symbol]'),
        timeframe: text('[data-v6-status-timeframe]'),
      };
    })()))()
  `));

  assert.equal(setup.applyState.status, 'applied');
  assert.equal(setup.canvasCount > 0, true);
  assert.equal(setup.initial.open, 'O --');
  assert.equal(setup.initial.high, 'H --');
  assert.equal(setup.initial.low, 'L --');
  assert.equal(setup.initial.close, 'C --');
  assert.equal(setup.labelCounts.nq, 1);
  assert.equal(setup.labelCounts.timeframe, 1);
  assert.equal(setup.symbol, 'NQ');
  assert.equal(setup.timeframe, '1m');

  await page.client.send('Input.dispatchMouseEvent', {
    button: 'none',
    type: 'mouseMoved',
    x: Math.round(setup.hostRect.left + setup.hostRect.width * 0.55),
    y: Math.round(setup.hostRect.top + 120),
  });

  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      function text(selector) {
        return document.querySelector(selector)?.textContent?.trim() || '';
      }

      const deadline = performance.now() + 2500;
      let state = document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState();
      while (!state.crosshair?.[0]?.bar && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        state = document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState();
      }
      const crosshair = state.crosshair?.[0] || null;
      const readoutText = text('[data-v6-status-readout]');
      return {
        crosshair,
        ohlc: {
          close: text('[data-v6-status-close]'),
          high: text('[data-v6-status-high]'),
          low: text('[data-v6-status-low]'),
          open: text('[data-v6-status-open]'),
        },
        placeholderPresent: Boolean(document.querySelector('[data-v6-chart-placeholder]')),
        readoutText,
        readoutTextAll: document.querySelector('[data-v6-status-readout]')?.textContent || '',
        readoutTitle: text('[data-v6-status-symbol]') + ' ' + text('[data-v6-status-timeframe]'),
        textCounts: {
          nq: (readoutText.match(/NQ/g) || []).length,
          timeframe: (readoutText.match(/1m/g) || []).length,
        },
      };
    })()))()
  `));

  assert.notEqual(value.crosshair, null);
  assert.notEqual(value.crosshair.bar, null);
  assert.equal(value.crosshair.paneId, 'main');
  assert.equal(value.ohlc.open, `O ${Number(value.crosshair.bar.open).toFixed(2)}`);
  assert.equal(value.ohlc.high, `H ${Number(value.crosshair.bar.high).toFixed(2)}`);
  assert.equal(value.ohlc.low, `L ${Number(value.crosshair.bar.low).toFixed(2)}`);
  assert.equal(value.ohlc.close, `C ${Number(value.crosshair.bar.close).toFixed(2)}`);
  assert.equal(value.placeholderPresent, false);
  assert.equal(value.textCounts.nq, 1);
  assert.equal(value.textCounts.timeframe, 1);
  assert.equal(value.readoutTitle, 'NQ 1m');
  assert.equal(/NQ\\s+1m\\s+NQ\\s+1m/.test(value.readoutTextAll), false);
} finally {
  await page.cleanup();
}

console.log('v6 crosshair OHLC readout browser step 153 smoke passed');
