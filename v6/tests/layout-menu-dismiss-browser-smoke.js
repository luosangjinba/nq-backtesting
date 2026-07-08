import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      await window.document.querySelector('[data-v6-root]').__v6LayoutMenuControl?.getState?.();
      const details = document.querySelector('[data-v6-layout-menu-details]');
      const toggle = document.querySelector('[data-v6-top-page-layout]');
      const chartSurface = document.querySelector('[data-v6-chart-surface]');
      toggle.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const opened = details.open;
      details.querySelector('[data-v6-layout-mode="twice"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const stillOpenAfterInsidePointer = details.open;
      chartSurface.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const closedAfterOutsidePointer = !details.open;
      toggle.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const reopened = details.open;
      details.querySelector('[data-v6-layout-mode="twice"][data-v6-layout-variant="twice-horizontal"]').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const closedAfterLayoutChoice = !details.open;
      toggle.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      chartSurface.focus?.();
      chartSurface.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const closedAfterOutsideFocus = !details.open;
      return { closedAfterLayoutChoice, closedAfterOutsideFocus, closedAfterOutsidePointer, opened, reopened, stillOpenAfterInsidePointer };
    })()))()
  `));

  assert.equal(value.opened, true);
  assert.equal(value.stillOpenAfterInsidePointer, true);
  assert.equal(value.closedAfterOutsidePointer, true);
  assert.equal(value.reopened, true);
  assert.equal(value.closedAfterLayoutChoice, true);
  assert.equal(value.closedAfterOutsideFocus, true);
} finally {
  await page.cleanup();
}

console.log('v6 layout menu dismiss browser smoke passed');
