import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const [contractSource, shellSource, stylesSource] = await Promise.all([
  readFile('v6/src/drawing-action-history/drawing-action-history-contract.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
  readFile('v6/src/styles/app.css', 'utf8'),
]);

assert.doesNotMatch(shellSource, /data-v6-left-drawing-rail|data-v6-left-drawing-tool/);
assert.doesNotMatch(stylesSource, /\.left-drawing-rail|\.drawing-rail-button/);
assert.match(contractSource, /drawing-action-history-runtime/);

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    JSON.stringify((() => {
      const rectOf = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return {
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      };
      return {
        canvasCount: document.querySelectorAll('[data-v6-chart-engine-host] canvas').length,
        chart: rectOf('[data-v6-chart-surface]'),
        drawingEntryCount: document.querySelectorAll('[data-v6-left-drawing-rail], [data-v6-left-drawing-tool]').length,
        host: rectOf('[data-v6-chart-engine-host]'),
        main: rectOf('[data-v6-workstation-main]'),
        rightRail: rectOf('[data-v6-right-utility-rail]'),
      };
    })())
  `));

  assert.equal(value.drawingEntryCount, 0);
  assert.equal(value.chart.left <= value.main.left + 2, true);
  assert.equal(value.chart.right <= value.rightRail.left + 1, true);
  assert.equal(value.host.width, value.chart.width);
  assert.equal(value.host.height, value.chart.height);
  assert.equal(value.canvasCount > 0, true);
} finally {
  await page.cleanup();
}

console.log('v6 traditional drawing rail removal browser smoke passed');
