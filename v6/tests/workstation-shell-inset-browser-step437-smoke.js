import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const viewports = [
  { height: 720, width: 1024 },
  { height: 900, width: 1440 },
  { height: 1080, width: 1920 },
];

const page = await openV6Page(viewports.at(-1));
try {
  for (const viewport of viewports) {
    await page.client.send('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1,
      height: viewport.height,
      mobile: false,
      width: viewport.width,
    });
    const value = JSON.parse(await evaluate(page.client, `
      (async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const shell = document.querySelector('[data-v6-workstation-shell]');
        const dashboard = document.querySelector('[data-v6-session-dashboard]');
        const style = getComputedStyle(shell);
        const dashboardBounds = dashboard.getBoundingClientRect();
        return JSON.stringify({
          dashboardHeight: dashboardBounds.height,
          dashboardLeft: dashboardBounds.left,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          paddingTop: style.paddingTop,
          viewportHeight: innerHeight,
        });
      })()
    `));
    const label = `${viewport.width}x${viewport.height}`;
    assert.deepEqual([
      value.paddingTop,
      value.paddingRight,
      value.paddingBottom,
      value.paddingLeft,
    ], ['4px', '4px', '4px', '4px'], `${label} shell inset`);
    assert.equal(value.dashboardLeft, 4, `${label} dashboard left inset`);
    assert.equal(value.dashboardHeight, value.viewportHeight - 8, `${label} dashboard height`);
  }
} finally {
  await page.cleanup();
}

console.log('v6 workstation shell inset browser Step 437 smoke passed');
