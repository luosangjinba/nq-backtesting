import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    JSON.stringify((() => {
      const textOf = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
      const disabled = (selector) => document.querySelector(selector)?.disabled === true;
      const exists = (selector) => Boolean(document.querySelector(selector));
      const headerRect = document.querySelector('[data-v6-workstation-header]').getBoundingClientRect();
      return {
        account: textOf('[data-v6-top-account]'),
        accountDisabled: disabled('[data-v6-top-account]'),
        backDisabled: disabled('[data-v6-top-back]'),
        editor: textOf('[data-v6-top-editor]'),
        editorDisabled: disabled('[data-v6-top-editor]'),
        fullscreenDisabled: disabled('[data-v6-top-fullscreen]'),
        hasHeader: exists('[data-v6-workstation-header]'),
        headerHeight: Math.round(headerRect.height),
        indicators: textOf('[data-v6-top-indicators]'),
        indicatorsDisabled: disabled('[data-v6-top-indicators]'),
        instrument: textOf('[data-v6-top-instrument]'),
        instrumentDisabled: disabled('[data-v6-top-instrument]'),
        interval: textOf('[data-v6-top-interval]'),
        intervalDisabled: disabled('[data-v6-top-interval]'),
        layout: textOf('[data-v6-top-layout]'),
        layoutDisabled: disabled('[data-v6-top-layout]'),
        profile: textOf('[data-v6-top-profile]'),
        readinessInHeader: exists('[data-v6-workstation-header] [data-v6-readiness-surface]'),
        redoDisabled: disabled('[data-v6-top-redo]'),
        searchDisabled: disabled('[data-v6-top-search]'),
        sessionsWorkflowStillPresent: exists('[data-v6-sessions-toggle]'),
        symbol: textOf('[data-v6-top-symbol]'),
        themeDisabled: disabled('[data-v6-top-theme]'),
        undoDisabled: disabled('[data-v6-top-undo]'),
      };
    })())
  `));

  assert.equal(value.hasHeader, true);
  assert.equal(value.headerHeight <= 56, true);
  assert.equal(value.symbol, 'NQ');
  assert.equal(value.interval, '1m');
  assert.equal(value.layout, 'Layout');
  assert.equal(value.indicators, 'Indicators');
  assert.equal(value.profile, 'test');
  assert.equal(value.account, 'ETH');
  assert.equal(value.instrument, 'NQ-2018');
  assert.equal(value.editor, 'Editor');
  assert.equal(value.sessionsWorkflowStillPresent, true);
  assert.equal(value.readinessInHeader, true);

  [
    value.accountDisabled,
    value.backDisabled,
    value.editorDisabled,
    value.fullscreenDisabled,
    value.indicatorsDisabled,
    value.instrumentDisabled,
    value.intervalDisabled,
    value.layoutDisabled,
    value.redoDisabled,
    value.searchDisabled,
    value.themeDisabled,
    value.undoDisabled,
  ].forEach((isDisabled) => {
    assert.equal(isDisabled, true);
  });
} finally {
  await page.cleanup();
}

console.log('v6 top toolbar parity browser smoke passed');
