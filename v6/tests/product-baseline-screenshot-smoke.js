import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const SCREENSHOT_PATH = process.env.V6_SCREENSHOT_PATH || '/tmp/v6-product-baseline-shell.png';

const page = await openV6Page({ height: 900, width: 1440 });
try {
  const layout = JSON.parse(await evaluate(page.client, `
    JSON.stringify((() => {
      const rectOf = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };
      const viewport = {
        height: window.innerHeight,
        width: window.innerWidth,
      };
      const chart = rectOf('[data-v6-chart-surface]');
      const chartHost = rectOf('[data-v6-chart-engine-host]');
      const transport = rectOf('[data-v6-transport]');
      const status = rectOf('[data-v6-status-bar]');
      const header = rectOf('[data-v6-workstation-header]');
      return {
        candleCount: document.querySelectorAll('.static-chart-visual .candle').length,
        chart,
        chartHost,
        fallbackOpacity: Number.parseFloat(getComputedStyle(document.querySelector('[data-v6-chart-fallback]')).opacity),
        hostZIndex: Number.parseInt(getComputedStyle(document.querySelector('[data-v6-chart-engine-host]')).zIndex, 10),
        fallbackZIndex: Number.parseInt(getComputedStyle(document.querySelector('[data-v6-chart-fallback]')).zIndex, 10),
        header,
        landingLike: Boolean(document.querySelector('.hero, [data-landing-page], .marketing-page')),
        status,
        title: document.querySelector('.top-bar h1')?.textContent || '',
        topCommandCount: document.querySelectorAll('[data-v6-workstation-header] .tool-button').length,
        transport,
        viewport,
      };
    })())
  `));

  assert.equal(layout.title, 'FX Session Replay');
  assert.equal(layout.landingLike, false);
  assert.equal(layout.topCommandCount >= 12, true);
  assert.equal(layout.candleCount >= 20, true);
  assert.equal(layout.chartHost.width, layout.chart.width);
  assert.equal(layout.chartHost.height, layout.chart.height);
  assert.equal(layout.hostZIndex > layout.fallbackZIndex, true);
  assert.equal(layout.fallbackOpacity <= 0.25, true);
  assert.equal(layout.header.height <= 72, true);
  assert.equal(layout.chart.height > layout.viewport.height * 0.58, true);
  assert.equal(layout.chart.width > layout.viewport.width * 0.88, true);
  assert.equal(layout.transport.top > layout.chart.top, true);
  assert.equal(layout.transport.bottom < layout.chart.bottom, true);
  assert.equal(layout.status.bottom <= layout.viewport.height, true);

  const screenshot = await page.client.send('Page.captureScreenshot', {
    captureBeyondViewport: false,
    format: 'png',
  });
  const png = Buffer.from(screenshot.data, 'base64');
  assert.equal(png.length > 35_000, true);
  await writeFile(SCREENSHOT_PATH, png);
} finally {
  await page.cleanup();
}

console.log(`v6 product baseline screenshot smoke passed: ${SCREENSHOT_PATH}`);
