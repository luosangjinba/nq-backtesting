import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 900, width: 1440 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const navigationControlModule = await import('/v6/src/shell/replay-navigation-control.js');
      const waitUntil = async (predicate, timeoutMs = 8000) => {
        const deadline = performance.now() + timeoutMs;
        let value = await predicate();
        while (!value && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          value = await predicate();
        }
        return value;
      };
      await commands.dispatchCommand('replayNavigationPreferences.reset');
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Go-to Step 406';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-05-01T10:00';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-05-04T12:00';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const ready = await waitUntil(async () => {
        const replay = await commands.dispatchCommand('replay.getState');
        return replay?.status === 'ready' ? replay : null;
      });

      const gotoDetails = document.querySelector('[data-v6-rail-goto-details]');
      const gotoSummary = document.querySelector('[data-v6-rail-goto]');
      const settingsOpen = document.querySelector('[data-v6-replay-navigation-settings-open]');
      const dialog = document.querySelector('[data-v6-replay-navigation-settings-dialog]');
      const save = document.querySelector('[data-v6-replay-navigation-settings-save]');
      const reset = document.querySelector('[data-v6-replay-navigation-settings-reset]');
      const closeButtons = [...document.querySelectorAll('[data-v6-replay-navigation-settings-close]')];
      const fields = Object.fromEntries([...document.querySelectorAll('[data-v6-replay-navigation-setting]')]
        .map((field) => [field.dataset.v6ReplayNavigationSetting, field]));
      const chart = document.querySelector('[data-v6-chart-surface]');

      gotoSummary.click();
      settingsOpen.click();
      await waitUntil(() => !dialog.hidden);
      const initialSettings = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
      const dialogRect = dialog.querySelector('form').getBoundingClientRect();
      const beforeModalShortcut = await commands.dispatchCommand('replay.getState');
      fields.newYorkSession.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Y' }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterModalShortcut = await commands.dispatchCommand('replay.getState');

      fields.newYorkSession.value = '08:45';
      fields.newYorkSession.dispatchEvent(new Event('input', { bubbles: true }));
      save.click();
      const savedCustom = await waitUntil(async () => {
        const snapshot = await commands.dispatchCommand('replayNavigationPreferences.getSnapshot');
        return snapshot.newYorkSession === '08:45' ? snapshot : null;
      });

      gotoSummary.click();
      settingsOpen.click();
      await waitUntil(() => !dialog.hidden);
      fields.dayOpen.value = '25:00';
      fields.dayOpen.dispatchEvent(new Event('input', { bubbles: true }));
      const invalid = {
        ariaInvalid: fields.dayOpen.getAttribute('aria-invalid'),
        saveDisabled: save.disabled,
      };
      reset.click();
      const resetDraft = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
      const persistedBeforeDiscard = await commands.dispatchCommand('replayNavigationPreferences.getSnapshot');
      closeButtons.at(-1).click();
      const persistedAfterDiscard = await commands.dispatchCommand('replayNavigationPreferences.getSnapshot');

      gotoSummary.click();
      settingsOpen.click();
      await waitUntil(() => !dialog.hidden);
      save.focus();
      save.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' }));
      const focusWrappedToClose = document.activeElement === closeButtons[0];
      dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }));
      const escapeClosed = dialog.hidden;
      const focusRestored = document.activeElement === gotoSummary;

      chart.focus?.();
      const shortcutProbe = navigationControlModule.resolveReplayNavigationShortcut({
        key: 'N',
        target: chart,
      }, { root: document.querySelector('[data-v6-root]') });
      const shortcutDiagnostics = {
        dialogs: [...document.querySelectorAll('[role="dialog"]')].map((element) => ({
          closestHidden: Boolean(element.closest('[hidden]')),
          hidden: element.hidden,
          label: element.getAttribute('aria-label') || element.getAttribute('aria-labelledby'),
          rectCount: element.getClientRects().length,
        })),
        workstationHidden: document.querySelector('[data-v6-workstation-main]').hidden,
      };
      chart.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'N' }));
      const navigationState = await waitUntil(async () => {
        const state = await commands.dispatchCommand('replayNavigation.getState');
        return state?.status === 'completed' ? state : null;
      }, 12000);
      const navigated = await commands.dispatchCommand('replay.getState');
      const layoutVisiblePaneIds = document.querySelector('[data-v6-root]')
        .__v6WorkstationChartSurface.getState().layout.visiblePaneIds;
      const chartRecord = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const latestChartBar = chartRecord.bars.at(-1);
      const status = document.querySelector('[data-v6-replay-navigation-status]');
      gotoSummary.click();
      settingsOpen.click();
      await waitUntil(() => !dialog.hidden);
      const screenshot = await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve({
        dialogOpen: !dialog.hidden,
        height: document.documentElement.scrollHeight,
        newYorkSession: fields.newYorkSession.value,
        statusText: status.textContent,
        statusTone: status.dataset.v6ReplayNavigationTone,
        width: document.documentElement.scrollWidth,
      }))));

      return {
        afterModalShortcut,
        beforeModalShortcut,
        dialogFitsViewport: dialogRect.left >= 0 && dialogRect.right <= innerWidth && dialogRect.top >= 0 && dialogRect.bottom <= innerHeight,
        escapeClosed,
        focusRestored,
        focusWrappedToClose,
        initialSettings,
        invalid,
        latestChartBar,
        layoutVisiblePaneIds,
        navigated,
        navigationState,
        persistedAfterDiscard,
        persistedBeforeDiscard,
        ready,
        resetDraft,
        savedCustom,
        screenshot,
        shortcutDiagnostics,
        shortcutProbe,
      };
    })()))()
  `));
  const capturedScreenshot = await page.client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });

  assert.equal(value.ready.status, 'ready');
  assert.deepEqual(value.initialSettings, {
    asianSession: '19:00',
    dayOpen: '18:00',
    londonSession: '02:00',
    newYorkSession: '09:30',
  });
  assert.equal(value.dialogFitsViewport, true);
  assert.equal(value.beforeModalShortcut.cursorTime, value.afterModalShortcut.cursorTime);
  assert.equal(value.savedCustom.newYorkSession, '08:45');
  assert.deepEqual(value.invalid, { ariaInvalid: 'true', saveDisabled: true });
  assert.deepEqual(value.resetDraft, {
    asianSession: '19:00',
    dayOpen: '18:00',
    londonSession: '02:00',
    newYorkSession: '09:30',
  });
  assert.equal(value.persistedBeforeDiscard.newYorkSession, '08:45');
  assert.equal(value.persistedAfterDiscard.newYorkSession, '08:45');
  assert.equal(value.focusWrappedToClose, true);
  assert.equal(value.escapeClosed, true);
  assert.equal(value.focusRestored, true);
  assert.equal(value.shortcutProbe, 'new-york-session');
  assert.ok(value.navigated, JSON.stringify({
    navigationState: value.navigationState,
    persistedAfterDiscard: value.persistedAfterDiscard,
    screenshot: value.screenshot,
    shortcutDiagnostics: value.shortcutDiagnostics,
    shortcutProbe: value.shortcutProbe,
  }));
  assert.equal(value.navigated.cursorTime, '2026-05-04T08:45:00.000Z');
  assert.equal(value.navigationState.status, 'completed');
  assert.deepEqual(value.navigationState.lastResult.paneIds, value.layoutVisiblePaneIds);
  assert.equal(value.latestChartBar.time, '2026-05-04T08:45:00.000Z');
  assert.equal(value.screenshot.statusText, 'New York Session reached.');
  assert.equal(value.screenshot.statusTone, 'success');
  assert.equal(value.screenshot.dialogOpen, true);
  assert.equal(value.screenshot.newYorkSession, '08:45');
  assert.equal(value.screenshot.width <= 1440, true);
  assert.equal(value.screenshot.height <= 900, true);
  assert.equal(Buffer.from(capturedScreenshot.data, 'base64').byteLength > 50_000, true);
} finally {
  await page.cleanup();
}

console.log('V6 replay navigation UI Step 406 browser smoke passed.');
