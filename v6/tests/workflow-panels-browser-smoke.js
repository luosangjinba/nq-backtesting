import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 780, width: 1240 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      const panels = [
        ['Replay', '[data-v6-replay-workflow-toggle]', '[data-v6-replay-workflow-panel]', '[data-v6-replay-workflow-close]'],
        ['Journal', '[data-v6-journal-toggle]', '[data-v6-journal-panel]', '[data-v6-journal-close]'],
        ['Settings', '[data-v6-settings-toggle]', '[data-v6-settings-panel]', '[data-v6-settings-close]'],
      ];
      const bodyText = document.body.textContent || '';
      const results = [];

      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-05T16:00';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-dashboard-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-dashboard-open-session]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const baselineMainHeight = Math.round(
        document.querySelector('[data-v6-workstation-main]').getBoundingClientRect().height,
      );

      function closedState(toggle, panel) {
        return {
          active: toggle.classList.contains('is-active'),
          activeData: toggle.dataset.v6WorkflowActive || '',
          expanded: toggle.getAttribute('aria-expanded'),
          open: !panel.hidden,
          pressed: toggle.getAttribute('aria-pressed'),
        };
      }

      for (const [name, toggleSelector, panelSelector, closeSelector] of panels) {
        const toggle = document.querySelector(toggleSelector);
        const panel = document.querySelector(panelSelector);
        const closeButton = document.querySelector(closeSelector);
        toggle.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const panelRect = panel.getBoundingClientRect();
        const mainRect = document.querySelector('[data-v6-workstation-main]').getBoundingClientRect();
        const openedState = closedState(toggle, panel);
        toggle.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const closedByRepeatClick = closedState(toggle, panel);
        toggle.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        closeButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const closedByButton = closedState(toggle, panel);
        toggle.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        closeButton.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
        await new Promise((resolve) => setTimeout(resolve, 0));
        const closedByEscape = closedState(toggle, panel);
        results.push({
          name,
          active: openedState.active,
          activeData: openedState.activeData,
          controls: toggle.getAttribute('aria-controls') || '',
          closedByButton,
          closedByEscape,
          closedByRepeatClick,
          closeLabel: closeButton.getAttribute('aria-label') || '',
          open: openedState.open,
          expanded: openedState.expanded,
          pressed: openedState.pressed,
          panelHeight: Math.round(panelRect.height),
          mainHeight: Math.round(mainRect.height),
          baselineMainHeight,
          panelId: panel.id,
          title: panel.querySelector('.panel-copy strong, .settings-modal-header strong')?.textContent || '',
        });
      }

      const exclusivity = [];
      for (const [name, toggleSelector] of panels) {
        document.querySelector(toggleSelector).click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        exclusivity.push({
          name,
          openNames: panels
            .filter(([, , panelSelector]) => !document.querySelector(panelSelector).hidden)
            .map(([panelName]) => panelName),
          activeNames: panels
            .filter(([, toggleSelector]) => document.querySelector(toggleSelector).classList.contains('is-active'))
            .map(([panelName]) => panelName),
        });
      }

      return {
        bodyText,
        exclusivity,
        mounted: Boolean(root.__v6SessionsSurface?.getState)
          && Boolean(root.__v6SessionDashboard?.getState)
          && Boolean(root.__v6ReplayWorkflowSurface?.getState)
          && Boolean(root.__v6JournalSurface?.getState)
          && Boolean(root.__v6SettingsPanel?.getState),
        results,
        surface: root.dataset.v6Surface || '',
      };
    })()))()
  `));

  assert.equal(value.mounted, true);
  assert.equal(value.surface, 'workstation');
  assert.deepEqual(value.results.map((result) => result.title), [
    'Replay Control',
    'Trade Journal',
    'Settings',
  ]);
  value.results.forEach((result) => {
    assert.equal(result.open, true, `${result.name} panel should open`);
    assert.equal(result.active, true, `${result.name} toggle should show an active state`);
    assert.equal(result.activeData, 'true', `${result.name} toggle should expose active data`);
    assert.equal(result.expanded, 'true', `${result.name} toggle should update aria-expanded`);
    assert.equal(result.pressed, 'true', `${result.name} toggle should update aria-pressed`);
    assert.equal(result.controls, result.panelId, `${result.name} toggle should point at its panel`);
    assert.match(result.closeLabel, /^Close /, `${result.name} close button should be labelled`);
    [result.closedByRepeatClick, result.closedByButton, result.closedByEscape].forEach((closedState) => {
      assert.equal(closedState.open, false, `${result.name} panel should close`);
      assert.equal(closedState.active, false, `${result.name} toggle active class should clear`);
      assert.equal(closedState.activeData, 'false', `${result.name} active data should clear`);
      assert.equal(closedState.expanded, 'false', `${result.name} aria-expanded should clear`);
      assert.equal(closedState.pressed, 'false', `${result.name} aria-pressed should clear`);
    });
    if (result.name === 'Settings') {
      assert.ok(result.panelHeight >= 520, `${result.name} should use a modal shape: ${result.panelHeight}px`);
    } else {
      assert.ok(result.panelHeight <= 96, `${result.name} panel should stay compact: ${result.panelHeight}px`);
    }
    assert.ok(result.mainHeight >= 400, `${result.name} should preserve a usable chart: ${result.mainHeight}px`);
    const allowedMainHeightChange = result.name === 'Settings' ? 1 : 24;
    assert.ok(
      Math.abs(result.mainHeight - result.baselineMainHeight) <= allowedMainHeightChange,
      `${result.name} panel should not crowd the chart: ${result.baselineMainHeight}px -> ${result.mainHeight}px`,
    );
  });
  value.exclusivity.forEach((result) => {
    assert.deepEqual(result.openNames, [result.name], `${result.name} should be the only open panel`);
    assert.deepEqual(result.activeNames, [result.name], `${result.name} should be the only active action`);
  });
  assert.equal(value.bodyText.includes('Add sample'), false);
  assert.equal(value.bodyText.includes('Snapshot none'), false);
  assert.equal(value.bodyText.includes('Replay not loaded'), false);
  assert.equal(value.bodyText.includes('Wall not loaded'), false);
} finally {
  await page.cleanup();
}

console.log('v6 workflow panels browser smoke passed');
