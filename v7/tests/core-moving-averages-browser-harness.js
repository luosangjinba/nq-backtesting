import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const FIXTURE_ROOT = path.join(TEST_DIR, 'fixtures/core-moving-averages');
const screenshotFile = path.join(FIXTURE_ROOT, 'production-1000x700.png');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-h120-sma-'));
const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1000,700',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const file = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').split(/\r?\n/u)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function stopChrome() {
  if (chrome.exitCode !== null) return;
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!stopped) { chrome.kill('SIGKILL'); await exited; }
}

async function animationFrames(cdp, count = 2) {
  await evaluate(cdp, `(async () => {
    for (let index = 0; index < ${count}; index += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  })()`);
}

async function pixelStats(cdp, color) {
  return evaluate(cdp, `(() => {
    const color = '${color}';
    const target = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
    const hosts = [...document.querySelectorAll('.lightweight-chart-host')];
    const result = { count: 0, hosts: [], maxY: null, minY: null, sumY: 0 };
    for (const host of hosts) {
      const hostRect = host.getBoundingClientRect();
      const entry = { count: 0, maxY: null, minY: null, paneId: host.dataset.paneId, sumY: 0 };
      for (const canvas of host.querySelectorAll('canvas')) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context || canvas.width < 1 || canvas.height < 1) continue;
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const rect = canvas.getBoundingClientRect();
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (Math.abs(pixels[offset] - target[0]) > 12
            || Math.abs(pixels[offset + 1] - target[1]) > 12
            || Math.abs(pixels[offset + 2] - target[2]) > 12
            || pixels[offset + 3] < 80) continue;
          const pixelIndex = offset / 4;
          const y = rect.top - hostRect.top
            + ((Math.floor(pixelIndex / canvas.width) + 0.5) / canvas.height) * rect.height;
          entry.count += 1;
          entry.sumY += y;
          entry.minY = entry.minY === null ? y : Math.min(entry.minY, y);
          entry.maxY = entry.maxY === null ? y : Math.max(entry.maxY, y);
        }
      }
      result.count += entry.count;
      result.sumY += entry.sumY;
      result.minY = entry.minY === null ? result.minY
        : result.minY === null ? entry.minY : Math.min(result.minY, entry.minY);
      result.maxY = entry.maxY === null ? result.maxY
        : result.maxY === null ? entry.maxY : Math.max(result.maxY, entry.maxY);
      result.hosts.push(entry);
    }
    result.meanY = result.count === 0 ? null : result.sumY / result.count;
    return result;
  })()`);
}

async function openAction(cdp, text, paneIndex = 0) {
  await evaluate(cdp, `(() => {
    const pane = document.querySelectorAll('.workspace-pane:not(.is-prepared)')[${paneIndex}];
    const details = pane.querySelector('.calculated-series-legend-actions');
    details.open = true;
    const button = [...details.querySelectorAll('button')]
      .find((candidate) => candidate.textContent.trim() === '${text}');
    if (!button) throw new Error('Missing Indicator action: ${text}');
    button.click();
  })()`);
}

async function addToPane(cdp, paneIndex) {
  const startedAt = performance.now();
  await evaluate(cdp, `document.querySelectorAll('.workspace-pane:not(.is-prepared)')[${paneIndex}]
    .querySelector('.calculated-series-add-command').click()`);
  await waitFor(cdp, `document.querySelector('.calculated-series-add-dialog')?.open === true`);
  const catalog = await evaluate(cdp, `(() => ({
    cards: document.querySelectorAll('.calculated-series-definition-card').length,
    copy: document.querySelector('.calculated-series-definition-list').textContent,
  }))()`);
  assert.equal(catalog.cards, 1);
  assert.match(catalog.copy, /Simple Moving Average/u);
  assert.match(catalog.copy, /Moving Averages · 1\.0\.0/u);
  await evaluate(cdp, `document.querySelector('.calculated-series-definition-add').click()`);
  await waitFor(cdp, `document.querySelectorAll('.workspace-pane:not(.is-prepared)')[${paneIndex}]
    .querySelector('.calculated-series-pane-ui')?.dataset.instanceCount === '1'`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);
  return performance.now() - startedAt;
}

