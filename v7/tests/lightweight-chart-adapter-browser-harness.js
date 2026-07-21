import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { createExchangeTimePresentation } from '../src/lightweight-chart-adapter/chart-options.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

const exchangeTime = createExchangeTimePresentation('en-US');
assert.equal(exchangeTime.tickMarkFormatter(Date.parse('2026-05-01T13:30:00Z') / 1_000, 3), '09:30');
assert.equal(exchangeTime.tickMarkFormatter(Date.parse('2026-05-01T20:14:00Z') / 1_000, 3), '16:14');
assert.equal(exchangeTime.tickMarkFormatter(Date.parse('2026-01-02T14:30:00Z') / 1_000, 3), '09:30');
assert.match(exchangeTime.timeFormatter(Date.parse('2026-05-01T13:30:00Z') / 1_000), /09:30/);

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
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
      visibleRevision: Number(host.dataset.visibleRevision),
    };
  })()`);
  assert.equal(result.applicationRevision, 1);
  assert.equal(result.barCount, 20);
  assert.ok(result.canvasCount > 0);
  assert.equal(result.libraryVersion, '5.2.0');
  assert.equal(result.painted, 'true');
  assert.equal(result.visibleRevision, 1);

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
