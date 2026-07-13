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
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Loaded date locator';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-05-01T00:00';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-05-01T04:00';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const workstationDeadline = performance.now() + 5000;
      while (root.dataset.v6Surface !== 'workstation' && performance.now() < workstationDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      let projectionApply = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      while (projectionApply.status === 'idle' && performance.now() < workstationDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        projectionApply = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await root.__v6LayoutSurfaceBridge.ready;
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, {
        mode: 'twice',
        variant: 'twice-vertical',
      });

      const startTimestamp = Date.parse('2026-05-01T00:00:00.000Z') / 1000;
      const bars = Array.from({ length: 200 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: startTimestamp + (index * 60),
      }));
      for (const paneId of ['main', 'secondary']) {
        await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
          cursorTimestamp: bars.at(-1).timestamp,
          latestOffsetBars: 8,
          paneId,
          spanBars: 120,
        });
        await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
          bars,
          cursorTimestamp: bars.at(-1).timestamp,
          paneId,
        });
      }
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_ACTIVE, 'secondary');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const originalFetch = window.fetch;
      let fetchCalls = 0;
      window.fetch = (...args) => {
        fetchCalls += 1;
        return originalFetch(...args);
      };

      const before = {
        barCache: await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY),
        mainViewport: await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' }),
        replay: await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE),
        source: await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'secondary' }),
      };

      const details = document.querySelector('[data-v6-rail-goto-details]');
      document.querySelector('[data-v6-rail-goto]').click();
      const input = document.querySelector('[data-v6-loaded-window-date-locator-input]');
      input.value = '2026-05-01T00:20';
      document.querySelector('[data-v6-loaded-window-date-locator-form]')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      const deadline = performance.now() + 3000;
      while (root.dataset.loadedWindowDateLocatorStatus !== 'located' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const success = {
        control: root.__v6LoadedWindowDateLocatorControl.getState(),
        locator: await commands.dispatchCommand(contracts.LOADED_WINDOW_DATE_LOCATOR_COMMANDS.GET_STATE),
        mainViewport: await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' }),
        secondaryViewport: await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'secondary' }),
        surface: root.__v6WorkstationChartSurface.getState(),
      };

      input.value = '2025-01-01T00:00';
      document.querySelector('[data-v6-loaded-window-date-locator-form]')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      while (root.dataset.loadedWindowDateLocatorStatus !== 'rejected' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const rejected = {
        control: root.__v6LoadedWindowDateLocatorControl.getState(),
        secondaryViewport: await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'secondary' }),
      };
      const after = {
        barCache: await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY),
        replay: await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE),
        source: await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'secondary' }),
      };
      window.fetch = originalFetch;

      return {
        after,
        before,
        detailsOpen: details.open,
        fetchCalls,
        inputMetrics: {
          display: getComputedStyle(input).display,
          height: input.getBoundingClientRect().height,
          width: input.getBoundingClientRect().width,
          formDisplay: getComputedStyle(input.form).display,
          formWidth: input.form.getBoundingClientRect().width,
          popoverDisplay: getComputedStyle(input.closest('.rail-popover')).display,
          popoverWidth: input.closest('.rail-popover').getBoundingClientRect().width,
          railDisplay: getComputedStyle(input.closest('.right-utility-rail')).display,
          railWidth: input.closest('.right-utility-rail').getBoundingClientRect().width,
        },
        rejected,
        statusText: document.querySelector('[data-v6-loaded-window-date-locator-status]').textContent,
        success,
      };
    })()))()
  `));

  assert.equal(value.detailsOpen, true);
  assert.notEqual(value.inputMetrics.display, 'none');
  assert.equal(value.inputMetrics.width > 0, true, JSON.stringify(value.inputMetrics));
  assert.equal(value.inputMetrics.height > 0, true, JSON.stringify(value.inputMetrics));
  assert.equal(value.fetchCalls, 0);
  assert.equal(value.success.control.status, 'located');
  assert.equal(value.success.locator.paneId, 'secondary');
  assert.equal(value.success.locator.resolvedIndex, 20);
  assert.equal(value.success.locator.resolvedTimestamp, 1777594800);
  assert.equal(value.success.secondaryViewport.intent.origin, 'manual');
  assert.deepEqual(value.success.secondaryViewport.projection, {
    from: -40,
    latestLogicalIndex: 199,
    latestOffsetBars: -119,
    origin: 'manual',
    revision: 1,
    spanBars: 120,
    to: 80,
  });
  assert.deepEqual(value.success.mainViewport, value.before.mainViewport);
  assert.deepEqual(
    value.success.surface.panes.find((pane) => pane.paneId === 'secondary').snapshot.visibleLogicalRange,
    { from: -40, to: 80 },
  );
  assert.equal(value.rejected.control.status, 'rejected');
  assert.equal(value.rejected.control.reason, 'outside-loaded-window');
  assert.match(value.statusText, /Outside loaded window/);
  assert.deepEqual(value.rejected.secondaryViewport, value.success.secondaryViewport);
  assert.deepEqual(value.after.barCache, value.before.barCache);
  assert.deepEqual(value.after.replay, value.before.replay);
  assert.deepEqual(value.after.source, value.before.source);
} finally {
  await page.cleanup();
}

console.log('v6 loaded-window date locator browser step402 smoke passed');
