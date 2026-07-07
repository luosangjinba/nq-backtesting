import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    JSON.stringify((() => {
      const surface = document.querySelector('[data-v6-chart-surface]');
      const host = document.querySelector('[data-v6-chart-engine-host]');
      const fallback = document.querySelector('[data-v6-chart-fallback]');
      const placeholder = document.querySelector('[data-v6-chart-placeholder]');
      const surfaceRect = surface.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      return {
        candleCount: document.querySelectorAll('.static-chart-visual .candle').length,
        fallbackHiddenFromAccessibility: fallback.getAttribute('aria-hidden'),
        fallbackOpacity: Number.parseFloat(getComputedStyle(fallback).opacity),
        fallbackZIndex: Number.parseInt(getComputedStyle(fallback).zIndex, 10),
        hostHeight: Math.round(hostRect.height),
        hostPaneId: host.dataset.v6PaneId || '',
        hostWidth: Math.round(hostRect.width),
        hostZIndex: Number.parseInt(getComputedStyle(host).zIndex, 10),
        placeholderZIndex: Number.parseInt(getComputedStyle(placeholder).zIndex, 10),
        surfaceHeight: Math.round(surfaceRect.height),
        surfaceWidth: Math.round(surfaceRect.width),
      };
    })())
  `));

  assert.equal(value.hostPaneId, 'main');
  assert.equal(value.hostWidth, value.surfaceWidth);
  assert.equal(value.hostHeight, value.surfaceHeight);
  assert.equal(value.hostZIndex > value.fallbackZIndex, true);
  assert.equal(value.placeholderZIndex > value.hostZIndex, true);
  assert.equal(value.fallbackOpacity <= 0.25, true);
  assert.equal(value.fallbackHiddenFromAccessibility, 'true');
  assert.equal(value.candleCount >= 20, true);
} finally {
  await page.cleanup();
}

console.log('v6 workstation chart host browser smoke passed');
