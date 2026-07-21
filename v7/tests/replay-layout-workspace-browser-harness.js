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
const visualFile = path.join(TEST_DIR, 'fixtures/replay-workspace/layout-four-left-stack-1440x900.png');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-r6-9-chrome-'));
const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1440,900',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function capture(cdp) {
  await evaluate(cdp, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const actual = Buffer.from(data, 'base64');
  if (process.env.V7_UPDATE_VISUALS === '1') {
    fs.writeFileSync(visualFile, actual);
    return;
  }
  assert.ok(fs.existsSync(visualFile), 'missing R6.9 four-Pane visual fixture');
  assert.equal(actual.equals(fs.readFileSync(visualFile)), true, 'R6.9 four-Pane visual fixture changed');
}

function layoutStateExpression() {
  return `(() => {
    const root = document.querySelector('.replay-workspace');
    return {
      cursor: root.dataset.cursorText,
      layoutId: root.dataset.layoutId,
      paneCount: Number(root.dataset.paneCount),
      replayRevision: Number(root.dataset.replayRevision),
      rootRatio: Number(document.querySelector('[data-split-id="root"][role="separator"]')?.getAttribute('aria-valuenow')),
      workspaceRevision: Number(root.dataset.workspaceRevision),
      panes: [...document.querySelectorAll('.workspace-pane:not(.is-prepared)')].map((pane) => {
        const host = pane.querySelector('.lightweight-chart-host');
        const rect = pane.getBoundingClientRect();
        return {
          barCount: Number(host.dataset.barCount),
          height: rect.height,
          instrumentId: host.dataset.instrumentId,
          left: rect.left,
          paneId: pane.dataset.paneId,
          sessionHoursMode: host.dataset.sessionHoursMode,
          timeframeId: host.dataset.displayTimeframeId,
          top: rect.top,
          visibleRevision: Number(host.dataset.visibleRevision),
          width: rect.width,
        };
      }),
    };
  })()`;
}

