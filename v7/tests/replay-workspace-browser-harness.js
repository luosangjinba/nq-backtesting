import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createFoundationMarket } from '../src/replay-workspace-ui/foundation-market.js';
import { REPLAY_WORKSPACE_STATES } from '../src/replay-workspace-ui/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const visualFile = path.join(TEST_DIR, 'fixtures/replay-workspace/ready-default-1440x900.png');
const menuVisualFile = path.join(TEST_DIR, 'fixtures/replay-workspace/timeframe-menu-open-1440x900.png');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/replay-workspace/negative/cases.json',
), 'utf8'));
assert.equal(negativeCases.length, 6);
assert.equal(new Set(negativeCases).size, 6);
assert.deepEqual(REPLAY_WORKSPACE_STATES, [
  'loading', 'empty', 'unavailable', 'stale', 'error', 'ready',
]);
const qualityMarket = createFoundationMarket({
  configuration: { historicalRange: { startEpochMs: 1_780_000_000_000, endEpochMs: 1_780_021_600_000 } },
});
const qualityBars = qualityMarket.provider.requestRawBars(qualityMarket.request).bars;
const candleQuality = qualityBars.reduce((summary, bar) => {
  const body = Math.abs(bar.close - bar.open);
  const totalWick = (bar.high - Math.max(bar.open, bar.close))
    + (Math.min(bar.open, bar.close) - bar.low);
  summary.body += body;
  summary.wick += totalWick;
  summary.spikes += totalWick > Math.max(3, body * 3) ? 1 : 0;
  const direction = Math.sign(bar.close - bar.open);
  if (direction !== 0 && direction === summary.previousDirection) summary.currentRun += 1;
  else summary.currentRun = direction === 0 ? 0 : 1;
  summary.longestRun = Math.max(summary.longestRun, summary.currentRun);
  if (direction !== 0) summary.previousDirection = direction;
  for (const price of [bar.open, bar.high, bar.low, bar.close]) {
    assert.equal(Number.isInteger(price * 4), true, 'foundation OHLC must align to the NQ 0.25 tick');
  }
  return summary;
}, { body: 0, currentRun: 0, longestRun: 0, previousDirection: 0, spikes: 0, wick: 0 });
assert.ok(candleQuality.wick < candleQuality.body,
  'foundation candles must not be dominated by synthetic upper/lower wicks');
assert.ok(candleQuality.spikes / qualityBars.length < 0.08,
  'foundation candles must reserve elongated wicks for sparse events');
assert.ok(candleQuality.longestRun < 12,
  'foundation candles must not collapse into long mechanical directional staircases');
const fridayStart = Date.parse('2026-05-01T19:40:00Z');
const fridayMarket = createFoundationMarket({
  configuration: { historicalRange: {
    startEpochMs: fridayStart,
    endEpochMs: Date.parse('2026-05-11T19:40:00Z'),
  } },
});
const weekendPlan = fridayMarket.planEligibleMinutes({
  count: 1,
  cursorEpochMs: Date.parse('2026-05-01T21:00:00Z'),
  selection: fridayMarket.defaultSelection,
});
assert.equal(
  Date.parse('2026-05-01T21:00:00Z') + weekendPlan.durationMs,
  Date.parse('2026-05-03T22:01:00Z'),
  'ETH Next from the Friday close must reveal the Sunday reopen minute',
);
assert.equal(weekendPlan.request.windowEndEpochMs, Date.parse('2026-05-03T22:01:00Z'));
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-r4-5-chrome-'));
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

