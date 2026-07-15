import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { emitEvent } = await import('/v6/src/runtime/events.js');
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      await root.__v6DisplayTimeframePaneTargetBridge.ready;
      await root.__v6LayoutSurfaceBridge.ready;
      await root.__v6TopSymbolActivePaneBridge.ready;

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, {
        mode: 'triple',
        variant: 'triple-columns',
      });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_SYMBOL_INTENT, {
        instrument: 'NQ',
        paneId: 'main',
      });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 1,
        paneId: 'main',
      });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_SYMBOL_INTENT, {
        instrument: 'ES',
        paneId: 'secondary',
      });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 5,
        paneId: 'secondary',
      });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_SYMBOL_INTENT, {
        instrument: 'YM',
        paneId: 'tertiary',
      });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 15,
        paneId: 'tertiary',
      });

      const baseBars = Array.from({ length: 10 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const barsByPane = {
        main: baseBars,
        secondary: baseBars.map((bar) => ({
          ...bar,
          close: bar.close + 100,
          high: bar.high + 100,
          low: bar.low + 100,
          open: bar.open + 100,
        })),
        tertiary: baseBars.map((bar) => ({
          ...bar,
          close: bar.close + 200,
          high: bar.high + 200,
          low: bar.low + 200,
          open: bar.open + 200,
        })),
      };

      for (const [paneId, bars] of Object.entries(barsByPane)) {
        await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
          bars,
          cursorTimestamp: bars.at(-1).timestamp,
          paneId,
        });
      }

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

      const secondaryHost = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="secondary"]');
      secondaryHost.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, buttons: 1 }));
      secondaryHost.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, buttons: 0 }));

      const deadline = performance.now() + 5000;
      let activePane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
      while (
        (
          activePane?.id !== 'secondary' ||
          root.__v6DisplayTimeframeControl.getTargetPaneId() !== 'secondary' ||
          root.__v6DisplayTimeframeControl.getValue() !== 5
        ) &&
        performance.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        activePane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
      }

      function readHost(paneId) {
        const host = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="' + paneId + '"]');
        return {
          active: host?.dataset.v6ChartPaneActive || '',
          afterBoxShadow: getComputedStyle(host, '::after').boxShadow,
          hidden: host?.hidden || false,
        };
      }

      function readPaneHeader(paneId) {
        const readout = document.querySelector('[data-v6-pane-status-readout][data-v6-pane-id="' + paneId + '"]');
        const text = (selector) => readout?.querySelector(selector)?.textContent?.trim() || '';
        return {
          active: readout?.dataset.v6PaneActive || '',
          direction: readout?.dataset.statusCandleDirection || '',
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

      const beforeApply = {
        activePane,
        chartData: {
          main: await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' }),
          secondary: await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' }),
          tertiary: await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'tertiary' }),
        },
        controlTarget: root.__v6DisplayTimeframeControl.getTargetPaneId(),
        controlValue: root.__v6DisplayTimeframeControl.getValue(),
        hosts: {
          main: readHost('main'),
          secondary: readHost('secondary'),
          tertiary: readHost('tertiary'),
        },
        panes: {
          main: readPaneHeader('main'),
          secondary: readPaneHeader('secondary'),
          tertiary: readPaneHeader('tertiary'),
        },
        surfaceActivePaneId: root.__v6WorkstationChartSurface.getState().activePaneId,
        topSymbol: document.querySelector('[data-v6-top-symbol]')?.textContent.trim() || '',
        topTimeframe: document.querySelector('[data-v6-display-timeframe-label]')?.textContent.trim() || '',
      };

      document.querySelector('[data-v6-display-timeframe-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-display-timeframe-option="15"]').click();

      let afterPane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'secondary');
      let afterSecondary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
      while ((afterPane.displayTimeframe !== 15 || afterSecondary.bars.length !== 1) && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        afterPane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'secondary');
        afterSecondary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
      }

      const afterApply = {
        activePane: await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE),
        chartData: {
          main: await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' }),
          secondary: afterSecondary,
          tertiary: await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'tertiary' }),
        },
        controlTarget: root.__v6DisplayTimeframeControl.getTargetPaneId(),
        controlValue: root.__v6DisplayTimeframeControl.getValue(),
        pane: afterPane,
        panes: {
          main: readPaneHeader('main'),
          secondary: readPaneHeader('secondary'),
          tertiary: readPaneHeader('tertiary'),
        },
        rootDisplayTimeframe: root.dataset.displayTimeframe,
        rootTarget: root.dataset.v6DisplayTimeframePaneId,
        topSymbol: document.querySelector('[data-v6-top-symbol]')?.textContent.trim() || '',
        topTimeframe: document.querySelector('[data-v6-display-timeframe-label]')?.textContent.trim() || '',
      };

      return { afterApply, beforeApply };
    })()))()
  `));

  assert.equal(value.beforeApply.activePane.id, 'secondary');
  assert.equal(value.beforeApply.surfaceActivePaneId, 'secondary');
  assert.equal(value.beforeApply.hosts.main.active, 'false');
  assert.equal(value.beforeApply.hosts.secondary.active, 'true');
  assert.equal(value.beforeApply.hosts.tertiary.active, 'false');
  assert.doesNotMatch(value.beforeApply.hosts.main.afterBoxShadow, /90, 171, 255/);
  assert.match(value.beforeApply.hosts.secondary.afterBoxShadow, /90, 171, 255/);
  assert.doesNotMatch(value.beforeApply.hosts.tertiary.afterBoxShadow, /90, 171, 255/);
  assert.equal(value.beforeApply.hosts.main.hidden, false);
  assert.equal(value.beforeApply.hosts.secondary.hidden, false);
  assert.equal(value.beforeApply.hosts.tertiary.hidden, false);
  assert.equal(value.beforeApply.topSymbol, 'ES');
  assert.equal(value.beforeApply.topTimeframe, '5m');
  assert.equal(value.beforeApply.controlTarget, 'secondary');
  assert.equal(value.beforeApply.controlValue, 5);

  assert.equal(value.beforeApply.panes.main.symbol, 'NQ');
  assert.equal(value.beforeApply.panes.main.timeframe, '1m');
  assert.equal(value.beforeApply.panes.main.active, 'false');
  assert.deepEqual(value.beforeApply.panes.main.ohlc, {
    close: 'C 101.00',
    high: 'H 102.00',
    low: 'L 99.00',
    open: 'O 100.00',
  });
  assert.equal(value.beforeApply.panes.secondary.symbol, 'ES');
  assert.equal(value.beforeApply.panes.secondary.timeframe, '5m');
  assert.equal(value.beforeApply.panes.secondary.active, 'true');
  assert.deepEqual(value.beforeApply.panes.secondary.ohlc, {
    close: 'C 207.00',
    high: 'H 211.00',
    low: 'L 206.00',
    open: 'O 210.00',
  });
  assert.equal(value.beforeApply.panes.tertiary.symbol, 'YM');
  assert.equal(value.beforeApply.panes.tertiary.timeframe, '15m');
  assert.equal(value.beforeApply.panes.tertiary.active, 'false');
  assert.deepEqual(value.beforeApply.panes.tertiary.ohlc, {
    close: 'C 300.00',
    high: 'H 305.00',
    low: 'L 295.00',
    open: 'O 300.00',
  });

  assert.equal(value.afterApply.activePane.id, 'secondary');
  assert.equal(value.afterApply.controlTarget, 'secondary');
  assert.equal(value.afterApply.controlValue, 15);
  assert.equal(value.afterApply.rootTarget, 'secondary');
  assert.equal(value.afterApply.rootDisplayTimeframe, '15');
  assert.equal(value.afterApply.topSymbol, 'ES');
  assert.equal(value.afterApply.topTimeframe, '15m');
  assert.equal(value.afterApply.pane.displayTimeframe, 15);
  assert.equal(value.afterApply.panes.secondary.timeframe, '15m');
  assert.deepEqual(value.afterApply.chartData.main.bars, value.beforeApply.chartData.main.bars);
  assert.deepEqual(value.afterApply.chartData.tertiary.bars, value.beforeApply.chartData.tertiary.bars);
  assert.deepEqual(value.afterApply.chartData.secondary.bars.map((bar) => bar.close), [209.5]);
} finally {
  await page.cleanup();
}

console.log('v6 multi-pane active focus chain step 251 smoke passed');
