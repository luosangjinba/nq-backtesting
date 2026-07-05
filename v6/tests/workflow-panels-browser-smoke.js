import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 780, width: 1240 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      const panels = [
        ['Sessions', '[data-v6-sessions-toggle]', '[data-v6-sessions-panel]'],
        ['Replay', '[data-v6-replay-workflow-toggle]', '[data-v6-replay-workflow-panel]'],
        ['Journal', '[data-v6-journal-toggle]', '[data-v6-journal-panel]'],
        ['Settings', '[data-v6-settings-toggle]', '[data-v6-settings-panel]'],
      ];
      const bodyText = document.body.textContent || '';
      const results = [];

      for (const [name, toggleSelector, panelSelector] of panels) {
        const toggle = document.querySelector(toggleSelector);
        const panel = document.querySelector(panelSelector);
        toggle.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const panelRect = panel.getBoundingClientRect();
        const mainRect = document.querySelector('[data-v6-workstation-main]').getBoundingClientRect();
        results.push({
          name,
          active: toggle.classList.contains('is-active'),
          activeData: toggle.dataset.v6WorkflowActive || '',
          controls: toggle.getAttribute('aria-controls') || '',
          open: !panel.hidden,
          expanded: toggle.getAttribute('aria-expanded'),
          pressed: toggle.getAttribute('aria-pressed'),
          panelHeight: Math.round(panelRect.height),
          mainHeight: Math.round(mainRect.height),
          panelId: panel.id,
          title: panel.querySelector('.panel-copy strong')?.textContent || '',
        });
        toggle.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      return {
        bodyText,
        mounted: Boolean(root.__v6SessionsSurface?.getState)
          && Boolean(root.__v6ReplayWorkflowSurface?.getState)
          && Boolean(root.__v6JournalSurface?.getState)
          && Boolean(root.__v6SettingsPanel?.getState),
        results,
      };
    })()))()
  `));

  assert.equal(value.mounted, true);
  assert.deepEqual(value.results.map((result) => result.title), [
    'Replay Sessions',
    'Replay Control',
    'Trade Journal',
    'Workspace Settings',
  ]);
  value.results.forEach((result) => {
    assert.equal(result.open, true, `${result.name} panel should open`);
    assert.equal(result.active, true, `${result.name} toggle should show an active state`);
    assert.equal(result.activeData, 'true', `${result.name} toggle should expose active data`);
    assert.equal(result.expanded, 'true', `${result.name} toggle should update aria-expanded`);
    assert.equal(result.pressed, 'true', `${result.name} toggle should update aria-pressed`);
    assert.equal(result.controls, result.panelId, `${result.name} toggle should point at its panel`);
    assert.ok(result.panelHeight <= 96, `${result.name} panel should stay compact: ${result.panelHeight}px`);
    assert.ok(result.mainHeight >= 460, `${result.name} panel should not crowd the chart: ${result.mainHeight}px`);
  });
  assert.equal(value.bodyText.includes('Add sample'), false);
  assert.equal(value.bodyText.includes('Snapshot none'), false);
  assert.equal(value.bodyText.includes('Replay not loaded'), false);
  assert.equal(value.bodyText.includes('Wall not loaded'), false);
} finally {
  await page.cleanup();
}

console.log('v6 workflow panels browser smoke passed');
