import assert from 'node:assert/strict';
import { evaluate, waitForExpression } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.persistence.records';

const page = await openV6Page({ height: 820, width: 1280 });
try {
  await evaluate(page.client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(
    page.client,
    `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`,
    8_000,
  );

  const result = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const surface = document.querySelector('[data-v6-chart-surface]');
      await Promise.all([
        root.__v6SettingsChartSurfaceBridge.ready,
        root.__v6SettingsChartViewportBridge.ready,
      ]);
      let viewportBefore = await commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT
      );
      if (!viewportBefore.panes.length) {
        await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
          cursorTimestamp: 1780306200,
          paneId: 'main',
        });
        await commands.dispatchCommand(
          contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION,
          { chartBarsRevision: 1, latestLogicalIndex: 100, paneId: 'main' }
        );
        viewportBefore = await commands.dispatchCommand(
          contracts.CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT
        );
      }
      const pane = viewportBefore.panes.find((entry) => entry.projection) || viewportBefore.panes[0];
      if (!pane) throw new Error('Expected a bootstrapped chart viewport pane.');
      const paneId = pane.paneId;
      const settingsBefore = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);
      const surfaceBefore = JSON.parse(surface.dataset.v6CanvasSettings);

      const edit = async (values) => {
        document.querySelector('[data-v6-settings-toggle]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        Object.entries(values).forEach(([key, value]) => {
          const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
          field.value = String(value);
          field.dispatchEvent(new Event('change', { bubbles: true }));
        });
      };

      await edit({
        chartBottomMarginPercent: 12,
        chartNavigationVisibility: 'hidden',
        chartRightMarginBars: 20,
        chartTopMarginPercent: 15,
      });
      const draftSurface = JSON.parse(surface.dataset.v6CanvasSettings);
      const draftViewport = await commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.GET_PANE,
        { paneId }
      );
      document.querySelector('[data-v6-settings-ok]').click();
      await new Promise((resolve) => setTimeout(resolve, 40));
      const committedSurface = JSON.parse(surface.dataset.v6CanvasSettings);
      const committedViewport = await commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.GET_PANE,
        { paneId }
      );

      const manual = await commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT,
        { latestOffsetBars: 3, paneId, spanBars: 48 }
      );
      await edit({ chartRightMarginBars: 24 });
      document.querySelector('[data-v6-settings-ok]').click();
      await new Promise((resolve) => setTimeout(resolve, 40));
      const afterManualSetting = await commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.GET_PANE,
        { paneId }
      );
      const reset = await commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.RESET_VIEW,
        {
          chartBarsRevision: committedViewport.chartBarsRevision,
          latestLogicalIndex: committedViewport.projection?.latestLogicalIndex ?? 0,
          paneId,
        }
      );

      return {
        afterManualSetting,
        committedSettings: await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT),
        committedSurface,
        committedViewport,
        draftSurface,
        draftViewport,
        manual,
        paneId,
        reset,
        settingsBefore,
        surfaceBefore,
      };
    })()))()
  `));

  assert.deepEqual(result.draftSurface, result.surfaceBefore);
  assert.equal(
    result.draftViewport.defaultLatestOffsetBars,
    result.settingsBefore.chartRightMarginBars,
  );
  assert.equal(result.committedSurface.chartNavigationVisibility, 'hidden');
  assert.equal(result.committedSurface.chartTopMarginPercent, 15);
  assert.equal(result.committedSurface.chartBottomMarginPercent, 12);
  assert.equal(result.committedViewport.defaultLatestOffsetBars, 20);
  assert.equal(result.committedViewport.intent.latestOffsetBars, 20);
  assert.equal(result.committedViewport.projection.latestOffsetBars, 20);
  assert.equal(result.manual.intent.origin, 'manual');
  assert.equal(result.afterManualSetting.defaultLatestOffsetBars, 24);
  assert.deepEqual(result.afterManualSetting.intent, result.manual.intent);
  assert.equal(result.reset.intent.origin, 'default');
  assert.equal(result.reset.intent.latestOffsetBars, 24);
  assert.equal(result.reset.projection.latestOffsetBars, 24);
  assert.equal(result.committedSettings.chartRightMarginBars, 24);

  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(
    page.client,
    `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`,
    8_000,
  );
  const restored = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      await Promise.all([
        root.__v6SettingsChartSurfaceBridge.ready,
        root.__v6SettingsChartViewportBridge.ready,
      ]);
      return {
        settings: await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT),
        surface: JSON.parse(document.querySelector('[data-v6-chart-surface]').dataset.v6CanvasSettings),
        viewport: await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT),
      };
    })()))()
  `));
  assert.equal(restored.settings.chartRightMarginBars, 24);
  assert.equal(restored.surface.chartNavigationVisibility, 'hidden');
  assert.equal(restored.surface.chartTopMarginPercent, 15);
  assert.equal(restored.surface.chartBottomMarginPercent, 12);
  restored.viewport.panes.forEach((pane) => {
    assert.equal(pane.defaultLatestOffsetBars, 24);
    if (pane.intent.origin === 'default') assert.equal(pane.intent.latestOffsetBars, 24);
  });
} finally {
  await page.cleanup();
}

console.log('V6 Settings Canvas View browser Step 411 smoke passed.');
