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
      await root.__v6DisplayTimeframePaneTargetBridge.ready;
      await root.__v6LayoutSurfaceBridge.ready;

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'twice', variant: 'twice-vertical' });
      const mainBars = Array.from({ length: 10 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const secondaryBars = mainBars.map((bar) => ({
        ...bar,
        close: bar.close + 100,
        high: bar.high + 100,
        low: bar.low + 100,
        open: bar.open + 100,
      }));

      await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: mainBars,
        cursorTimestamp: mainBars.at(-1).timestamp,
        paneId: 'main',
      });
      await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: secondaryBars,
        cursorTimestamp: secondaryBars.at(-1).timestamp,
        paneId: 'secondary',
      });
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 5,
        paneId: 'secondary',
      });

      const beforeMain = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const beforeSecondary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
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

      const afterSwitchMain = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const afterSwitchSecondary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
      const toggleAfterSwitch = document.querySelector('[data-v6-display-timeframe-toggle]')?.textContent.trim();

      document.querySelector('[data-v6-display-timeframe-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-display-timeframe-option="15"]').click();

      let afterApplySecondary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
      let afterApplyPane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'secondary');
      while ((afterApplyPane.displayTimeframe !== 15 || afterApplySecondary.bars.length !== 1) && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        afterApplySecondary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
        afterApplyPane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'secondary');
      }
      const afterApplyMain = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });

      return {
        activePane,
        afterApplyMain,
        afterApplyPane,
        afterApplySecondary,
        afterSwitchMain,
        afterSwitchSecondary,
        beforeMain,
        beforeSecondary,
        controlTarget: root.__v6DisplayTimeframeControl.getTargetPaneId(),
        controlValue: root.__v6DisplayTimeframeControl.getValue(),
        rootDisplayTimeframe: root.dataset.displayTimeframe,
        rootTarget: root.dataset.v6DisplayTimeframePaneId,
        toggleAfterSwitch,
      };
    })()))()
  `));

  assert.equal(value.activePane.id, 'secondary');
  assert.equal(value.controlTarget, 'secondary');
  assert.equal(value.controlValue, 15);
  assert.equal(value.toggleAfterSwitch, '5m');
  assert.equal(value.rootTarget, 'secondary');
  assert.equal(value.rootDisplayTimeframe, '15');
  assert.deepEqual(value.afterSwitchMain.bars, value.beforeMain.bars);
  assert.deepEqual(value.afterSwitchSecondary.bars, value.beforeSecondary.bars);
  assert.deepEqual(value.afterApplyMain.bars, value.beforeMain.bars);
  assert.equal(value.afterApplyPane.displayTimeframe, 15);
  assert.deepEqual(value.afterApplySecondary.bars.map((bar) => bar.close), [209.5]);
} finally {
  await page.cleanup();
}

console.log('v6 display timeframe active pane UI state browser step 208 smoke passed');
