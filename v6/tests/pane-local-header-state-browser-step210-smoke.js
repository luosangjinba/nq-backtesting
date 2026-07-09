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
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_SYMBOL_INTENT, { paneId: 'main', instrument: 'NQ' });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, { paneId: 'main', displayTimeframe: 1 });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_SYMBOL_INTENT, { paneId: 'secondary', instrument: 'ES' });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, { paneId: 'secondary', displayTimeframe: 5 });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_SYMBOL_INTENT, { paneId: 'tertiary', instrument: 'YM' });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, { paneId: 'tertiary', displayTimeframe: 15 });

      emitEvent(contracts.CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, {
        bar: { close: 101, high: 102, low: 99, open: 100, timestamp: 1780306200 },
        paneId: 'main',
      });
      emitEvent(contracts.CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, {
        bar: { close: 207, high: 211, low: 206, open: 210, timestamp: 1780306200 },
        paneId: 'secondary',
      });
      emitEvent(contracts.CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, {
        bar: { close: 300, high: 305, low: 295, open: 300, timestamp: 1780306200 },
        paneId: 'tertiary',
      });

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_ACTIVE, 'tertiary');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      function readPane(paneId) {
        const readout = document.querySelector('[data-v6-pane-status-readout][data-v6-pane-id="' + paneId + '"]');
        const text = (selector) => readout?.querySelector(selector)?.textContent?.trim() || '';
        return {
          active: readout?.dataset.v6PaneActive,
          dataset: {
            direction: readout?.dataset.statusCandleDirection,
            ohlc: readout?.dataset.statusOhlc,
            symbol: readout?.dataset.v6PaneSymbol,
            timeframe: readout?.dataset.v6PaneTimeframe,
          },
          hostHidden: readout?.closest('[data-v6-chart-engine-host]')?.hidden || false,
          ohlc: {
            close: text('[data-v6-status-close]'),
            high: text('[data-v6-status-high]'),
            low: text('[data-v6-status-low]'),
            open: text('[data-v6-status-open]'),
          },
          symbol: text('[data-v6-status-symbol]'),
          timeframe: text('[data-v6-status-timeframe]'),
        };
      }

      return {
        activePane: await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE),
        layout: document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState().layout,
        panes: {
          main: readPane('main'),
          secondary: readPane('secondary'),
          tertiary: readPane('tertiary'),
        },
        topToolbarTimeframe: document.querySelector('[data-v6-display-timeframe-label]')?.textContent?.trim() || '',
      };
    })()))()
  `));

  assert.deepEqual(value.layout.visiblePaneIds, ['main', 'secondary', 'tertiary']);
  assert.equal(value.activePane.id, 'tertiary');
  assert.equal(value.topToolbarTimeframe, '15m');

  assert.equal(value.panes.main.symbol, 'NQ');
  assert.equal(value.panes.main.timeframe, '1m');
  assert.equal(value.panes.main.active, 'false');
  assert.deepEqual(value.panes.main.ohlc, {
    close: 'C 101.00',
    high: 'H 102.00',
    low: 'L 99.00',
    open: 'O 100.00',
  });

  assert.equal(value.panes.secondary.symbol, 'ES');
  assert.equal(value.panes.secondary.timeframe, '5m');
  assert.equal(value.panes.secondary.active, 'false');
  assert.equal(value.panes.secondary.dataset.direction, 'down');
  assert.deepEqual(value.panes.secondary.ohlc, {
    close: 'C 207.00',
    high: 'H 211.00',
    low: 'L 206.00',
    open: 'O 210.00',
  });

  assert.equal(value.panes.tertiary.symbol, 'YM');
  assert.equal(value.panes.tertiary.timeframe, '15m');
  assert.equal(value.panes.tertiary.active, 'true');
  assert.equal(value.panes.tertiary.dataset.direction, 'flat');
  assert.deepEqual(value.panes.tertiary.ohlc, {
    close: 'C 300.00',
    high: 'H 305.00',
    low: 'L 295.00',
    open: 'O 300.00',
  });

  assert.equal(value.panes.main.hostHidden, false);
  assert.equal(value.panes.secondary.hostHidden, false);
  assert.equal(value.panes.tertiary.hostHidden, false);
} finally {
  await page.cleanup();
}

console.log('v6 pane-local header state browser step 210 smoke passed');