async function chooseLayout(cdp, layoutId) {
  await evaluate(cdp, `(() => {
    const toggle = document.querySelector('.pane-layout-toggle');
    if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
    document.querySelector('[data-layout-id=${JSON.stringify(layoutId)}]').click();
  })()`);
}

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'America/Los_Angeles' });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `{
      globalThis.__browserErrors = [];
      addEventListener('error', (event) => globalThis.__browserErrors.push(event.message));
      addEventListener('unhandledrejection', (event) => globalThis.__browserErrors.push(String(event.reason)));
    }`,
  });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/` });
  await waitFor(cdp, `document.querySelector('#app')?.dataset.viewState === 'empty'`);
  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'R6.9 Layout Review';
    for (const input of form.querySelectorAll('[name="instrument"]')) input.checked = true;
    form.elements.start.value = '2026-05-04T12:40';
    form.elements.end.value = '2026-05-06T16:00';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`, 12_000);

  await evaluate(cdp, `document.querySelector('.pane-layout-toggle').click()`);
  const menuEvidence = await evaluate(cdp, `(() => ({
    counts: [...document.querySelectorAll('.pane-layout-menu-row')].map((row) => row.querySelectorAll('.pane-layout-option').length),
    expanded: document.querySelector('.pane-layout-toggle').getAttribute('aria-expanded'),
    optionCount: document.querySelectorAll('.pane-layout-option').length,
  }))()`);
  assert.deepEqual(menuEvidence, { counts: [1, 2, 4, 5], expanded: 'true', optionCount: 12 });
  await evaluate(cdp, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);

  await chooseLayout(cdp, 'layout.two-columns');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '2'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  let state = await evaluate(cdp, layoutStateExpression());
  assert.deepEqual(state.panes.map(({ paneId }) => paneId), ['pane-main', 'pane-secondary']);
  const twoColumns = state;

  await chooseLayout(cdp, 'layout.two-rows');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.two-rows'`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.workspaceRevision, twoColumns.workspaceRevision,
    'same-count layout changes must not issue a Pane materialization');
  assert.equal(state.replayRevision, twoColumns.replayRevision,
    'same-count layout changes must not move Replay');

  await chooseLayout(cdp, 'layout.three-right-stack');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '3'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.panes.length, 3);
  assert.ok(state.panes.every(({ barCount }) => barCount > 0));

  await chooseLayout(cdp, 'layout.four-grid');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '4'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-quaternary"]')
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.activePaneId === 'pane-quaternary'`);
  await evaluate(cdp, `(() => {
    const select = document.querySelector('.market-symbol-select');
    select.value = 'instrument.cme.es';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-quaternary"]')?.dataset.instrumentId === 'instrument.cme.es'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-4-hour"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-quaternary"]')?.dataset.timeframeId === 'timeframe.display-4-hour'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);

  const beforeSameCount = await evaluate(cdp, layoutStateExpression());
  await chooseLayout(cdp, 'layout.four-left-stack');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.four-left-stack'`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.workspaceRevision, beforeSameCount.workspaceRevision);
  assert.equal(state.replayRevision, beforeSameCount.replayRevision);
  assert.equal(state.panes.at(-1).instrumentId, 'instrument.cme.es');
  assert.equal(state.panes.at(-1).timeframeId, 'timeframe.display-4-hour');

  const beforeResize = state;
  const drag = await evaluate(cdp, `(() => {
    const split = document.querySelector('.workspace-pane-split[data-split-id="root"]');
    const divider = split.querySelector(':scope > .workspace-pane-divider');
    const splitRect = split.getBoundingClientRect();
    const dividerRect = divider.getBoundingClientRect();
    return {
      startX: dividerRect.left + dividerRect.width / 2,
      startY: dividerRect.top + dividerRect.height / 2,
      targetX: splitRect.left + splitRect.width * .6,
    };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: drag.startX, y: drag.startY, button: 'none', buttons: 0,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: drag.startX, y: drag.startY, button: 'left', buttons: 1, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: drag.targetX, y: drag.startY, button: 'left', buttons: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: drag.targetX, y: drag.startY, button: 'left', buttons: 0, clickCount: 1,
  });
  await waitFor(cdp, `Number(document.querySelector('[data-split-id="root"][role="separator"]')?.getAttribute('aria-valuenow')) >= 58`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.workspaceRevision, beforeResize.workspaceRevision,
    'dragging a divider must not issue a Pane transaction');
  assert.equal(state.replayRevision, beforeResize.replayRevision,
    'dragging a divider must not move Replay');
  assert.ok(state.panes.every(({ height, width }) => height >= 120 && width >= 180),
    `every Pane must retain its minimum size: ${JSON.stringify(state.panes)}`);
  const draggedRatio = state.rootRatio;
  await evaluate(cdp, `(() => {
    const divider = document.querySelector('[data-split-id="root"][role="separator"]');
    divider.focus();
    divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  })()`);
  await waitFor(cdp, `Number(document.querySelector('[data-split-id="root"][role="separator"]')?.getAttribute('aria-valuenow'))
    <= ${draggedRatio - 4}`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.workspaceRevision, beforeResize.workspaceRevision,
    'keyboard divider resize must not issue a Pane transaction');
  assert.equal(state.replayRevision, beforeResize.replayRevision,
    'keyboard divider resize must not move Replay');
  const persistedRatio = state.rootRatio;

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  await waitFor(cdp, `[...document.querySelectorAll('.lightweight-chart-host')]
    .every((host) => host.dataset.sessionHoursMode === 'rth')
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  const beforeNext = await evaluate(cdp, layoutStateExpression());
  await evaluate(cdp, `document.querySelector('.replay-next').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeNext.workspaceRevision}`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.ok(state.panes.every(({ sessionHoursMode }) => sessionHoursMode === 'rth'));
  assert.ok(state.panes.every((pane, index) => pane.visibleRevision > beforeNext.panes[index].visibleRevision),
    'one shared Next must visibly update all four Panes');
  await capture(cdp);

  await evaluate(cdp, `document.querySelector('.replay-back').click()`);
  await waitFor(cdp, `document.querySelector('#app')?.dataset.screen === 'list'`);
  await evaluate(cdp, `(() => {
    const card = [...document.querySelectorAll('.session-card')]
      .find((item) => item.querySelector('h3')?.textContent === 'R6.9 Layout Review');
    card.querySelector('.open-session-button').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.four-left-stack'
    && document.querySelector('.replay-workspace')?.dataset.paneCount === '4'`, 15_000);
  const restored = await evaluate(cdp, layoutStateExpression());
  assert.ok(Math.abs(restored.rootRatio - persistedRatio) <= 1,
    `Session re-entry must restore the accepted divider ratio: ${JSON.stringify({ persistedRatio, restored: restored.rootRatio })}`);
  assert.equal(restored.panes.length, 4);
  assert.deepEqual(await evaluate(cdp, `globalThis.__browserErrors`), []);
} finally {
  cdp?.close();
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!stopped) {
    chrome.kill('SIGKILL');
    await exited;
  }
  await new Promise((resolve) => server.close(resolve));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      fs.rmSync(userDataDirectory, { force: true, recursive: true });
      break;
    } catch (error) {
      if (error.code !== 'ENOTEMPTY' || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

console.log('v7 Replay Layout Workspace browser harness passed', {
  scope: '12 layouts, one-to-four Panes, drag/keyboard-ready split tree, persistence, shared Replay/ETH-RTH',
});