async function assertNoBrowserErrors(cdp, label) {
  const errors = await evaluate(cdp, 'globalThis.__h120BrowserErrors');
  assert.deepEqual(errors, [], `${label}: ${errors.join(' | ')}`);
}

let cdp;
let evidence;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find(({ type }) => type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1, height: 700, mobile: false, width: 1000,
  });
  await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'America/Los_Angeles' });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `{
      globalThis.__h120BrowserErrors = [];
      addEventListener('error', (event) => globalThis.__h120BrowserErrors.push(event.message));
      addEventListener('unhandledrejection', (event) => {
        globalThis.__h120BrowserErrors.push(String(event.reason?.stack ?? event.reason));
      });
      const NativeDate = Date;
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [1780693200000])); }
        static now() { return 1780693200000; }
      };
    }`,
  });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/` });
  try {
    await waitFor(cdp, `document.querySelector('#app')?.dataset.viewState === 'empty'`, 15_000);
  } catch (error) {
    throw new Error(`${error.message}; browser errors: ${JSON.stringify(
      await evaluate(cdp, 'globalThis.__h120BrowserErrors'),
    )}`);
  }
  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  try {
    await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`, 15_000);
  } catch (error) {
    const state = await evaluate(cdp, `(() => ({
      availability: document.querySelector('.create-dialog')?.dataset.dateAvailabilityState,
      errors: globalThis.__h120BrowserErrors,
      text: document.querySelector('.create-dialog')?.textContent,
    }))()`);
    throw new Error(`${error.message}; create dialog: ${JSON.stringify(state)}`);
  }
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'H120 SMA Production Review';
    form.querySelectorAll('[name="instrument"]')[0].checked = true;
    form.elements.start.value = '2026-05-01T12:40';
    form.elements.end.value = '2026-05-11T12:40';
    form.requestSubmit();
  })()`);
  try {
    await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
      && document.querySelector('.calculated-series-add-command')`, 20_000);
  } catch (error) {
    const state = await evaluate(cdp, `(() => ({
      app: document.querySelector('#app')?.dataset.viewState,
      errors: globalThis.__h120BrowserErrors,
      hosts: [...document.querySelectorAll('.lightweight-chart-host')].map((host) => ({
        barCount: host.dataset.barCount, error: host.dataset.lastApplyError,
        paneId: host.dataset.paneId, painted: host.dataset.painted,
      })),
      overlay: document.querySelector('.chart-state-overlay')?.textContent,
      route: location.hash,
      status: document.querySelector('.workspace-inline-status')?.textContent,
      workspace: document.querySelector('.replay-workspace')?.dataset.viewState,
    }))()`);
    throw new Error(`${error.message}; entry: ${JSON.stringify(state)}`);
  }

  // Core Plugin Center contains the one enabled first-party Moving Averages package.
  await evaluate(cdp, `document.querySelector('.workstation-settings-open').click()`);
  await waitFor(cdp, `document.querySelector('.workstation-settings-dialog')?.open === true`);
  await evaluate(cdp, `([...document.querySelectorAll('[role="tab"]')]
    .find((tab) => tab.textContent.trim() === 'Plugins')).click()`);
  const corePackage = await evaluate(cdp, `(() => {
    const rows = [...document.querySelectorAll('.core-plugin-row[data-package-id="first-party.moving-averages"]')];
    return { allRows: document.querySelectorAll('.core-plugin-row').length, count: rows.length,
      state: rows[0]?.dataset.runtimeState ?? null, text: rows[0]?.textContent ?? '' };
  })()`);
  assert.equal(corePackage.count, 1);
  assert.equal(corePackage.state, 'active');
  assert.match(corePackage.text, /Moving Averages/u);
  await evaluate(cdp, `document.querySelector('.workstation-settings-close').click()`);
  await waitFor(cdp, `document.querySelector('.workstation-settings-dialog')?.open === false`);

  const beforeAdd = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { barCount: Number(host.dataset.barCount), candleRevision: host.dataset.visibleRevision,
      keyCount: Object.keys(localStorage).filter((key) => key.startsWith('v7.calculated-series:document:')).length };
  })()`);
  assert.ok(beforeAdd.barCount >= 20 && beforeAdd.barCount < 500,
    `initial Replay must distinguish SMA 20 ready from SMA 500 warmup: ${JSON.stringify(beforeAdd)}`);

  // Keyboard-add the only definition and prove the default against accepted Bars.
  const onePaneAddStartedAt = performance.now();
  await evaluate(cdp, `document.querySelector('.calculated-series-add-command').click()`);
  await waitFor(cdp, `document.querySelector('.calculated-series-add-dialog')?.open === true`);
  const addCatalog = await evaluate(cdp, `(() => ({
    active: document.activeElement?.getAttribute('aria-label'),
    cards: document.querySelectorAll('.calculated-series-definition-card').length,
    text: document.querySelector('.calculated-series-definition-list').textContent,
  }))()`);
  assert.deepEqual({ active: addCatalog.active, cards: addCatalog.cards }, {
    active: 'Search enabled Indicators', cards: 1,
  });
  assert.match(addCatalog.text, /Simple Moving Average/u);
  await evaluate(cdp, `document.querySelector('.calculated-series-definition-add').focus()`);
  await cdp.send('Input.dispatchKeyEvent', {
    code: 'Enter', key: 'Enter', nativeVirtualKeyCode: 13, type: 'rawKeyDown',
    windowsVirtualKeyCode: 13,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    key: 'Enter', text: '\r', type: 'char', unmodifiedText: '\r', windowsVirtualKeyCode: 13,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    code: 'Enter', key: 'Enter', nativeVirtualKeyCode: 13, type: 'keyUp', windowsVirtualKeyCode: 13,
  });
  try {
    await waitFor(cdp, `document.querySelector('.calculated-series-pane-ui')?.dataset.instanceCount === '1'`);
  } catch (error) {
    const state = await evaluate(cdp, `(() => ({
      active: document.activeElement?.className,
      addDisabled: document.querySelector('.calculated-series-definition-add')?.disabled,
      browserErrors: globalThis.__h120BrowserErrors,
      dialogOpen: document.querySelector('.calculated-series-add-dialog')?.open,
      dialogStatus: document.querySelector('.calculated-series-dialog-status')?.textContent,
      instanceCount: document.querySelector('.calculated-series-pane-ui')?.dataset.instanceCount,
      keys: Object.keys(localStorage).filter((key) => key.startsWith('v7.calculated-series:document:')),
      workspaceBusy: document.querySelector('.replay-workspace')?.getAttribute('aria-busy'),
    }))()`);
    throw new Error(`${error.message}; Add state: ${JSON.stringify(state)}`);
  }
  await animationFrames(cdp);
  const onePaneAddMs = performance.now() - onePaneAddStartedAt;
  assert.ok(onePaneAddMs < 2_000, `one-Pane Add exceeded 2s: ${onePaneAddMs}ms`);
  const defaultBlue = await pixelStats(cdp, '#2962FF');
  assert.ok(defaultBlue.count > 10, 'default SMA 20 must paint against the accepted 121-Bar prefix');
  const afterAdd = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    const row = document.querySelector('.calculated-series-legend-row');
    return { candleRevision: host.dataset.visibleRevision, focus: document.activeElement?.className,
      keyCount: Object.keys(localStorage).filter((key) => key.startsWith('v7.calculated-series:document:')).length,
      label: row.querySelector('.calculated-series-legend-name').textContent,
      state: row.querySelector('.calculated-series-legend-state').textContent,
      value: row.querySelector('.calculated-series-legend-value').textContent };
  })()`);
  assert.equal(afterAdd.candleRevision, beforeAdd.candleRevision);
  assert.equal(afterAdd.keyCount, 1);
  assert.equal(afterAdd.label, 'SMA 20');
  assert.equal(afterAdd.state, 'Ready');
  assert.notEqual(afterAdd.value, '—');
  assert.match(afterAdd.focus, /calculated-series-add-command/u);

  // The same real production prefix is insufficient for L=500: prove exact
  // whitespace before the first valid value, then Reset to the default.
  await openAction(cdp, 'Settings');
  await waitFor(cdp, `document.querySelector('.calculated-series-settings-dialog')?.open === true`);
  await evaluate(cdp, `(() => {
    const input = document.querySelector('[aria-label="Length"]');
    input.value = '500'; input.dispatchEvent(new Event('input', { bubbles: true }));
    [...document.querySelectorAll('.calculated-series-settings-dialog button')]
      .find((button) => button.textContent === 'Apply').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.calculated-series-settings-dialog')?.open === false
    && document.querySelector('.calculated-series-legend-name')?.textContent === 'SMA 500'`);
  await animationFrames(cdp, 3);
  const warmupPixels = await pixelStats(cdp, '#2962FF');
  assert.equal(warmupPixels.count, 0, 'SMA 500 must paint no blue pixel before its first valid value');
  assert.equal(await evaluate(cdp,
    `document.querySelector('.calculated-series-legend-value').textContent`), '—');

  await openAction(cdp, 'Settings');
  await waitFor(cdp, `document.querySelector('.calculated-series-settings-dialog')?.open === true`);
  await evaluate(cdp, `[...document.querySelectorAll('.calculated-series-settings-dialog button')]
    .find((button) => button.textContent === 'Reset').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('[aria-label="Length"]').value`), '20');
  await evaluate(cdp, `[...document.querySelectorAll('.calculated-series-settings-dialog button')]
    .find((button) => button.textContent === 'Apply').click()`);
  await waitFor(cdp, `document.querySelector('.calculated-series-settings-dialog')?.open === false
    && document.querySelector('.calculated-series-legend-name')?.textContent === 'SMA 20'`);
  await animationFrames(cdp, 3);
  const resetBlue = await pixelStats(cdp, '#2962FF');
  assert.ok(resetBlue.count > 10, 'Reset to SMA 20 must restore the valid blue line');

  await evaluate(cdp, `(() => {
    const select = document.querySelector('.replay-step-select');
    select.value = 'replay.step.30-minutes';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('.replay-next').click();
  })()`);
  await waitFor(cdp, `Number(document.querySelector('.lightweight-chart-host').dataset.barCount) >= 20
    && document.querySelector('.replay-workspace').getAttribute('aria-busy') === 'false'`, 20_000);
  await animationFrames(cdp, 3);
  const readyBlue = await pixelStats(cdp, '#2962FF');
  assert.ok(readyBlue.count > 10, `valid SMA line must paint blue pixels: ${JSON.stringify(readyBlue)}`);
  const candleRevisionAfterReplay = await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.visibleRevision`);

  // Settings validation, dirty Cancel, tabs, style + length apply, and focus recovery.
  await openAction(cdp, 'Settings');
  await waitFor(cdp, `document.querySelector('.calculated-series-settings-dialog')?.open === true`);
  assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('.calculated-series-tab')]
    .map((tab) => tab.textContent)`), ['Inputs', 'Style', 'Visibility']);
  await evaluate(cdp, `(() => {
    const input = document.querySelector('[aria-label="Length"]');
    input.value = '2.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    [...document.querySelectorAll('.calculated-series-settings-dialog button')]
      .find((button) => button.textContent === 'Apply').click();
  })()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('[aria-label="Length"]').getAttribute('aria-invalid')`), 'true');
  assert.match(await evaluate(cdp,
    `document.querySelector('.calculated-series-settings-dialog .calculated-series-dialog-status').textContent`),
  /Correct/u);
  await evaluate(cdp, `(() => {
    const input = document.querySelector('[aria-label="Length"]');
    input.value = '2'; input.dispatchEvent(new Event('input', { bubbles: true }));
    [...document.querySelectorAll('.calculated-series-tab')]
      .find((tab) => tab.textContent === 'Style').click();
    const color = document.querySelector('[aria-label="Line color"]');
    color.value = '#FF00FFFF'; color.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await cdp.send('Input.dispatchKeyEvent', {
    code: 'Escape', key: 'Escape', nativeVirtualKeyCode: 27, type: 'rawKeyDown',
    windowsVirtualKeyCode: 27,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    code: 'Escape', key: 'Escape', nativeVirtualKeyCode: 27, type: 'keyUp',
    windowsVirtualKeyCode: 27,
  });
  assert.match(await evaluate(cdp,
    `document.querySelector('.calculated-series-settings-dialog .calculated-series-dialog-status').textContent`),
  /Unsaved changes/u);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.calculated-series-settings-dialog').open`), true);
  await evaluate(cdp, `[...document.querySelectorAll('.calculated-series-settings-dialog button')]
    .find((button) => button.textContent === 'Apply').click()`);
  await waitFor(cdp, `document.querySelector('.calculated-series-settings-dialog')?.open === false
    && document.querySelector('.calculated-series-legend-name')?.textContent === 'SMA 2'`);
  await animationFrames(cdp, 3);
  const styledBlue = await pixelStats(cdp, '#2962FF');
  const styledMagenta = await pixelStats(cdp, '#FF00FF');
  assert.equal(styledBlue.count, 0, 'old blue Plot must be cleared after Style Apply');
  assert.ok(styledMagenta.count > 10, 'new magenta style must paint');
  assert.match(await evaluate(cdp, 'document.activeElement?.className ?? ""'),
    /calculated-series-add-command/u);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.visibleRevision`), candleRevisionAfterReplay);

  // One synchronized chart, Main→new internal Region→Main, exact pixels and cleanup.
  const canvasesBeforeMove = await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').querySelectorAll('canvas').length`);
  await openAction(cdp, 'Move to New Region');
  await waitFor(cdp, `document.querySelector('.calculated-series-legend-row')?.dataset.regionId !== 'region-main'`);
  await animationFrames(cdp, 3);
  const movedMagenta = await pixelStats(cdp, '#FF00FF');
  const canvasesMoved = await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').querySelectorAll('canvas').length`);
  assert.ok(movedMagenta.count > 10);
  assert.ok(canvasesMoved > canvasesBeforeMove, 'new Region must remain inside one Chart host');
  assert.notEqual(Math.round(movedMagenta.meanY), Math.round(styledMagenta.meanY),
    'move must relocate the rendered line instead of leaving stale Main pixels');
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.lightweight-chart-host').length`), 1);

  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const screenshotBytes = Buffer.from(screenshot.data, 'base64');
  assert.ok(screenshotBytes.length > 10_000);
  if (process.env.V7_UPDATE_VISUALS === '1') {
    fs.mkdirSync(FIXTURE_ROOT, { recursive: true });
    fs.writeFileSync(screenshotFile, screenshotBytes);
  } else {
    assert.ok(fs.existsSync(screenshotFile), 'missing H120 focused production screenshot evidence');
    assert.ok(fs.statSync(screenshotFile).size > 10_000, 'H120 screenshot evidence is empty');
  }

  await openAction(cdp, 'Move to Main');
  await waitFor(cdp, `document.querySelector('.calculated-series-legend-row')?.dataset.regionId === 'region-main'`);
  await animationFrames(cdp, 3);
  const canvasesReturned = await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').querySelectorAll('canvas').length`);
  assert.equal(canvasesReturned, canvasesBeforeMove, 'return to Main must remove the empty Region');

  // Hide/show clears and restores exact style without touching candle revision.
  await openAction(cdp, 'Hide');
  await waitFor(cdp, `document.querySelector('.calculated-series-legend-state')?.textContent === 'Hidden'`);
  await animationFrames(cdp, 3);
  assert.equal((await pixelStats(cdp, '#FF00FF')).count, 0);
  await openAction(cdp, 'Show');
  await waitFor(cdp, `document.querySelector('.calculated-series-legend-state')?.textContent === 'Ready'`);
  await animationFrames(cdp, 3);
  assert.ok((await pixelStats(cdp, '#FF00FF')).count > 10);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.visibleRevision`), candleRevisionAfterReplay);

  // Native crosshair, drag/wheel/scale and Reset View remain live.
  const point = await evaluate(cdp, `(() => {
    const box = document.querySelector('.lightweight-chart-host').getBoundingClientRect();
    return { x: box.left + box.width * .62, y: box.top + box.height * .42 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'none', buttons: 0, type: 'mouseMoved', x: point.x, y: point.y,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', x: point.x, y: point.y,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 1, type: 'mouseMoved', x: point.x + 28, y: point.y,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased', x: point.x + 28, y: point.y,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    deltaX: 0, deltaY: -90, type: 'mouseWheel', x: point.x, y: point.y,
  });
  await animationFrames(cdp, 2);
  const interaction = await evaluate(cdp, `(() => ({
    ohlc: document.querySelector('.pane-ohlc')?.dataset.state,
    resetDisabled: document.querySelector('.pane-reset').disabled,
    viewportRevision: Number(document.querySelector('.lightweight-chart-host').dataset.viewportRevision),
  }))()`);
  assert.equal(interaction.ohlc, 'selected');
  assert.equal(interaction.resetDisabled, false);
  assert.ok(interaction.viewportRevision >= 1);
  await evaluate(cdp, `document.querySelector('.pane-reset').click()`);

  // Hard reload preserves exact sidecar, style, length, and live calculation.
  const route = await evaluate(cdp, 'location.hash');
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `location.hash === '${route}'
    && document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.calculated-series-legend-name')?.textContent === 'SMA 2'`, 20_000);
  await animationFrames(cdp, 3);
  assert.ok((await pixelStats(cdp, '#FF00FF')).count > 10);
  assert.equal(await evaluate(cdp, `Object.keys(localStorage)
    .filter((key) => key.startsWith('v7.calculated-series:document:')).length`), 1);

  // Reproduce the production failure shape: an unaligned Replay cutoff, two
  // Panes, and a 1m→5m replacement whose trailing 5m candle is in progress.
  const beforeOneMinuteStep = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  await evaluate(cdp, `(() => {
    const select = document.querySelector('.replay-step-select');
    select.value = 'replay.step.1-minute';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('.replay-next').click();
  })()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision)
    > ${beforeOneMinuteStep}
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);
  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.two-columns"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '2'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);
  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-main"]')
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.activePaneId === 'pane-main'`);
  const beforeTimeframeRevision = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-5-minute"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-main"]')
      ?.dataset.timeframeId === 'timeframe.display-5-minute'
    && Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision)
      === ${beforeTimeframeRevision + 1}
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);
  const timeframeReplacement = await evaluate(cdp, `(() => ({
    mainIndicatorState: document.querySelector('[data-pane-id="pane-main"] .calculated-series-legend-state')
      ?.textContent ?? null,
    mainTimeframe: document.querySelector('[data-pane-id="pane-main"]')?.dataset.timeframeId ?? null,
    secondaryTimeframe: document.querySelector('[data-pane-id="pane-secondary"]')?.dataset.timeframeId ?? null,
    status: document.querySelector('.workspace-inline-status')?.textContent ?? '',
    viewState: document.querySelector('.replay-workspace')?.dataset.viewState ?? null,
  }))()`);
  assert.deepEqual(timeframeReplacement, {
    mainIndicatorState: 'Ready',
    mainTimeframe: 'timeframe.display-5-minute',
    secondaryTimeframe: 'timeframe.display-1-minute',
    status: '',
    viewState: 'ready',
  });
  assert.ok((await pixelStats(cdp, '#FF00FF')).count > 10,
    'SMA must remain painted after a two-Pane 1m→5m replacement');

  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.two-rows"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.two-rows'`);
  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.single"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '1'
    && document.querySelector('[data-pane-id="pane-main"]')?.dataset.timeframeId
      === 'timeframe.display-5-minute'
    && document.querySelector('[data-pane-id="pane-main"] .calculated-series-pane-ui')
      ?.dataset.instanceCount === '1'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);
  assert.equal(await evaluate(cdp, `document.querySelector('.workspace-inline-status')?.textContent ?? ''`), '');
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-1-minute"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-main"]')?.dataset.timeframeId
      === 'timeframe.display-1-minute'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);

  // Remove clears the line and legend durably.
  await openAction(cdp, 'Remove');
  await waitFor(cdp, `document.querySelector('.calculated-series-pane-ui')?.dataset.instanceCount === '0'`);
  await animationFrames(cdp, 3);
  assert.equal((await pixelStats(cdp, '#FF00FF')).count, 0);

  // Four Panes: one isolated SMA instance in each, same runtime/document, no overflow.
  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.four-grid"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '4'
    && document.querySelectorAll('.workspace-pane:not(.is-prepared)').length === 4
    && document.querySelector('.replay-workspace').getAttribute('aria-busy') === 'false'`, 20_000);
  const fourPaneAddMs = [];
  for (let paneIndex = 0; paneIndex < 4; paneIndex += 1) {
    fourPaneAddMs.push(await addToPane(cdp, paneIndex));
  }
  assert.equal(fourPaneAddMs.every((durationMs) => durationMs < 2_000), true,
    `four-Pane Add exceeded 2s: ${JSON.stringify(fourPaneAddMs)}`);
  await animationFrames(cdp, 3);
  const fourPane = await evaluate(cdp, `(() => {
    const panes = [...document.querySelectorAll('.workspace-pane:not(.is-prepared)')];
    const ids = panes.map((pane) => pane.querySelector('.calculated-series-legend-row')?.dataset.instanceId);
    return {
      chartHosts: document.querySelectorAll('.lightweight-chart-host').length,
      ids,
      instanceCounts: panes.map((pane) => pane.querySelector('.calculated-series-pane-ui')?.dataset.instanceCount),
      overflow: panes.some((pane) => pane.scrollWidth > pane.clientWidth + 1),
      values: panes.map((pane) => pane.querySelector('.calculated-series-legend-value')?.textContent),
    };
  })()`);
  assert.equal(fourPane.chartHosts, 4);
  assert.equal(new Set(fourPane.ids).size, 4);
  assert.deepEqual(fourPane.instanceCounts, ['1', '1', '1', '1']);
  assert.equal(fourPane.overflow, false);
  assert.equal(fourPane.values.every((value) => value !== '—'), true);

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1, height: 560, mobile: false, width: 760,
  });
  await animationFrames(cdp, 3);
  const containment = await evaluate(cdp, `(() => ({
    bodyOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    panes: [...document.querySelectorAll('.workspace-pane:not(.is-prepared)')]
      .every((pane) => pane.getBoundingClientRect().right <= innerWidth + 1),
  }))()`);
  assert.deepEqual(containment, { bodyOverflow: false, panes: true });

  // Existing Core annotation tools and Replay/Session controls remain present.
  const retainedControls = await evaluate(cdp, `(() => ({
    annotationTools: [...document.querySelectorAll('.annotation-tool-button')]
      .map((button) => button.textContent.trim()),
    exactGoto: Boolean(document.querySelector('.exact-goto-toggle')),
    replaySelection: Boolean(document.querySelector('.replay-step-select')),
    resetButtons: document.querySelectorAll('.pane-reset').length,
    sessionHours: document.querySelectorAll('.session-hours-control [data-value]').length,
  }))()`);
  assert.deepEqual(retainedControls.annotationTools, ['FVG']);
  assert.equal(retainedControls.exactGoto, true);
  assert.equal(retainedControls.replaySelection, true);
  assert.equal(retainedControls.resetButtons, 4);
  assert.ok(retainedControls.sessionHours >= 2);
  await assertNoBrowserErrors(cdp, 'H120 production route');

  evidence = {
    corePackageRows: corePackage.count,
    fourPaneInstances: fourPane.ids.length,
    movedCanvasCount: canvasesMoved,
    readyBluePixels: readyBlue.count,
    responsive: containment,
    styledMagentaPixels: styledMagenta.count,
    timeframeReplacement,
    timings: {
      fourPaneAddMs: fourPaneAddMs.map((durationMs) => Number(durationMs.toFixed(1))),
      onePaneAddMs: Number(onePaneAddMs.toFixed(1)),
    },
    warmupPixels: warmupPixels.count,
  };
} finally {
  cdp?.close();
  await stopChrome();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 50,
  });
}

console.log(JSON.stringify({ evidence, harness: 'H120-browser', status: 'passed' }));
