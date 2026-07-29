import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createFoundationMarket } from '../src/replay-workspace-ui/foundation-market.js';
import { createRefreshFeedback } from '../src/replay-workspace-ui/refresh-feedback.js';
import { createSourceBatchLedger } from '../src/replay-workspace-ui/source-batch-ledger.js';
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
const sourceWindow = (windowStartEpochMs, windowEndEpochMs, requestKey = null) => Object.freeze({
  request: Object.freeze({ windowEndEpochMs, windowStartEpochMs }),
  requestKey,
});
const sourceLedger = createSourceBatchLedger();
const firstWindow = sourceWindow(100, 200, 'accepted-forward-window');
sourceLedger.stage(firstWindow, 'chart-entry');
sourceLedger.accept();
assert.equal(sourceLedger.acceptedBatch('accepted-forward-window'), firstWindow,
  'an accepted exact source identity remains reusable independently of the Bar Data LRU');
assert.equal(sourceLedger.acceptedBatch('not-accepted'), null);
const earlierWindow = sourceWindow(0, 100);
sourceLedger.stage(earlierWindow, 'history-extension');
sourceLedger.accept();
const overlappingReplacement = sourceWindow(150, 300);
assert.deepEqual(sourceLedger.stage(overlappingReplacement, 'timeframe-replacement'), [
  overlappingReplacement,
], 'replacement must drop old windows that would leave an internal coverage gap');
sourceLedger.reject();
const adjacentReplacement = sourceWindow(100, 300);
assert.deepEqual(sourceLedger.stage(adjacentReplacement, 'session-hours-replacement'), [
  earlierWindow, adjacentReplacement,
], 'replacement may retain only the contiguous accepted prefix ending at its exact start');
sourceLedger.reject();
const feedbackTrace = [];
let delayedFeedback = null;
const feedback = createRefreshFeedback({
  clearTimer: () => { delayedFeedback = null; },
  setTimer: (callback, delay) => { delayedFeedback = { callback, delay }; return 1; },
  view: {
    setPending: (value) => feedbackTrace.push(`pending:${value}`),
    setState: (value) => feedbackTrace.push(`state:${value}`),
  },
});
const fastFeedbackToken = feedback.begin();
assert.equal(delayedFeedback, null, 'cache-hit/Next feedback must schedule no visual state');
feedback.finish(fastFeedbackToken);
const slowFeedbackToken = feedback.begin({ allowDim: true });
assert.equal(delayedFeedback.delay, 500);
delayedFeedback.callback();
feedback.finish(slowFeedbackToken);
assert.deepEqual(feedbackTrace, [
  'pending:true', 'pending:false', 'pending:true', 'state:stale', 'pending:false',
]);
feedback.dispose();
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
assert.ok(weekendPlan.request.windowEndEpochMs >= Date.parse('2026-05-03T22:01:00Z'));
assert.ok(
  weekendPlan.request.windowEndEpochMs - Date.parse('2026-05-03T22:01:00Z') < 500 * 60_000,
  'eligible-gap traversal may add only one bounded forward-buffer remainder',
);
const rthOneMinute = fridayMarket.catalog.get({
  instrumentId: fridayMarket.defaultTarget.instrumentId,
  sessionHoursMode: 'rth',
  timeframeId: fridayMarket.defaultTarget.timeframeId,
});
assert.equal(
  fridayMarket.requestBefore(Date.parse('2026-04-28T13:30:00Z'), rthOneMinute).windowStartEpochMs,
  Date.parse('2026-04-27T16:15:00Z'),
  'one RTH history request at 09:30 must cross the overnight close and include 240 prior eligible minutes',
);
assert.equal(
  fridayMarket.requestBefore(Date.parse('2026-05-04T13:30:00Z'), rthOneMinute).windowStartEpochMs,
  Date.parse('2026-05-01T16:15:00Z'),
  'one RTH history request at Monday 09:30 must cross the weekend without repeated empty loads',
);
const premarketStart = Date.parse('2026-05-01T09:47:00Z');
const premarketMarket = createFoundationMarket({
  configuration: { historicalRange: {
    startEpochMs: premarketStart,
    endEpochMs: Date.parse('2026-05-31T09:48:00Z'),
  } },
});
const premarketRthOneMinute = premarketMarket.catalog.get({
  instrumentId: premarketMarket.defaultTarget.instrumentId,
  sessionHoursMode: 'rth',
  timeframeId: premarketMarket.defaultTarget.timeframeId,
});
assert.equal(
  premarketMarket.requestThrough(premarketStart + 60_000, premarketRthOneMinute)
    .windowStartEpochMs,
  Date.parse('2026-04-30T16:15:00Z'),
  'premarket RTH materialization must warm from the prior eligible Session instead of future bars',
);
premarketMarket.dispose();
const nearTimeLocationRequest = fridayMarket.requestForTimeLocation(
  Date.parse('2026-05-04T13:30:00Z'),
  Date.parse('2026-04-20T13:30:00Z'),
  rthOneMinute,
);
assert.ok(nearTimeLocationRequest.windowStartEpochMs <= Date.parse('2026-04-20T13:30:00Z'),
  'one target-aware request must reach a nearby explicitly selected market time');
