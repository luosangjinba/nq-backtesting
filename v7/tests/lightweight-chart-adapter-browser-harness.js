import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { createExchangeTimePresentation } from '../src/lightweight-chart-adapter/chart-options.js';
import { createCrosshairPresentationIndex } from '../src/lightweight-chart-adapter/crosshair-presentation.js';
import { requireTailUpdatePaint } from '../src/lightweight-chart-adapter/paint-gate.js';
import { planVisibleLogicalRange } from '../src/lightweight-chart-adapter/logical-range-plan.js';
import { planSeriesMutation } from '../src/lightweight-chart-adapter/series-update-plan.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const exchangeTime = createExchangeTimePresentation('en-US');
assert.equal(exchangeTime.tickMarkFormatter(Date.parse('2026-05-01T13:30:00Z') / 1_000, 3), '09:30');
assert.equal(exchangeTime.tickMarkFormatter(Date.parse('2026-05-01T20:14:00Z') / 1_000, 3), '16:14');
assert.equal(exchangeTime.tickMarkFormatter(Date.parse('2026-01-02T14:30:00Z') / 1_000, 3), '09:30');
assert.match(exchangeTime.timeFormatter(Date.parse('2026-05-01T13:30:00Z') / 1_000), /09:30/);

const candle = (time, close = 2) => ({ time, open: 1, high: 3, low: 0, close });
assert.deepEqual(planVisibleLogicalRange({ from: -20, latestOffsetBars: 12, to: 40 }, 80),
  { from: -0.5, to: 40 });
assert.deepEqual(planVisibleLogicalRange({ from: -200, latestOffsetBars: -120, to: -120 }, 185),
  { from: -0.5, to: 184 },
  'a low→high replacement must not submit an inverted range or strand all candles off-screen');
assert.deepEqual(planVisibleLogicalRange({
  from: -73.113, latestOffsetBars: -184.113, origin: 'manual', spanBars: 80, to: 6.887,
}, 191), { from: -0.5, to: 79.5 },
'a left-clamped manual wall must translate without collapsing its canonical span');
assert.equal(planSeriesMutation([], [candle(1)]).kind, 'full-replace');
assert.equal(planSeriesMutation([candle(1)], [candle(1, 2.5)]).kind, 'tail-update');
assert.equal(planSeriesMutation([candle(1)], [candle(1), candle(2)]).kind, 'tail-update');
assert.equal(planSeriesMutation([candle(1)], [candle(2)]).kind, 'full-replace');
assert.equal(planSeriesMutation([candle(1), candle(2)], [candle(1, 3), candle(2)]).kind, 'full-replace');
const crosshairPresentation = createCrosshairPresentationIndex();
assert.equal(crosshairPresentation.latest().state, 'empty');
crosshairPresentation.setBars([
  { ...candle(1), displayEpochMs: 1_000, startEpochMs: 900 },
  { ...candle(2, 4), displayEpochMs: 2_000, startEpochMs: 1_900 },
]);
assert.deepEqual(crosshairPresentation.selectedAt(1_000), {
  bar: { close: 2, high: 3, low: 0, open: 1 }, change: null,
  displayEpochMs: 1_000, state: 'selected',
});
assert.deepEqual(crosshairPresentation.selectedAt(1_500), {
  bar: { close: 4, high: 3, low: 0, open: 1 }, change: { percent: 100, value: 2 },
  displayEpochMs: 2_000, state: 'latest',
});
const crosshairNegativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/lightweight-chart-adapter/negative/crosshair-cases.json',
), 'utf8'));
for (const fixture of crosshairNegativeCases) {
  const presentation = createCrosshairPresentationIndex();
  presentation.setBars(fixture.bars);
  assert.equal(presentation.selectedAt(fixture.targetDisplayEpochMs).state, fixture.expectedState,
    fixture.name);
}
await assert.rejects(
  requireTailUpdatePaint({ changed: () => false, requestFrame: () => {} }),
  (error) => error?.code === 'CHART_TAIL_UPDATE_NOT_OBSERVED',
);