async function capture(cdp, targetFile = visualFile, label = 'replay workspace') {
  let actual;
  if (process.env.V7_UPDATE_VISUALS === '1') {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    actual = Buffer.from(data, 'base64');
    fs.writeFileSync(targetFile, actual);
  }
  else {
    assert.ok(fs.existsSync(targetFile), `missing ${label} visual fixture`);
    const expected = fs.readFileSync(targetFile);
    let matches = false;
    for (let attempt = 0; attempt < 5 && !matches; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await evaluate(cdp, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      }
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      actual = Buffer.from(data, 'base64');
      matches = actual.equals(expected);
    }
    if (!matches) fs.writeFileSync(path.join(os.tmpdir(), 'v7-replay-workspace-actual.png'), actual);
    assert.equal(matches, true, `${label} visual fixture changed`);
  }
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
      const NativeDate = Date;
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [1780693200000])); }
        static now() { return 1780693200000; }
      };
    }`,
  });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/` });
  try {
    await waitFor(cdp, `document.querySelector('#app')?.dataset.viewState === 'empty'`);
  } catch (error) {
    const browserErrors = await evaluate(cdp, `globalThis.__browserErrors`);
    throw new Error(`${error.message}; browser errors: ${browserErrors.join(' | ')}`);
  }
  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'NQ Morning Replay';
    form.querySelectorAll('[name="instrument"]')[0].checked = true;
    form.elements.start.value = '2026-05-01T12:40';
    form.elements.end.value = '2026-05-11T12:40';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 1`);
  await evaluate(cdp, `document.querySelector('.open-session-button').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`);

  const entry = await evaluate(cdp, `(() => {
    const root = document.querySelector('.replay-workspace');
    const host = document.querySelector('.lightweight-chart-host');
    return {
      barCount: Number(host.dataset.barCount),
      buttonHeight: document.querySelector('.replay-next').getBoundingClientRect().height,
      controlHeight: document.querySelector('.workspace-choice').getBoundingClientRect().height,
      canvasCount: host.querySelectorAll('canvas').length,
      chartHeight: host.getBoundingClientRect().height,
      chartWidth: host.getBoundingClientRect().width,
      libraryVersion: host.dataset.libraryVersion,
      offset: Number(host.dataset.latestOffsetBars),
      origin: host.dataset.viewportOrigin,
      painted: host.dataset.painted,
      replayRevision: Number(root.dataset.replayRevision),
      sessionHoursMode: root.dataset.sessionHoursMode,
      sessionRange: document.querySelector('.replay-session-range').textContent,
      timeframeId: root.dataset.timeframeId,
      visibleThrough: document.querySelector('.replay-visible-through').textContent,
      workspaceRevision: Number(root.dataset.workspaceRevision),
    };
  })()`);
  assert.ok(entry.canvasCount > 0, 'real chart must own painted canvases');
  delete entry.canvasCount;
  assert.ok(entry.chartWidth >= 1100, `chart must fill available desktop width: ${entry.chartWidth}px`);
  assert.ok(entry.chartHeight >= 650, `chart must fill available desktop height: ${entry.chartHeight}px`);
  assert.ok(entry.buttonHeight <= 32, `replay actions must remain compact: ${entry.buttonHeight}px`);
  assert.ok(entry.controlHeight <= 26, `workspace selectors must remain compact: ${entry.controlHeight}px`);
  delete entry.chartWidth;
  delete entry.chartHeight;
  delete entry.buttonHeight;
  delete entry.controlHeight;
  assert.deepEqual(entry, {
    barCount: 121, libraryVersion: '5.2.0', offset: 12,
    origin: 'default', painted: 'true', replayRevision: 1, sessionHoursMode: 'eth',
    sessionRange: 'Session · 05/01/2026, 12:40 PDT → 05/11/2026, 12:40 PDT',
    timeframeId: 'timeframe.display-1-minute',
    visibleThrough: 'Visible through · 05/01/2026, 12:40 PDT · 121 bars', workspaceRevision: 1,
  });
  assert.match(await evaluate(cdp, `document.querySelector('.replay-cursor').textContent`), /05\/01\/2026.*12:40.*PDT/,
    'chart cursor must use the same browser-local clock convention as Session dates');
  const timeframeMenu = await evaluate(cdp, `(() => {
    const toggle = document.querySelector('.timeframe-toggle');
    toggle.click();
    const menu = document.querySelector('.timeframe-menu');
    const enabled = [...menu.querySelectorAll('[role="menuitemradio"]')].map((item) => item.textContent);
    const disabled = [...menu.querySelectorAll('button:disabled')].map((item) => item.textContent);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return { disabled, enabled, expanded: toggle.getAttribute('aria-expanded'), hidden: menu.hidden };
  })()`);
  assert.deepEqual(timeframeMenu, {
    disabled: ['1 day', '1 week', '1 month'],
    enabled: ['1 minute', '2 minutes', '3 minutes', '4 minutes', '5 minutes', '10 minutes', '15 minutes', '30 minutes', '1 hour', '2 hours', '4 hours', '8 hours', '12 hours'],
    expanded: 'false',
    hidden: true,
  });
  await capture(cdp);
  await evaluate(cdp, `document.querySelector('.timeframe-toggle').click()`);
  await capture(cdp, menuVisualFile, 'timeframe menu');
  await evaluate(cdp,
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);

  const startedAt = performance.now();
  await evaluate(cdp, `document.querySelector('.replay-next').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('.chart-state-overlay').hidden`), true,
    'cache-hit advancement must not cover the chart with a stale-state message');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.workspaceRevision === '2'`);
  const cacheHitVisibleMs = performance.now() - startedAt;
  assert.ok(cacheHitVisibleMs < 250, `cache-hit Next exceeded max budget: ${cacheHitVisibleMs}ms`);
  assert.equal(await evaluate(cdp, `Number(document.querySelector('.lightweight-chart-host').dataset.barCount)`), 122,
    'Next bar must reveal exactly one eligible source minute after the Session start bar');
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-visible-through').textContent`),
    'Visible through · 05/01/2026, 12:41 PDT · 122 bars');

  const box = await evaluate(cdp, `(() => {
    const rect = document.querySelector('.lightweight-chart-host').getBoundingClientRect();
    const x = rect.left + rect.width * .62;
    const y = rect.top + rect.height * .5;
    return { x, y };
  })()`);
  assert.ok(box.x > 0 && box.x < 1440 && box.y > 0 && box.y < 900, 'chart drag point must be visible');
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: box.x, y: box.y, button: 'none', buttons: 0,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: box.x, y: box.y, button: 'left', buttons: 1, clickCount: 1,
  });
  for (const delta of [32, 64, 96, 128, 160]) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: box.x - delta, y: box.y, button: 'left', buttons: 1,
    });
  }
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: box.x - 160, y: box.y, button: 'left', buttons: 0, clickCount: 1,
  });
  await waitFor(cdp, `document.querySelector('.lightweight-chart-host')?.dataset.viewportOrigin === 'manual'`);
  const manualBefore = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { offset: Number(host.dataset.latestOffsetBars), span: Number(host.dataset.spanBars) };
  })()`);
  assert.notEqual(manualBefore.offset, 8, 'native drag must create a distinct manual wall');

  const cursorBeforeReplacement = await evaluate(cdp, `document.querySelector('.replay-cursor').textContent`);
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-5-minute"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.workspaceRevision === '3'`);
  const timeframeAfter = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return {
      barCount: Number(host.dataset.barCount), cursor: document.querySelector('.replay-cursor').textContent,
      offset: Number(host.dataset.latestOffsetBars), origin: host.dataset.viewportOrigin,
      span: Number(host.dataset.spanBars), wall: document.querySelector('.replay-wall-status').textContent,
      checked: document.querySelector('.timeframe-menu [data-timeframe-id="timeframe.display-5-minute"]').getAttribute('aria-checked'),
      timeframeId: document.querySelector('.replay-workspace').dataset.timeframeId,
    };
  })()`);
  assert.equal(timeframeAfter.barCount, 25);
  assert.equal(timeframeAfter.cursor, cursorBeforeReplacement, 'timeframe replacement must retain cursor');
  assert.equal(timeframeAfter.origin, 'manual');
  assert.equal(timeframeAfter.wall, 'Manual wall');
  assert.equal(timeframeAfter.checked, 'true');
  assert.equal(timeframeAfter.timeframeId, 'timeframe.display-5-minute');
  assert.ok(Math.abs(timeframeAfter.offset - manualBefore.offset) < 0.001);
  assert.ok(Math.abs(timeframeAfter.span - manualBefore.span) < 0.001);

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('.chart-state-overlay').hidden`), true,
    'Session Hours replacement must preserve the accepted chart without a centered overlay');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.workspaceRevision === '4'`);
  const sessionAfter = await evaluate(cdp, `(() => ({
    barCount: Number(document.querySelector('.lightweight-chart-host').dataset.barCount),
    cursor: document.querySelector('.replay-cursor').textContent,
    mode: document.querySelector('.replay-workspace').dataset.sessionHoursMode,
    pressed: document.querySelector('.session-hours-control [data-value="rth"]').getAttribute('aria-pressed'),
  }))()`);
  assert.deepEqual(sessionAfter, { barCount: 25, cursor: cursorBeforeReplacement, mode: 'rth', pressed: 'true' });

  await evaluate(cdp, `document.querySelector('.replay-next').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.workspaceRevision === '5'`);
  const manualAfter = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { offset: Number(host.dataset.latestOffsetBars), origin: host.dataset.viewportOrigin,
      span: Number(host.dataset.spanBars), wall: document.querySelector('.replay-wall-status').textContent };
  })()`);
  assert.equal(manualAfter.origin, 'manual');
  assert.equal(manualAfter.wall, 'Manual wall');
  assert.ok(Math.abs(manualAfter.offset - manualBefore.offset) < 0.001);
  assert.ok(Math.abs(manualAfter.span - manualBefore.span) < 0.001);

  await evaluate(cdp, `document.querySelector('.replay-reset').click()`);
  await waitFor(cdp, `document.querySelector('.lightweight-chart-host')?.dataset.viewportOrigin === 'default'`);
  assert.equal(await evaluate(cdp, `Number(document.querySelector('.lightweight-chart-host').dataset.latestOffsetBars)`), 12);

  const historyBefore = await evaluate(cdp, `(() => ({
    bars: Number(document.querySelector('.lightweight-chart-host').dataset.barCount),
    cursor: document.querySelector('.replay-cursor').textContent,
    visible: document.querySelector('.replay-visible-through').textContent,
    revision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision),
  }))()`);
  const historyBox = await evaluate(cdp, `(() => {
    const rect = document.querySelector('.lightweight-chart-host').getBoundingClientRect();
    return { x: rect.left + rect.width * .35, y: rect.top + rect.height * .5, right: rect.right - 12 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: historyBox.x, y: historyBox.y, button: 'none', buttons: 0,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: historyBox.x, y: historyBox.y, button: 'left', buttons: 1, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: historyBox.right, y: historyBox.y, button: 'left', buttons: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: historyBox.right, y: historyBox.y, button: 'left', buttons: 0, clickCount: 1,
  });
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${historyBefore.revision}`);
  const historyAfter = await evaluate(cdp, `(() => ({
    bars: Number(document.querySelector('.lightweight-chart-host').dataset.barCount),
    cursor: document.querySelector('.replay-cursor').textContent,
    visible: document.querySelector('.replay-visible-through').textContent,
  }))()`);
  assert.ok(historyAfter.bars > historyBefore.bars, 'dragging to the loaded left boundary must prepend older bars');
  assert.equal(historyAfter.cursor, historyBefore.cursor, 'left extension must not move Replay');
  assert.match(historyAfter.visible, /05\/01\/2026, 12:42 PDT/,
    'left extension must preserve the accepted no-future boundary');

  const firstHistoryRevision = await evaluate(cdp,
    `Number(document.querySelector('.replay-workspace').dataset.workspaceRevision)`);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: historyBox.x, y: historyBox.y, button: 'none', buttons: 0,
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: historyBox.x, y: historyBox.y, button: 'left', buttons: 1, clickCount: 1,
    });
    for (const ratio of [.2, .4, .6, .8, 1]) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', x: historyBox.x + ((historyBox.right - historyBox.x) * ratio),
        y: historyBox.y, button: 'left', buttons: 1,
      });
    }
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: historyBox.right, y: historyBox.y, button: 'left', buttons: 0, clickCount: 1,
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  await waitFor(cdp,
    `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${firstHistoryRevision}`);
  const repeatedHistory = await evaluate(cdp, `(() => ({
    bars: Number(document.querySelector('.lightweight-chart-host').dataset.barCount),
    cursor: document.querySelector('.replay-cursor').textContent,
  }))()`);
  assert.ok(repeatedHistory.bars > historyAfter.bars,
    'returning to the next loaded left boundary must extend history again');
  assert.equal(repeatedHistory.cursor, historyBefore.cursor,
    'repeated left extension must remain Replay-safe');
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
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => setTimeout(resolve, 200));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 50,
  });
}

console.log('v7 Replay Workspace browser harness passed (real chart, compact controls, atomic replacements, walls)');
