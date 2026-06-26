import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9372);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-replay-first-real-data-profile-${process.pid}`;
const START = process.env.V4_REAL_REPLAY_START || '2012-01-03 09:30';
const END = process.env.V4_REAL_REPLAY_END || '2012-12-31 16:00';
const INSTRUMENTS = (process.env.V4_REAL_REPLAY_INSTRUMENTS || 'NQ,ES')
  .split(',')
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(500, () => req.destroy(new Error('timeout')));
  });
}

async function waitForTargets() {
  const url = `http://127.0.0.1:${DEBUG_PORT}/json/list`;
  const deadline = Date.now() + 10_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const targets = await getJson(url);
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError || new Error('Chrome target not available');
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(message.error.message || 'CDP error'));
      return;
    }
    resolve(message.result);
  });

  return {
    open() {
      return new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
      });
    },
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    close() {
      socket.close();
    },
  };
}

function waitForProcessExit(child, timeoutMs = 2_000) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const detail =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.exception?.value ||
      result.exceptionDetails.text ||
      'Runtime.evaluate failed';
    throw new Error(detail);
  }
  return result.result.value;
}

async function waitForExpression(client, expression, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue = null;
  while (Date.now() < deadline) {
    lastValue = await evaluate(client, expression);
    if (lastValue) return lastValue;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for expression: ${expression}; last value: ${lastValue}`);
}

async function removeProfileDir(path) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw lastError;
}

async function main() {
  const chrome = spawn(CHROME_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    PAGE_URL,
  ], { stdio: 'ignore' });

  let client = null;
  try {
    const target = await waitForTargets();
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: PAGE_URL });
    await waitForExpression(client, `document.readyState === 'complete' || document.readyState === 'interactive'`);
    await waitForExpression(client, `Boolean(document.querySelector('#chart canvas'))`);

    const result = await evaluate(client, `
      (async () => {
        const waitFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const waitFor = async (predicate, label, timeoutMs = 30_000) => {
          const deadline = Date.now() + timeoutMs;
          let last = null;
          while (Date.now() < deadline) {
            last = predicate();
            if (last) return last;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('Timed out waiting for ' + label + '; last=' + JSON.stringify(last));
        };
        const parseTs = (value) => {
          const match = String(value || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})(?:[ T](\\d{2}):(\\d{2}))?/);
          if (!match) return null;
          return Math.floor(Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            Number(match[4] || 0),
            Number(match[5] || 0)
          ) / 1000);
        };

        const store = await import('/src/data/bar-store.js');
        const bus = await import('/src/event-bus.js');
        const replayControls = await import('/src/ui/replay-controls.js');
        const { loadReplayFirstWindow } = await import('/src/data/replay-first-loader.js');
        const comparisonStore = await import('/src/comparison/comparison-window-store.js');
        const prefixLoader = await import('/src/data/replay-progressive-prefix-loader.js');
        const forwardLoader = await import('/src/data/replay-progressive-forward-loader.js');
        const primaryInstrumentStore = await import('/src/data/primary-instrument-store.js');

        const nativeFetch = window.fetch.bind(window);
        const calls = [];
        window.fetch = async (...args) => {
          const urlText = String(args[0]);
          const startedAt = performance.now();
          const response = await nativeFetch(...args);
          if (urlText.includes('/v4/bars')) {
            const url = new URL(urlText, window.location.href);
            const start = url.searchParams.get('start');
            const end = url.searchParams.get('end');
            calls.push({
              instrument: url.searchParams.get('instrument') || '',
              tf: Number(url.searchParams.get('tf') || 0),
              start,
              end,
              spanHours: (parseTs(end) - parseTs(start)) / 3600,
              ms: performance.now() - startedAt,
              status: response.status,
            });
          }
          return response;
        };

        comparisonStore.setComparisonWindowEnabled(false);
        await waitFrame();

        const runs = [];
        for (const instrument of ${JSON.stringify(INSTRUMENTS)}) {
          primaryInstrumentStore.setPrimaryInstrument(instrument);
          prefixLoader.resetReplayProgressivePrefixLoaderForTests();
          forwardLoader.resetReplayProgressiveForwardLoaderForTests();
          await sleep(500);
          calls.length = 0;
          const initialStartedAt = performance.now();
          const replay = await loadReplayFirstWindow({
            start: ${JSON.stringify(START)},
            end: ${JSON.stringify(END)},
            timeframe: 1,
            instrument,
          });
          if (!replay.ok) throw new Error(replay.message);
          bus.emit('replay:pending-activate-at', { timestamp: replay.activationTimestamp });
          store.setBars(replay.bars, replay.windowRange.start, replay.windowRange.end, 1, null, {
            outerRange: replay.outerRange,
            instrument,
          });
          bus.emit('replay:activate-at', { timestamp: replay.activationTimestamp });
          await waitFor(() => replayControls.getReplayCursorTimestamp() !== null, instrument + ' replay activation');
          await waitFrame();
          const initialMs = performance.now() - initialStartedAt;
          const initialRange = store.getCurrentRange();
          const initialBars = store.getBars().length;
          const initialCursor = replayControls.getReplayCursorTimestamp();
          const initialCalls = calls.slice();

          const prefixResult = await prefixLoader.loadReplayPrefixChunk({ instrument });
          if (!prefixResult.ok) throw new Error(prefixResult.message || instrument + ' prefix load failed');
          await waitFor(() => store.getCurrentRange().start < initialRange.start, instrument + ' prefix load');
          await waitFrame();
          const prefixRange = store.getCurrentRange();
          const prefixCalls = calls.slice(initialCalls.length);

          forwardLoader.resetReplayProgressiveForwardLoaderForTests();
          const forwardStartedAt = performance.now();
          const forwardResult = await forwardLoader.loadReplayForwardChunk({ instrument });
          if (!forwardResult.ok) throw new Error(forwardResult.message || instrument + ' forward load failed');
          await waitFor(() => store.getCurrentRange().end > prefixRange.end, instrument + ' forward load');
          await waitFrame();
          const forwardMs = performance.now() - forwardStartedAt;
          const finalRange = store.getCurrentRange();
          const finalBars = store.getBars().length;
          const forwardCalls = calls.slice(initialCalls.length + prefixCalls.length);
          const allCalls = calls.slice();
          const progressiveCalls = [...prefixCalls, ...forwardCalls];
          const maxRequestSpanHours = Math.max(...allCalls.map((call) => Number(call.spanHours) || 0));
          const maxProgressiveRequestSpanHours = Math.max(...progressiveCalls.map((call) => Number(call.spanHours) || 0));
          const maxRequestMs = Math.max(...allCalls.map((call) => Number(call.ms) || 0));

          runs.push({
            instrument,
            initialMs,
            forwardMs,
            initialRange,
            prefixRange,
            finalRange,
            initialBars,
            finalBars,
            initialCursor,
            currentCursor: replayControls.getReplayCursorTimestamp(),
            requestCount: allCalls.length,
            initialRequestCount: initialCalls.length,
            prefixRequestCount: prefixCalls.length,
            forwardRequestCount: forwardCalls.length,
            maxRequestSpanHours,
            maxProgressiveRequestSpanHours,
            maxRequestMs,
            requestSummary: allCalls.map((call) => ({
              instrument: call.instrument,
              tf: call.tf,
              spanHours: call.spanHours,
              ms: Math.round(call.ms),
            })),
          });
        }

        return { ok: true, start: ${JSON.stringify(START)}, end: ${JSON.stringify(END)}, runs };
      })().catch((error) => ({ ok: false, error: error.stack || error.message }));
    `);

    assert.equal(result.ok, true, result.error || 'real-data browser validation failed');
    assert.equal(result.runs.length, INSTRUMENTS.length);
    for (const run of result.runs) {
      assert.ok(run.initialBars > 0, `${run.instrument} initial bars should be non-empty`);
      assert.ok(run.finalBars > run.initialBars, `${run.instrument} progressive loads should add bars`);
      assert.ok(run.prefixRange.start < run.initialRange.start, `${run.instrument} prefix should extend left`);
      assert.ok(run.finalRange.end > run.prefixRange.end, `${run.instrument} forward should extend right after prefix`);
      assert.ok(run.forwardRequestCount > 0, `${run.instrument} forward should issue a bounded request`);
      assert.ok(run.currentCursor >= run.initialCursor, `${run.instrument} cursor should remain valid`);
      assert.ok(
        run.maxProgressiveRequestSpanHours <= 24,
        `${run.instrument} progressive request span too large: ${JSON.stringify(run, null, 2)}`
      );
      assert.ok(run.initialMs < 20_000, `${run.instrument} initial load too slow: ${run.initialMs}ms`);
      assert.ok(run.forwardMs < 10_000, `${run.instrument} forward load too slow: ${run.forwardMs}ms`);
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (client) client.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    await removeProfileDir(PROFILE_DIR);
  }
}

main()
  .then(() => console.log('replay first real data browser smoke passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
