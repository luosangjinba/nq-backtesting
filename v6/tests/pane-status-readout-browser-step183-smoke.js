import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { emitEvent } = await import('/v6/src/runtime/events.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const commands = await import('/v6/src/runtime/commands.js');

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-columns' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      emitEvent(contracts.PANE_EVENTS.SYMBOL_INTENT_CHANGED, {
        displayTimeframe: 1,
        id: 'main',
        instrument: 'NQ',
      });
      emitEvent(contracts.PANE_EVENTS.SYMBOL_INTENT_CHANGED, {
        displayTimeframe: 5,
        id: 'secondary',
        instrument: 'ES',
      });
      emitEvent(contracts.PANE_EVENTS.SYMBOL_INTENT_CHANGED, {
        displayTimeframe: 15,
        id: 'tertiary',
        instrument: 'YM',
      });
      emitEvent(contracts.CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, {
        bar: { close: 101, high: 102, low: 99, open: 100, timestamp: 1780306200 },
        paneId: 'main',
      });
      emitEvent(contracts.CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, {
        bar: { close: 207, high: 211, low: 206, open: 210, timestamp: 1780306200 },
        paneId: 'secondary',
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      function readPane(paneId) {
        const readout = document.querySelector('[data-v6-pane-status-readout][data-v6-pane-id="' + paneId + '"]');
        const text = (selector) => readout?.querySelector(selector)?.textContent?.trim() || '';
        const colors = {
          change: getComputedStyle(readout.querySelector('[data-v6-status-change]')).color,
          close: getComputedStyle(readout.querySelector('[data-v6-status-close]')).color,
          high: getComputedStyle(readout.querySelector('[data-v6-status-high]')).color,
          low: getComputedStyle(readout.querySelector('[data-v6-status-low]')).color,
          open: getComputedStyle(readout.querySelector('[data-v6-status-open]')).color,
        };
        const box = readout?.getBoundingClientRect();
        return {
          colors,
          dataset: {
            direction: readout?.dataset.statusCandleDirection,
            ohlc: readout?.dataset.statusOhlc,
            symbol: readout?.dataset.v6PaneSymbol,
            timeframe: readout?.dataset.v6PaneTimeframe,
          },
          hiddenByHost: readout?.closest('[data-v6-chart-engine-host]')?.hidden || false,
          ohlc: {
            close: text('[data-v6-status-close]'),
            high: text('[data-v6-status-high]'),
            low: text('[data-v6-status-low]'),
            open: text('[data-v6-status-open]'),
          },
          rect: box ? { left: box.left, top: box.top, width: box.width } : null,
          symbol: text('[data-v6-status-symbol]'),
          timeframe: text('[data-v6-status-timeframe]'),
        };
      }

      return {
        layout: document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState().layout,
        paneReadoutCount: document.querySelectorAll('[data-v6-pane-status-readout]').length,
        panes: {
          main: readPane('main'),
          secondary: readPane('secondary'),
          tertiary: readPane('tertiary'),
        },
      };
    })()))()
  `));

  assert.deepEqual(value.layout.visiblePaneIds, ['main', 'secondary', 'tertiary']);
  assert.equal(value.paneReadoutCount, 3);
  assert.equal(value.panes.main.symbol, 'NQ');
  assert.equal(value.panes.main.timeframe, '1m');
  assert.equal(value.panes.main.ohlc.open, 'O 100.00');
  assert.equal(value.panes.main.ohlc.close, 'C 101.00');
  assert.equal(value.panes.main.dataset.direction, 'up');
  assert.equal(new Set(Object.values(value.panes.main.colors)).size, 1);
  assert.equal(value.panes.main.colors.open, 'rgb(54, 183, 168)');

  assert.equal(value.panes.secondary.symbol, 'ES');
  assert.equal(value.panes.secondary.timeframe, '5m');
  assert.equal(value.panes.secondary.ohlc.open, 'O 210.00');
  assert.equal(value.panes.secondary.ohlc.close, 'C 207.00');
  assert.equal(value.panes.secondary.dataset.direction, 'down');
  assert.equal(new Set(Object.values(value.panes.secondary.colors)).size, 1);
  assert.equal(value.panes.secondary.colors.open, 'rgb(242, 95, 104)');

  assert.equal(value.panes.tertiary.symbol, 'YM');
  assert.equal(value.panes.tertiary.timeframe, '15m');
  assert.deepEqual(value.panes.tertiary.ohlc, {
    close: 'C --',
    high: 'H --',
    low: 'L --',
    open: 'O --',
  });
  assert.equal(value.panes.tertiary.dataset.ohlc, 'empty');
  assert.equal(value.panes.main.hiddenByHost, false);
  assert.equal(value.panes.secondary.hiddenByHost, false);
  assert.equal(value.panes.tertiary.hiddenByHost, false);
} finally {
  await page.cleanup();
}

console.log('v6 pane status readout browser step 183 smoke passed');