assert.equal(nearTimeLocationRequest.windowEndEpochMs, Date.parse('2026-05-04T13:30:00Z'));
const farTimeLocationRequest = fridayMarket.requestForTimeLocation(
  Date.parse('2026-05-04T13:30:00Z'),
  Date.parse('2026-02-01T13:30:00Z'),
  rthOneMinute,
);
assert.equal(
  farTimeLocationRequest.windowStartEpochMs,
  Date.parse('2026-03-30T13:30:00Z'),
  'a far target must extend one bounded 35-day contiguous window per transaction',
);
fridayMarket.dispose();
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
  await evaluate(cdp, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
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
let latencySummary = null;
let replacementLatencyEvidence = null;
let rapidHistoryLatencyEvidence = null;
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
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'NQ Morning Replay';
    form.querySelectorAll('[name="instrument"]')[0].checked = true;
    form.elements.start.value = '2026-05-01T12:40';
    form.elements.end.value = '2026-05-11T12:40';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`);
  assert.match(await evaluate(cdp, `location.hash`), /^#\/session\/session-/,
    'successful Create Session must navigate directly to the new chart route');

  const entry = await evaluate(cdp, `(() => {
    const root = document.querySelector('.replay-workspace');
    const host = document.querySelector('.lightweight-chart-host');
    const chartFrame = document.querySelector('.chart-frame').getBoundingClientRect();
    const footer = document.querySelector('.replay-workspace-footer').getBoundingClientRect();
    const transport = document.querySelector('.replay-transport').getBoundingClientRect();
    const workspace = root.getBoundingClientRect();
    return {
      autoplaySpeedId: root.dataset.autoplaySpeedId,
      barCount: Number(host.dataset.barCount),
      backHeight: document.querySelector('.replay-back').getBoundingClientRect().height,
      buttonHeight: document.querySelector('.replay-next').getBoundingClientRect().height,
      controlHeight: document.querySelector('.workspace-choice').getBoundingClientRect().height,
      canvasCount: host.querySelectorAll('canvas').length,
      chartHeight: host.getBoundingClientRect().height,
      chartWidth: host.getBoundingClientRect().width,
      footerHeight: footer.height,
      footerStartsAfterChart: footer.top >= chartFrame.bottom - 1,
      libraryVersion: host.dataset.libraryVersion,
      mutationMode: host.dataset.lastMutationMode,
      offset: Number(host.dataset.latestOffsetBars),
      origin: host.dataset.viewportOrigin,
      painted: host.dataset.painted,
      routeHeaderMissing: !document.querySelector('.opened-header'),
      replayRevision: Number(root.dataset.replayRevision),
      sessionHoursMode: root.dataset.sessionHoursMode,
      sessionRange: document.querySelector('.replay-session-range').textContent,
      timeframeId: root.dataset.timeframeId,
      toolbarHeight: document.querySelector('.replay-workspace-toolbar').getBoundingClientRect().height,
      topTransportControls: document.querySelector('.replay-workspace-toolbar')
        .querySelectorAll('.replay-next, .replay-previous, .replay-playback, .replay-step-select, .replay-speed-select').length,
      transportCentered: Math.abs((transport.left + transport.width / 2)
        - (workspace.left + workspace.width / 2)) < 1,
      transportHeight: transport.height,
      transportParent: document.querySelector('.replay-transport').parentElement.className,
      timeframeSyncAccessibleName: document.querySelector('.replay-timeframe-sync input').ariaLabel,
      timeframeSyncVisibleText: document.querySelector('.replay-timeframe-sync').textContent.trim(),
      transportSelectAppearance: getComputedStyle(document.querySelector('.replay-step-select')).appearance,
      transportSelectOrder: [...document.querySelectorAll('.replay-transport-select')]
        .map((control) => control.classList.contains('replay-speed-select') ? 'speed' : 'step'),
      visibleThrough: document.querySelector('.replay-visible-through').textContent,
      workspaceRevision: Number(root.dataset.workspaceRevision),
    };
  })()`);
  assert.ok(entry.canvasCount > 0, 'real chart must own painted canvases');
  delete entry.canvasCount;
  assert.ok(entry.chartWidth >= 1100, `chart must fill available desktop width: ${entry.chartWidth}px`);
  assert.ok(entry.chartHeight >= 800, `chart must maximize available desktop height: ${entry.chartHeight}px`);
  assert.ok(entry.toolbarHeight <= 38, `merged toolbar must remain compact: ${entry.toolbarHeight}px`);
  assert.ok(entry.footerHeight <= 38, `fixed Replay rail must remain compact: ${entry.footerHeight}px`);
  assert.ok(entry.transportHeight <= 32, `Replay capsule must remain compact: ${entry.transportHeight}px`);
  assert.ok(entry.backHeight <= 30, `merged back action must remain compact: ${entry.backHeight}px`);
  assert.ok(entry.buttonHeight <= 32, `replay actions must remain compact: ${entry.buttonHeight}px`);
  assert.ok(entry.controlHeight <= 26, `workspace selectors must remain compact: ${entry.controlHeight}px`);
  delete entry.chartWidth;
  delete entry.chartHeight;
  delete entry.buttonHeight;
  delete entry.backHeight;
  delete entry.controlHeight;
  delete entry.toolbarHeight;
  delete entry.footerHeight;
  delete entry.transportHeight;
  assert.deepEqual(entry, {
    autoplaySpeedId: 'autoplay-speed-1x', barCount: 121,
    footerStartsAfterChart: true, libraryVersion: '5.2.0', mutationMode: 'full-replace', offset: 12,
    origin: 'default', painted: 'true', replayRevision: 1, sessionHoursMode: 'eth',
    routeHeaderMissing: true,
    sessionRange: 'Session · 05/01/2026, 12:40 EDT → 05/11/2026, 12:40 EDT',
    timeframeId: 'timeframe.display-1-minute', topTransportControls: 0,
    transportCentered: true, transportParent: 'replay-workspace-footer',
    timeframeSyncAccessibleName: 'Sync timeframe', timeframeSyncVisibleText: '',
    transportSelectAppearance: 'none', transportSelectOrder: ['speed', 'step'],
    visibleThrough: 'Visible through · 05/01/2026, 12:40 EDT · 121 bars', workspaceRevision: 1,
  });
  assert.match(await evaluate(cdp, `document.querySelector('.replay-workspace').dataset.cursorText`), /05\/01\/2026.*12:40.*EDT/,
    'chart cursor must use the Session New York exchange clock convention');
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
  const providerRequestsAtEntry = await evaluate(cdp,
    `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`);
  await evaluate(cdp, `(() => {
    const root = document.querySelector('.replay-workspace');
    const toolbar = document.querySelector('.replay-workspace-toolbar');
    const transport = document.querySelector('.replay-transport');
    const selectors = ['.replay-next', '.replay-previous', '.timeframe-toggle',
      '.session-hours-control [aria-pressed="true"]', '.pane-layout-toggle',
      '.replay-step-select', '.replay-speed-select', '.goto-toggle'];
    const sample = () => selectors.map((selector) => {
      const control = root.querySelector(selector);
      return { opacity: getComputedStyle(control).opacity, selector };
    });
    const probe = { initial: sample(), records: [], toolbar, transport };
    probe.observer = new MutationObserver(() => probe.records.push(sample()));
    probe.observer.observe(root, { attributes: true, attributeFilter: ['disabled'], subtree: true });
    globalThis.__toolbarRefreshProbe = probe;
  })()`);
  await evaluate(cdp, `document.querySelector('.replay-next').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('.workspace-inline-status').hidden`), true,
    'cache-hit Next must not flash toolbar update status');
  assert.equal(await evaluate(cdp, `document.querySelector('.chart-state-overlay').hidden`), true,
    'cache-hit advancement must not cover the chart with a stale-state message');
  try {
    await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.workspaceRevision === '2'`);
  } catch (error) {
    const nextFailure = await evaluate(cdp, `(() => {
      const root = document.querySelector('.replay-workspace');
      return { browserErrors: globalThis.__browserErrors, state: root?.dataset.viewState,
        status: document.querySelector('.workspace-inline-status')?.textContent,
        adapterError: document.querySelector('.lightweight-chart-host')?.dataset.lastApplyError };
    })()`);
    throw new Error(`${error.message}; next failure: ${JSON.stringify(nextFailure)}`);
  }
  const toolbarRefreshProbe = await evaluate(cdp, `(() => {
    const probe = globalThis.__toolbarRefreshProbe;
    probe.observer.disconnect();
    return {
      initial: probe.initial,
      records: probe.records,
      sameNode: probe.toolbar === document.querySelector('.replay-workspace-toolbar'),
      sameTransport: probe.transport === document.querySelector('.replay-transport'),
    };
  })()`);
  assert.equal(toolbarRefreshProbe.sameNode, true, 'candle refresh must retain the toolbar DOM node');
  assert.equal(toolbarRefreshProbe.sameTransport, true, 'candle refresh must retain the Replay transport DOM node');
  assert.ok(toolbarRefreshProbe.records.length >= 1, 'toolbar probe must observe the transient input lock');
  for (const record of toolbarRefreshProbe.records) assert.deepEqual(record, toolbarRefreshProbe.initial,
    `transient input locking must not flash toolbar opacity: ${JSON.stringify(toolbarRefreshProbe)}`);
  const cacheHitVisibleMs = performance.now() - startedAt;
  assert.ok(cacheHitVisibleMs < 250, `cache-hit Next exceeded max budget: ${cacheHitVisibleMs}ms`);
  assert.equal(await evaluate(cdp, `Number(document.querySelector('.lightweight-chart-host').dataset.barCount)`), 122,
    'Next bar must reveal exactly one eligible source minute after the Session start bar');
  assert.equal(await evaluate(cdp, `document.querySelector('.lightweight-chart-host').dataset.lastMutationMode`),
    'tail-update', 'cache-hit 1m Next must use the adapter tail-update path');
  assert.equal(await evaluate(cdp,
    `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`),
    providerRequestsAtEntry, 'buffered cache-hit Next must not issue another provider request');
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-visible-through').textContent`),
    'Visible through · 05/01/2026, 12:41 EDT · 122 bars');

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

  const cursorBeforeReplacement = await evaluate(cdp, `document.querySelector('.replay-workspace').dataset.cursorText`);
  const timeframeStartedAt = performance.now();
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-5-minute"]').click();
  })()`);
  assert.deepEqual(await evaluate(cdp, `(() => ({
    state: document.querySelector('.replay-workspace').dataset.viewState,
    statusHidden: document.querySelector('.workspace-inline-status').hidden,
  }))()`), { state: 'ready', statusHidden: true },
  'cache-hit TF replacement must settle before delayed dim feedback');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.workspaceRevision === '3'`);
  const timeframeVisibleMs = performance.now() - timeframeStartedAt;
  const timeframeAfter = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return {
      barCount: Number(host.dataset.barCount), cursor: document.querySelector('.replay-workspace').dataset.cursorText,
      latestDisplayEpochMs: Number(host.dataset.latestDisplayEpochMs),
      offset: Number(host.dataset.latestOffsetBars), origin: host.dataset.viewportOrigin,
      span: Number(host.dataset.spanBars), wall: document.querySelector('.replay-workspace').dataset.wallOrigin,
      checked: document.querySelector('.timeframe-menu [data-timeframe-id="timeframe.display-5-minute"]').getAttribute('aria-checked'),
      timeframeId: document.querySelector('.replay-workspace').dataset.timeframeId,
    };
  })()`);
  assert.ok(timeframeAfter.barCount >= 200,
    'timeframe replacement must proactively include enough left history for the target display');
  assert.ok(timeframeVisibleMs < 400, `bounded timeframe switch exceeded max budget: ${timeframeVisibleMs}ms`);
  assert.equal(await evaluate(cdp, `document.querySelector('.lightweight-chart-host').dataset.lastMutationMode`),
    'full-replace', 'timeframe replacement must remain one complete series mutation');
  const providerRequestsAfterTimeframe = await evaluate(cdp,
    `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`);
  assert.equal(providerRequestsAfterTimeframe, providerRequestsAtEntry + 1,
    'first target-history expansion must use one bounded provider request');
  assert.equal(
    new Date(timeframeAfter.latestDisplayEpochMs).toLocaleTimeString('en-US', {
      hour: '2-digit', hour12: false, minute: '2-digit', timeZone: 'America/New_York',
    }),
    '12:44',
    'partial 5m candle must display at its completion minute without moving Replay',
  );
  assert.equal(timeframeAfter.cursor, cursorBeforeReplacement, 'timeframe replacement must retain cursor');
  assert.equal(timeframeAfter.origin, 'manual');
  assert.equal(timeframeAfter.wall, 'manual');
  assert.equal(timeframeAfter.checked, 'true');
  assert.equal(timeframeAfter.timeframeId, 'timeframe.display-5-minute');
  assert.ok(Math.abs(timeframeAfter.offset - manualBefore.offset) < 0.001);
  assert.ok(Math.abs(timeframeAfter.span - manualBefore.span) < 0.001);

  const sessionHoursStartedAt = performance.now();
  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('.chart-state-overlay').hidden`), true,
    'Session Hours replacement must preserve the accepted chart without a centered overlay');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.workspaceRevision === '4'`);
  const sessionHoursVisibleMs = performance.now() - sessionHoursStartedAt;
  const sessionAfter = await evaluate(cdp, `(() => ({
    barCount: Number(document.querySelector('.lightweight-chart-host').dataset.barCount),
    cursor: document.querySelector('.replay-workspace').dataset.cursorText,
    mode: document.querySelector('.replay-workspace').dataset.sessionHoursMode,
    pressed: document.querySelector('.session-hours-control [data-value="rth"]').getAttribute('aria-pressed'),
  }))()`);
  assert.ok(sessionAfter.barCount >= 24, 'RTH replacement must retain useful bounded left history');
  assert.equal(sessionAfter.cursor, cursorBeforeReplacement);
  assert.equal(sessionAfter.mode, 'rth');
  assert.equal(sessionAfter.pressed, 'true');
  assert.ok(sessionHoursVisibleMs < 400,
    `cache-hit ETH→RTH replacement exceeded max budget: ${sessionHoursVisibleMs}ms`);

  const aggregateNextStartedAt = performance.now();
  await evaluate(cdp, `document.querySelector('.replay-next').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.workspaceRevision === '5'`);
  const aggregateNextVisibleMs = performance.now() - aggregateNextStartedAt;
  const manualAfter = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { offset: Number(host.dataset.latestOffsetBars), origin: host.dataset.viewportOrigin,
      span: Number(host.dataset.spanBars), wall: document.querySelector('.replay-workspace').dataset.wallOrigin };
  })()`);
  assert.equal(manualAfter.origin, 'manual');
  assert.ok(aggregateNextVisibleMs < 250,
    `cache-hit aggregate Next exceeded max budget: ${aggregateNextVisibleMs}ms`);
  assert.equal(await evaluate(cdp, `document.querySelector('.lightweight-chart-host').dataset.lastMutationMode`),
    'tail-update', 'aggregate Next must update only the active or newly appended candle');
  assert.equal(await evaluate(cdp,
    `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`),
    providerRequestsAfterTimeframe, 'cache-hit aggregate Next must not issue another provider request');
  assert.equal(manualAfter.wall, 'manual');
  assert.ok(Math.abs(manualAfter.offset - manualBefore.offset) < 0.001);
  assert.ok(Math.abs(manualAfter.span - manualBefore.span) < 0.001);

  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-main"] .pane-reset').click()`);
  await waitFor(cdp, `document.querySelector('.lightweight-chart-host')?.dataset.viewportOrigin === 'default'`);
  assert.equal(await evaluate(cdp, `Number(document.querySelector('.lightweight-chart-host').dataset.latestOffsetBars)`), 12);

  const highTimeframeRevision = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  const highTimeframeStartedAt = performance.now();
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-12-hour"]').click();
  })()`);
  try {
    await waitFor(cdp, `(() => {
      const root = document.querySelector('.replay-workspace');
      const host = document.querySelector('.lightweight-chart-host');
      return Number(root?.dataset.workspaceRevision) > ${highTimeframeRevision};
    })()`, 10_000);
  } catch (error) {
    const highTimeframeFailure = await evaluate(cdp, `(() => {
      const root = document.querySelector('.replay-workspace');
      const host = document.querySelector('.lightweight-chart-host');
      return { busy: root?.getAttribute('aria-busy'), barCount: Number(host?.dataset.barCount),
        revision: Number(root?.dataset.workspaceRevision), state: root?.dataset.viewState,
        status: document.querySelector('.workspace-inline-status')?.textContent,
        timeframeId: root?.dataset.timeframeId };
    })()`);
    throw new Error(`${error.message}; 12h evidence: ${JSON.stringify(highTimeframeFailure)}`);
  }
  const highTimeframeVisibleMs = performance.now() - highTimeframeStartedAt;
  const highTimeframeAfter = await evaluate(cdp, `(() => {
    const root = document.querySelector('.replay-workspace');
    const host = document.querySelector('.lightweight-chart-host');
    return {
      barCount: Number(host.dataset.barCount), latestDisplayEpochMs: Number(host.dataset.latestDisplayEpochMs),
      logicalFrom: Number(host.dataset.logicalFrom), revision: Number(root.dataset.workspaceRevision),
      timeframeId: root.dataset.timeframeId,
    };
  })()`);
  assert.ok(highTimeframeVisibleMs < 3_000,
    `12h RTH replacement/history fill exceeded max budget: ${highTimeframeVisibleMs}ms`);
  assert.ok(highTimeframeAfter.barCount >= 24,
    `12h RTH replacement must provide useful bounded history: ${JSON.stringify(highTimeframeAfter)}`);
  assert.ok(highTimeframeAfter.logicalFrom >= -0.5,
    `high-timeframe replacement must not leave an empty left margin: ${JSON.stringify(highTimeframeAfter)}`);
  assert.equal(highTimeframeAfter.timeframeId, 'timeframe.display-12-hour');
  assert.equal(new Date(highTimeframeAfter.latestDisplayEpochMs).toLocaleTimeString('en-US', {
    hour: '2-digit', hour12: false, minute: '2-digit', timeZone: 'America/New_York',
  }).endsWith(':59'), true, 'RTH hour-family completion slots must use the shared :59 grid');
  replacementLatencyEvidence = Object.freeze({
    ethToRthMs: sessionHoursVisibleMs,
    fiveMinuteMs: timeframeVisibleMs,
    twelveHourRthMs: highTimeframeVisibleMs,
  });

  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-4-minute"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.timeframeId === 'timeframe.display-4-minute'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);
  const rthFourMinuteDisplay = Number(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.latestDisplayEpochMs`));
  assert.equal(Number(new Intl.DateTimeFormat('en-US', {
    minute: '2-digit', timeZone: 'America/New_York',
  }).format(new Date(rthFourMinuteDisplay))) % 4, 3,
  'RTH 4m completion slots must use the shared :03/:07/:11/... grid');

  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-1-minute"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.timeframeId === 'timeframe.display-1-minute'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);
  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="eth"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'eth'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);

  const historyBefore = await evaluate(cdp, `(() => ({
    bars: Number(document.querySelector('.lightweight-chart-host').dataset.barCount),
    cursor: document.querySelector('.replay-workspace').dataset.cursorText,
    visible: document.querySelector('.replay-visible-through').textContent,
    revision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision),
  }))()`);
  const historyBox = await evaluate(cdp, `(() => {
    const rect = document.querySelector('.lightweight-chart-host').getBoundingClientRect();
    return { x: rect.left + rect.width * .35, y: rect.top + rect.height * .5, right: rect.right - 12 };
  })()`);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: historyBox.x, y: historyBox.y, button: 'none', buttons: 0,
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: historyBox.x, y: historyBox.y, button: 'left', buttons: 1, clickCount: 1,
    });
    for (const ratio of [.1, .2, .3, .4, .5, .6, .7, .8, .9, 1]) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', x: historyBox.x + ((historyBox.right - historyBox.x) * ratio),
        y: historyBox.y, button: 'left', buttons: 1,
      });
    }
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: historyBox.right, y: historyBox.y, button: 'left', buttons: 0, clickCount: 1,
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const revision = await evaluate(cdp,
      `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision)`);
    if (revision > historyBefore.revision) break;
  }
  await waitFor(cdp,
    `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${historyBefore.revision}`,
    10_000);
  const historyDragEvidence = await evaluate(cdp, `(() => ({
    logicalFrom: Number(document.querySelector('.lightweight-chart-host').dataset.logicalFrom),
    revision: Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision),
  }))()`);
  assert.ok(historyDragEvidence.revision > historyBefore.revision,
    `dragging must trigger left history: ${JSON.stringify(historyDragEvidence)}`);
  const historyAfter = await evaluate(cdp, `(() => ({
    bars: Number(document.querySelector('.lightweight-chart-host').dataset.barCount),
    cursor: document.querySelector('.replay-workspace').dataset.cursorText,
    visible: document.querySelector('.replay-visible-through').textContent,
  }))()`);
  assert.ok(historyAfter.bars > historyBefore.bars, 'dragging to the loaded left boundary must prepend older bars');
  assert.equal(historyAfter.cursor, historyBefore.cursor, 'left extension must not move Replay');
  assert.match(historyAfter.visible, /05\/01\/2026, 12:42 EDT/,
    'left extension must preserve the accepted no-future boundary');

  const firstHistoryRevision = await evaluate(cdp,
    `Number(document.querySelector('.replay-workspace').dataset.workspaceRevision)`);
  for (let attempt = 0; attempt < 12; attempt += 1) {
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
    cursor: document.querySelector('.replay-workspace').dataset.cursorText,
  }))()`);
  assert.ok(repeatedHistory.bars > historyAfter.bars,
    'returning to the next loaded left boundary must extend history again');
  assert.equal(repeatedHistory.cursor, historyBefore.cursor,
    'repeated left extension must remain Replay-safe');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);

  const continuityRevision = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-1-hour"]').click();
  })()`);
  try {
    await waitFor(cdp,
      `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${continuityRevision}`,
      10_000);
  } catch (error) {
    const continuityFailure = await evaluate(cdp, `(() => {
      const root = document.querySelector('.replay-workspace');
      const option = document.querySelector('[data-timeframe-id="timeframe.display-1-hour"]');
      return { busy: root?.getAttribute('aria-busy'), buttonDisabled: option?.disabled,
        adapterError: document.querySelector('.lightweight-chart-host')?.dataset.lastApplyError,
        browserErrors: globalThis.__browserErrors, revision: Number(root?.dataset.workspaceRevision),
        state: root?.dataset.viewState, status: document.querySelector('.workspace-inline-status')?.textContent,
        timeframeId: root?.dataset.timeframeId };
    })()`);
    throw new Error(`${error.message}; history→1h evidence: ${JSON.stringify(continuityFailure)}`);
  }
  const oneHourEthContinuity = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { barCount: Number(host.dataset.barCount), latest: Number(host.dataset.latestDisplayEpochMs),
      maximumGapMs: Number(host.dataset.maximumDisplayGapMs),
      state: document.querySelector('.replay-workspace').dataset.viewState };
  })()`);
  assert.equal(oneHourEthContinuity.state, 'ready');
  assert.ok(oneHourEthContinuity.barCount >= 160,
    `history→1h replacement must retain useful continuous context: ${JSON.stringify(oneHourEthContinuity)}`);
  assert.ok(oneHourEthContinuity.latest >= Date.parse('2026-05-01T16:42:00Z'),
    `history→1h replacement must extend through the Replay-visible tail: ${JSON.stringify(oneHourEthContinuity)}`);
  assert.ok(oneHourEthContinuity.maximumGapMs < 4 * 24 * 60 * 60_000,
    `history→1h replacement must not expose a multi-day internal hole: ${JSON.stringify(oneHourEthContinuity)}`);

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'rth'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);
  assert.ok(Number(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.maximumDisplayGapMs`)) < 4 * 24 * 60 * 60_000,
  '1h ETH→RTH replacement must not create a multi-day internal hole');
  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="eth"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'eth'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);
  assert.ok(Number(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.maximumDisplayGapMs`)) < 4 * 24 * 60 * 60_000,
  '1h RTH→ETH replacement must not create a multi-day internal hole');

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'rth'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);

  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-4-hour"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.timeframeId === 'timeframe.display-4-hour'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  const denseRevisionBefore = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  const denseBarsBefore = Number(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.barCount`));
  const denseStartedAt = performance.now();
  const denseSpanBefore = Number(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.spanBars`));
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: historyBox.x, y: historyBox.y, deltaX: 0, deltaY: 300,
    });
    await new Promise((resolve) => setTimeout(resolve, 35));
    const span = Number(await evaluate(cdp,
      `document.querySelector('.lightweight-chart-host').dataset.spanBars`));
    if (span >= 240) break;
  }
  await waitFor(cdp,
    `Number(document.querySelector('.lightweight-chart-host')?.dataset.spanBars) >= 900`,
    3_000);
  const denseTriggeredRange = await evaluate(cdp, `(() => ({
    from: Number(document.querySelector('.lightweight-chart-host').dataset.logicalFrom),
    to: Number(document.querySelector('.lightweight-chart-host').dataset.logicalTo),
  }))()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 15_000);
  const denseSpan = Number(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.spanBars`));
  const denseFillEvidence = await evaluate(cdp, `(() => ({
    barCount: Number(document.querySelector('.lightweight-chart-host').dataset.barCount),
    from: Number(document.querySelector('.lightweight-chart-host').dataset.logicalFrom),
    revision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision),
  }))()`);
  denseFillEvidence.elapsedMs = performance.now() - denseStartedAt;
  assert.ok(denseSpan >= 900 && denseSpan > denseSpanBefore,
    `single-fill gate must use a genuinely dense native wall: ${JSON.stringify({ denseSpan, denseSpanBefore })}`);
  assert.ok(denseTriggeredRange.from < -500,
    `dense gate must expose a screenshot-scale left gap: ${JSON.stringify(denseTriggeredRange)}`);
  assert.equal(denseFillEvidence.revision - denseRevisionBefore, 1,
    `one dense zoom gesture must produce one visible commit: ${JSON.stringify(denseFillEvidence)}`);
  assert.ok(denseFillEvidence.barCount > denseBarsBefore && denseFillEvidence.from >= 0,
    `one projected-history response must fill the complete Canvas edge: ${JSON.stringify(denseFillEvidence)}`);
  const denseReplacementCaptureCount = Number(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.historyBoundaryCaptureCount`));
  const denseReplacementRevision = denseFillEvidence.revision;
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-3-minute"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.timeframeId === 'timeframe.display-3-minute'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 15_000);
  const denseThreeMinuteReplacement = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { barCount: Number(host.dataset.barCount), from: Number(host.dataset.logicalFrom),
      historyBoundaryCaptureCount: Number(host.dataset.historyBoundaryCaptureCount),
      revision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision),
      span: Number(host.dataset.spanBars) };
  })()`);
  assert.equal(denseThreeMinuteReplacement.revision - denseReplacementRevision, 1,
    `dense 3m replacement must fill in its own transaction: ${JSON.stringify(denseThreeMinuteReplacement)}`);
  assert.equal(denseThreeMinuteReplacement.historyBoundaryCaptureCount, denseReplacementCaptureCount,
    'programmatic timeframe replacement must not wait for a native mouse/wheel history trigger');
  assert.ok(denseThreeMinuteReplacement.from >= 24,
    `dense 3m replacement must arrive with its retained Canvas already filled: ${JSON.stringify(denseThreeMinuteReplacement)}`);

  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-4-hour"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.timeframeId === 'timeframe.display-4-hour'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 15_000);
  const denseFourHourReplacement = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { barCount: Number(host.dataset.barCount), from: Number(host.dataset.logicalFrom),
      historyBoundaryCaptureCount: Number(host.dataset.historyBoundaryCaptureCount),
      revision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision),
      span: Number(host.dataset.spanBars) };
  })()`);
  assert.equal(denseFourHourReplacement.revision - denseThreeMinuteReplacement.revision, 1,
    `dense 4h replacement must merge projected context in one transaction: ${JSON.stringify(denseFourHourReplacement)}`);
  assert.equal(denseFourHourReplacement.historyBoundaryCaptureCount, denseReplacementCaptureCount,
    'high-timeframe replacement must not wait for a native mouse/wheel history trigger');
  assert.ok(denseFourHourReplacement.from >= 24,
    `dense 4h replacement must arrive with projected history already filling Canvas: ${JSON.stringify(denseFourHourReplacement)}`);

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="eth"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'eth'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 15_000);
  const denseEthReplacement = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { from: Number(host.dataset.logicalFrom),
      historyBoundaryCaptureCount: Number(host.dataset.historyBoundaryCaptureCount),
      revision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision) };
  })()`);
  assert.equal(denseEthReplacement.revision - denseFourHourReplacement.revision, 1,
    `dense RTH→ETH replacement must fill in its own transaction: ${JSON.stringify(denseEthReplacement)}`);
  assert.equal(denseEthReplacement.historyBoundaryCaptureCount, denseReplacementCaptureCount,
    'dense Session Hours replacement must not wait for a native history trigger');
  assert.ok(denseEthReplacement.from >= 24,
    `dense Session Hours replacement must retain a filled Canvas: ${JSON.stringify(denseEthReplacement)}`);
  const rapidHistoryBox = await evaluate(cdp, `(() => {
    const rect = document.querySelector('.lightweight-chart-host').getBoundingClientRect();
    return { x: rect.left + 12, y: rect.top + rect.height * .5, right: rect.right - 12 };
  })()`);
  async function dragRapidHistory(fraction = 1) {
    const targetX = rapidHistoryBox.x
      + ((rapidHistoryBox.right - rapidHistoryBox.x) * fraction);
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: rapidHistoryBox.x, y: rapidHistoryBox.y, button: 'none', buttons: 0,
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: rapidHistoryBox.x, y: rapidHistoryBox.y,
      button: 'left', buttons: 1, clickCount: 1,
    });
    for (const ratio of [.1, .2, .3, .4, .5, .6, .7, .8, .9, 1]) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', x: rapidHistoryBox.x + ((targetX - rapidHistoryBox.x) * ratio),
        y: rapidHistoryBox.y, button: 'left', buttons: 1,
      });
    }
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: targetX, y: rapidHistoryBox.y,
      button: 'left', buttons: 0, clickCount: 1,
    });
  }
  const preparationRevision = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  let preparedHistoryState;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    preparedHistoryState = await evaluate(cdp, `(() => ({
      from: Number(document.querySelector('.lightweight-chart-host').dataset.logicalFrom),
      revision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision),
    }))()`);
    if (preparedHistoryState.from < 99) break;
    await dragRapidHistory(.03);
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.equal(Number(await evaluate(cdp,
      `document.querySelector('.replay-workspace').dataset.workspaceRevision`)), preparationRevision,
      `dense gate preparation must stop before requesting history: ${JSON.stringify(preparedHistoryState)}`);
  }
  preparedHistoryState = await evaluate(cdp, `(() => ({
    from: Number(document.querySelector('.lightweight-chart-host').dataset.logicalFrom),
    revision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision),
  }))()`);
  assert.equal(preparedHistoryState.revision, preparationRevision);
  assert.ok(preparedHistoryState.from >= 0 && preparedHistoryState.from < 99,
    `dense gate must begin one drag away from history: ${JSON.stringify(preparedHistoryState)}`);
  await evaluate(cdp, `(() => {
    globalThis.__rapidHistorySamples = [];
    globalThis.__rapidHistoryLongTasks = [];
    globalThis.__rapidHistoryOpacities = [];
    globalThis.__rapidHistoryViewStates = [document.querySelector('.replay-workspace').dataset.viewState];
    globalThis.__rapidHistoryStartedAt = performance.now();
    globalThis.__rapidHistoryTimer = setInterval(() => {
      globalThis.__rapidHistorySamples.push(performance.now());
      globalThis.__rapidHistoryOpacities.push(Number(getComputedStyle(
        document.querySelector('.workspace-pane-grid')
      ).opacity));
    }, 16);
    globalThis.__rapidHistoryViewObserver = new MutationObserver(() => {
      globalThis.__rapidHistoryViewStates.push(document.querySelector('.replay-workspace').dataset.viewState);
    });
    globalThis.__rapidHistoryViewObserver.observe(document.querySelector('.replay-workspace'), {
      attributeFilter: ['data-view-state'],
    });
    globalThis.__rapidHistoryObserver = new PerformanceObserver((list) => {
      globalThis.__rapidHistoryLongTasks.push(...list.getEntries().map((entry) => entry.duration));
    });
    globalThis.__rapidHistoryObserver.observe({ entryTypes: ['longtask'] });
  })()`);
  const rapidHistoryRevision = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  const rapidHistoryBars = Number(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.barCount`));
  await dragRapidHistory();
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'true'`, 2_000);
  const triggeredRange = await evaluate(cdp, `(() => ({
    from: Number(document.querySelector('.lightweight-chart-host').dataset.logicalFrom),
    to: Number(document.querySelector('.lightweight-chart-host').dataset.logicalTo),
  }))()`);
  await waitFor(cdp,
    `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${rapidHistoryRevision}`,
    15_000);
  await waitFor(cdp, `Number(document.querySelector('.lightweight-chart-host')?.dataset.logicalFrom) >= 0
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 15_000);
  const rapidHistoryEvidence = await evaluate(cdp, `(() => {
    clearInterval(globalThis.__rapidHistoryTimer);
    globalThis.__rapidHistoryObserver.disconnect();
    globalThis.__rapidHistoryViewObserver.disconnect();
    const intervals = globalThis.__rapidHistorySamples.slice(1).map((value, index) => (
      value - globalThis.__rapidHistorySamples[index]
    ));
    const host = document.querySelector('.lightweight-chart-host');
    return {
      barCount: Number(host.dataset.barCount),
      elapsedMs: performance.now() - globalThis.__rapidHistoryStartedAt,
      from: Number(host.dataset.logicalFrom),
      maxLongTaskMs: Math.max(0, ...globalThis.__rapidHistoryLongTasks),
      maxSampleIntervalMs: Math.max(0, ...intervals),
      minimumCanvasOpacity: Math.min(1, ...globalThis.__rapidHistoryOpacities),
      revisionDelta: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision)
        - ${rapidHistoryRevision},
      to: Number(host.dataset.logicalTo),
      viewStates: globalThis.__rapidHistoryViewStates,
    };
  })()`);
  const prependedBars = rapidHistoryEvidence.barCount - rapidHistoryBars;
  assert.ok(rapidHistoryEvidence.barCount > rapidHistoryBars,
    `rapid high-TF boundary drag must extend history: ${JSON.stringify(rapidHistoryEvidence)}`);
  assert.equal(rapidHistoryEvidence.revisionDelta, 1,
    `one dense drag must produce exactly one visible history commit: ${JSON.stringify(rapidHistoryEvidence)}`);
  assert.ok(Math.abs((rapidHistoryEvidence.from - triggeredRange.from) - prependedBars) < 0.01
    && Math.abs((rapidHistoryEvidence.to - triggeredRange.to) - prependedBars) < 0.01,
  `prepend must retain the exact drag anchor: ${JSON.stringify({ rapidHistoryEvidence, triggeredRange })}`);
  assert.ok(rapidHistoryEvidence.maxLongTaskMs < 200,
    `high-TF history projection must not block the main thread for 200ms: ${JSON.stringify(rapidHistoryEvidence)}`);
  assert.ok(rapidHistoryEvidence.maxSampleIntervalMs < 250,
    `history loading must keep the browser event loop responsive: ${JSON.stringify(rapidHistoryEvidence)}`);
  assert.equal(rapidHistoryEvidence.minimumCanvasOpacity, 1,
    `history extension must keep the accepted Canvas fully opaque: ${JSON.stringify(rapidHistoryEvidence)}`);
  assert.equal(rapidHistoryEvidence.viewStates.includes('stale'), false,
    `history extension must not flash the stale/dim state: ${JSON.stringify(rapidHistoryEvidence)}`);
  rapidHistoryLatencyEvidence = Object.freeze(rapidHistoryEvidence);

  await evaluate(cdp, `location.hash = '#/sessions'`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 1`);
  await evaluate(cdp, `performance.clearResourceTimings(); document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'NQ Aggregate Latency';
    form.querySelectorAll('[name="instrument"]')[0].checked = true;
    form.elements.start.value = '2026-05-04T06:30';
    form.elements.end.value = '2026-05-05T06:30';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`);
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-5-minute"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.workspaceRevision === '2'`);
  const requestsBeforeCadence = await evaluate(cdp,
    `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`);
  let cadenceRevision = 2;
  const cadenceSamples = [];
  const adapterApplySamples = [];
  const adapterMutationSamples = [];
  const adapterPaintSamples = [];
  for (let index = 0; index < 100; index += 1) {
    const cadenceStartedAt = performance.now();
    await evaluate(cdp, `document.querySelector('.replay-next').click()`);
    cadenceRevision += 1;
    await waitFor(cdp,
      `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) === ${cadenceRevision}`);
    cadenceSamples.push(performance.now() - cadenceStartedAt);
    const adapterTiming = await evaluate(cdp, `(() => {
      const host = document.querySelector('.lightweight-chart-host');
      return { applyMs: Number(host.dataset.lastApplyMs), mode: host.dataset.lastMutationMode,
        mutationMs: Number(host.dataset.lastMutationMs), paintMs: Number(host.dataset.lastPaintMs),
        proof: host.dataset.lastPaintProof };
    })()`);
    assert.equal(adapterTiming.mode, 'tail-update');
    assert.equal(adapterTiming.proof, 'series-change-two-frame');
    adapterApplySamples.push(adapterTiming.applyMs);
    adapterMutationSamples.push(adapterTiming.mutationMs);
    adapterPaintSamples.push(adapterTiming.paintMs);
  }
  const sortedCadence = [...cadenceSamples].sort((left, right) => left - right);
  const percentile = (ratio) => sortedCadence[Math.ceil(sortedCadence.length * ratio) - 1];
  const phaseP95 = (samples) => {
    const sorted = [...samples].sort((left, right) => left - right);
    return sorted[Math.ceil(sorted.length * .95) - 1];
  };
  latencySummary = Object.freeze({
    adapterApplyP95Ms: phaseP95(adapterApplySamples),
    adapterMutationP95Ms: phaseP95(adapterMutationSamples),
    adapterPaintP95Ms: phaseP95(adapterPaintSamples),
    maxMs: Math.max(...cadenceSamples),
    p95Ms: percentile(.95),
    p99Ms: percentile(.99),
    samples: cadenceSamples.length,
  });
  assert.ok(latencySummary.p95Ms < 100,
    `aggregate Next p95 exceeded budget: ${JSON.stringify(latencySummary)}`);
  assert.ok(latencySummary.p99Ms < 150, `aggregate Next p99 exceeded budget: ${latencySummary.p99Ms}ms`);
  assert.ok(latencySummary.maxMs < 250, `aggregate Next max exceeded budget: ${latencySummary.maxMs}ms`);
  assert.equal(await evaluate(cdp,
    `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`),
    requestsBeforeCadence, '100 cache-hit aggregate Next actions must issue zero provider requests');
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

console.log('v7 Replay Workspace browser harness passed', {
  latencySummary,
  rapidHistoryLatencyEvidence,
  replacementLatencyEvidence,
  scope: 'real chart, compact controls, atomic replacements, walls',
});