const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-lwc-adapter-'));
const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1000,620',
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

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}/v7/tests/fixtures/lightweight-chart-adapter/`,
  });
  await waitFor(cdp, `document.querySelector('#chart')?.dataset.scenario === 'ready'`);
  const result = await evaluate(cdp, `(() => {
    const host = document.querySelector('#chart');
    return {
      applicationRevision: Number(host.dataset.applicationRevision),
      barCount: Number(host.dataset.barCount),
      canvasCount: host.querySelectorAll('canvas').length,
      libraryVersion: host.dataset.libraryVersion,
      painted: host.dataset.painted,
      mutationMode: host.dataset.lastMutationMode,
      visibleRevision: Number(host.dataset.visibleRevision),
    };
  })()`);
  assert.equal(result.applicationRevision, 1);
  assert.equal(result.barCount, 20);
  assert.ok(result.canvasCount > 0);
  assert.equal(result.libraryVersion, '5.2.0');
  assert.equal(result.painted, 'true');
  assert.equal(result.mutationMode, 'full-replace');
  assert.equal(result.visibleRevision, 1);

  const rollback = await evaluate(cdp, `globalThis.__probeVisibleRollback()`);
  assert.equal(rollback.staleCode, 'CHART_ADAPTER_STALE');
  assert.equal(rollback.before.barCount, 20);
  assert.equal(rollback.afterStale.barCount, 20,
    'stale-after-paint must restore the previously accepted series');
  assert.equal(rollback.afterStale.adapterRevision, rollback.before.adapterRevision);
  assert.deepEqual(rollback.afterStale.logicalRange, rollback.before.logicalRange);
  assert.equal(rollback.latestAfterStale.displayEpochMs, 2_170_000,
    'stale rollback must restore the previous OHLC index');
  assert.equal(rollback.beforeDiscard.barCount, 21);
  assert.equal(rollback.afterDiscard.barCount, 20,
    'outer receipt rejection must be able to discard a successful visible apply');
  assert.equal(rollback.afterDiscard.adapterRevision, rollback.before.adapterRevision);
  assert.deepEqual(rollback.afterDiscard.logicalRange, rollback.before.logicalRange);
  assert.equal(rollback.latestAfterDiscard.displayEpochMs, 2_170_000);

  const emptyTransition = await evaluate(cdp, `globalThis.__probeEmptyTransition()`);
  assert.equal(emptyTransition.empty.barCount, 0);
  assert.equal(emptyTransition.emptyObservation.state, 'empty');
  assert.deepEqual(emptyTransition.emptyDataset, {
    barCount: '0', instrumentId: null, latestDisplayEpochMs: null,
  });
  assert.equal(emptyTransition.restored.barCount, 20);
  assert.equal(emptyTransition.restoredObservation.displayEpochMs, 2_170_000,
    'discarding an empty transition must restore the prior OHLC index');

  const latestCrosshair = await evaluate(cdp, `globalThis.__adapter.crosshairObservation()`);
  assert.deepEqual(latestCrosshair, {
    bar: { close: 117, high: 122, low: 116, open: 119 },
    change: { percent: -2.5, value: -3 },
    displayEpochMs: 2_170_000,
    state: 'latest',
  });
  assert.equal((await evaluate(cdp,
    `globalThis.__adapter.projectCrosshair(1330000)`)).state, 'selected');
  assert.equal((await evaluate(cdp,
    `globalThis.__adapter.projectCrosshair(1350000)`)).state, 'latest');
  await evaluate(cdp, `globalThis.__adapter.clearCrosshairPosition()`);
  assert.deepEqual(await evaluate(cdp, `(() => {
    const host = document.querySelector('#chart');
    return { origin: host.dataset.crosshairOrigin, state: host.dataset.crosshairState };
  })()`), { origin: 'cleared', state: 'latest' });

  const crosshairBounds = await evaluate(cdp, `(() => {
    const bounds = document.querySelector('#chart').getBoundingClientRect();
    return { bottom: bounds.bottom, left: bounds.left, right: bounds.right, top: bounds.top };
  })()`);
  let selectedObservation = null;
  for (const ratio of [.15, .25, .35, .45, .55, .65, .75]) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: crosshairBounds.left + (crosshairBounds.right - crosshairBounds.left) * ratio,
      y: crosshairBounds.top + (crosshairBounds.bottom - crosshairBounds.top) * .45,
      button: 'none',
      buttons: 0,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    selectedObservation = await evaluate(cdp, `globalThis.__crosshairObservations.at(-1) ?? null`);
    if (selectedObservation?.state === 'selected') break;
  }
  assert.equal(selectedObservation?.state, 'selected',
    'native crosshair over a candle must publish that candle OHLC');
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: 970, y: 590, button: 'none', buttons: 0,
  });
  await waitFor(cdp, `globalThis.__crosshairObservations.at(-1)?.state === 'latest'`);

  const truncationPoint = await evaluate(cdp, `(() => {
    globalThis.__adapter.setTruncationSelection(true);
    const bounds = document.querySelector('#chart').getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: truncationPoint.x, y: truncationPoint.y,
    button: 'left', buttons: 1, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: truncationPoint.x, y: truncationPoint.y,
    button: 'left', buttons: 0, clickCount: 1,
  });
  await waitFor(cdp, `globalThis.__truncationSelections.length === 1`);
  const truncationSelection = await evaluate(cdp, `(() => ({
    hostState: document.querySelector('#chart').dataset.truncationSelection,
    selection: globalThis.__truncationSelections[0],
  }))()`);
  assert.equal(truncationSelection.hostState, 'active');
  assert.equal(
    truncationSelection.selection.displayEpochMs - truncationSelection.selection.startEpochMs,
    30_000,
    'chart click must resolve the projected completion slot back to its real bucket start',
  );
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: truncationPoint.x, y: truncationPoint.y,
    button: 'none', buttons: 0,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: truncationPoint.x, y: truncationPoint.y,
    button: 'left', buttons: 1, clickCount: 2,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: truncationPoint.x, y: truncationPoint.y,
    button: 'left', buttons: 0, clickCount: 2,
  });
  await waitFor(cdp, `globalThis.__truncationSelections.length === 2`);
  assert.equal(await evaluate(cdp, `(() => {
    globalThis.__adapter.setTruncationSelection(false);
    return document.querySelector('#chart').dataset.truncationSelection;
  })()`), 'inactive');

  const beforeAxisWheel = await evaluate(cdp, `(() => {
    const host = document.querySelector('#chart');
    const bounds = host.getBoundingClientRect();
    const snapshot = globalThis.__adapter.snapshot();
    return { bounds: { right: bounds.right, y: bounds.top + bounds.height / 2 },
      logicalRange: snapshot.logicalRange, priceRange: snapshot.priceRange };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: beforeAxisWheel.bounds.right - 3,
    y: beforeAxisWheel.bounds.y,
    deltaX: 0,
    deltaY: -120,
  });
  await waitFor(cdp, `document.querySelector('#chart').dataset.priceScaleWheelRevision === '1'`);
  const afterAxisWheel = await evaluate(cdp, `(() => {
    const snapshot = globalThis.__adapter.snapshot();
    return { logicalRange: snapshot.logicalRange, priceRange: snapshot.priceRange,
      previousSpan: Number(document.querySelector('#chart').dataset.priceScalePreviousSpan),
      span: Number(document.querySelector('#chart').dataset.priceScaleSpan) };
  })()`);
  assert.deepEqual(afterAxisWheel.logicalRange, beforeAxisWheel.logicalRange,
    'wheel on the price axis must not zoom the horizontal time range');
  assert.ok(afterAxisWheel.span < afterAxisWheel.previousSpan,
    'wheel up on the price axis must vertically zoom into a smaller price span');
  assert.ok(
    afterAxisWheel.priceRange.to - afterAxisWheel.priceRange.from
      < beforeAxisWheel.priceRange.to - beforeAxisWheel.priceRange.from,
    'the public price-scale range must reflect vertical wheel zoom',
  );
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

console.log('v7 Lightweight Chart Adapter browser harness passed (v5.2.0 painted receipt)');
