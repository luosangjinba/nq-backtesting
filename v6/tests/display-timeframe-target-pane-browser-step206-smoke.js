import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const bars = Array.from({ length: 10 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const secondaryBars = bars.map((bar) => ({
        ...bar,
        close: bar.close + 100,
        high: bar.high + 100,
        low: bar.low + 100,
        open: bar.open + 100,
      }));

      await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars,
        cursorTimestamp: bars.at(-1).timestamp,
        paneId: 'main',
      });
      await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: secondaryBars,
        cursorTimestamp: secondaryBars.at(-1).timestamp,
        paneId: 'secondary',
      });

      root.__v6DisplayTimeframeControl.setTargetPaneId('secondary');
      const beforeMain = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const beforeSecondary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
      const beforeMainPane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'main');
      const beforeSecondaryPane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'secondary');

      document.querySelector('[data-v6-display-timeframe-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-display-timeframe-option="5"]').click();

      const deadline = performance.now() + 5000;
      let afterSecondary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
      let afterSecondaryPane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'secondary');
      while (
        (afterSecondary.bars.length !== 2 || afterSecondaryPane.displayTimeframe !== 5) &&
        performance.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        afterSecondary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
        afterSecondaryPane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'secondary');
      }

      const afterMain = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const afterMainPane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'main');
      return {
        afterMain,
        afterMainPane,
        afterSecondary,
        afterSecondaryPane,
        beforeMain,
        beforeMainPane,
        beforeSecondary,
        beforeSecondaryPane,
        controlTarget: root.__v6DisplayTimeframeControl.getTargetPaneId(),
        menuOpen: document.querySelector('[data-v6-display-timeframe-toggle]')?.getAttribute('aria-expanded'),
        rootTarget: root.dataset.v6DisplayTimeframePaneId,
        toggleText: document.querySelector('[data-v6-display-timeframe-toggle]')?.textContent.trim(),
      };
    })()))()
  `));

  assert.equal(value.controlTarget, 'secondary');
  assert.equal(value.rootTarget, 'secondary');
  assert.equal(value.menuOpen, 'false');
  assert.equal(value.toggleText, '5m');
  assert.equal(value.beforeMainPane.displayTimeframe, 1);
  assert.equal(value.beforeSecondaryPane.displayTimeframe, 1);
  assert.equal(value.afterMainPane.displayTimeframe, 1);
  assert.equal(value.afterSecondaryPane.displayTimeframe, 5);
  assert.deepEqual(
    value.afterMain.bars.map((bar) => bar.close),
    value.beforeMain.bars.map((bar) => bar.close),
  );
  assert.deepEqual(value.afterSecondary.bars.map((bar) => bar.timestamp), [1780306200, 1780306500]);
  assert.deepEqual(value.afterSecondary.bars.map((bar) => bar.close), [204.5, 209.5]);
} finally {
  await page.cleanup();
}

console.log('v6 display timeframe target pane browser step 206 smoke passed');
