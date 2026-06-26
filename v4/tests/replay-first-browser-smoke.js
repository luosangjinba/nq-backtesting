import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9371);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-replay-first-browser-profile-${process.pid}`;

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
        const waitFor = async (predicate, label, timeoutMs = 8_000) => {
          const deadline = Date.now() + timeoutMs;
          let last = null;
          while (Date.now() < deadline) {
            last = predicate();
            if (last) return last;
            await new Promise((resolve) => setTimeout(resolve, 80));
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
        const fmt = (timestamp) => {
          const date = new Date(Number(timestamp) * 1000);
          return [
            date.getUTCFullYear(),
            String(date.getUTCMonth() + 1).padStart(2, '0'),
            String(date.getUTCDate()).padStart(2, '0'),
          ].join('-') + ' ' +
            String(date.getUTCHours()).padStart(2, '0') + ':' +
            String(date.getUTCMinutes()).padStart(2, '0');
        };
        const makeBars = (start, end) => {
          const startTs = parseTs(start);
          const endTs = parseTs(end);
          const bars = [];
          for (let ts = startTs; ts <= endTs; ts += 3600) {
            const offset = (ts - startTs) / 3600;
            const price = 13000 + Math.sin(offset / 3) * 20 + offset;
            bars.push({
              time: fmt(ts),
              timestamp: ts,
              tradingDay: fmt(ts).slice(0, 10),
              open: price,
              high: price + 4,
              low: price - 4,
              close: price + 1,
              volume: 100 + offset,
            });
          }
          return bars;
        };

        window.__replayFirstCalls = [];
        const nativeFetch = window.fetch.bind(window);
        window.fetch = (...args) => {
          const rawUrl = String(args[0]);
          if (!rawUrl.includes('/v4/bars')) return nativeFetch(...args);
          const url = new URL(rawUrl, window.location.href);
          const start = url.searchParams.get('start');
          const end = url.searchParams.get('end');
          const bars = makeBars(start, end);
          window.__replayFirstCalls.push({
            start,
            end,
            tf: Number(url.searchParams.get('tf') || 0),
            instrument: url.searchParams.get('instrument') || '',
            count: bars.length,
            spanHours: (parseTs(end) - parseTs(start)) / 3600,
          });
          return Promise.resolve(new Response(JSON.stringify({
            bars,
            requestedRange: bars.length
              ? { startTs: bars[0].timestamp, endTs: bars.at(-1).timestamp }
              : null,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }));
        };

        const store = await import('/src/data/bar-store.js');
        const chart = await import('/src/chart/chart-manager.js');
        const bus = await import('/src/event-bus.js');
        const replayControls = await import('/src/ui/replay-controls.js');
        const { loadReplayFirstWindow } = await import('/src/data/replay-first-loader.js');
        const comparisonStore = await import('/src/comparison/comparison-window-store.js');

        comparisonStore.setComparisonWindowEnabled(false);
        await waitFrame();
        window.__replayFirstCalls = [];
        const replay = await loadReplayFirstWindow({
          start: '2012-01-01 00:00',
          end: '2012-12-31 23:59',
          timeframe: 1,
          instrument: 'NQ',
        });
        if (!replay.ok) throw new Error(replay.message);
        bus.emit('replay:pending-activate-at', {
          timestamp: replay.activationTimestamp,
          replayStartTimestamp: replay.outerRange.startTs,
        });
        store.setBars(replay.bars, replay.windowRange.start, replay.windowRange.end, 1, null, {
          outerRange: replay.outerRange,
          instrument: 'NQ',
        });
        bus.emit('replay:activate-at', {
          timestamp: replay.activationTimestamp,
          replayStartTimestamp: replay.outerRange.startTs,
        });
        await waitFor(() => replayControls.getReplayCursorTimestamp() !== null, 'replay activation');
        await waitFrame();
        comparisonStore.setComparisonWindowEnabled(true);
        await waitFor(
          () => window.__replayFirstCalls.some((call) => call.tf === 60 && call.spanHours <= 5),
          'bounded comparison sync'
        );
        await waitFrame();

        const initialCalls = window.__replayFirstCalls.slice();
        const initialRange = store.getCurrentRange();
        const initialBars = store.getBars().length;
        const initialCursor = replayControls.getReplayCursorTimestamp();
        const initialActiveDataCount = chart.getActiveDataCount();
        const initialReplayProgress = replayControls.getReplayProgressSnapshot();
        const initialVisibleRange = chart.getVisibleLogicalRange();

        chart.setVisibleLogicalRange(0, 20);
        await waitFor(() => store.getCurrentRange().start < initialRange.start, 'prefix load', 10_000);
        const prefixRange = store.getCurrentRange();
        const prefixCalls = window.__replayFirstCalls.slice(initialCalls.length);

        const endBeforeForward = store.getCurrentRange().end;
        const forwardStartAt = performance.now();
        for (let index = 0; index < 120 && store.getCurrentRange().end === endBeforeForward; index += 1) {
          document.querySelector('[data-action="forward"]')?.click();
          await waitFrame();
        }
        await waitFor(() => store.getCurrentRange().end > endBeforeForward, 'forward load', 10_000);
        const forwardMs = performance.now() - forwardStartAt;
        const finalRange = store.getCurrentRange();
        const finalBars = store.getBars().length;
        const forwardCalls = window.__replayFirstCalls.slice(initialCalls.length + prefixCalls.length);

        const progressiveCalls = [...prefixCalls, ...forwardCalls];
        return {
          ok: true,
          initialCalls,
          prefixCalls,
          forwardCalls,
          initialRange,
          prefixRange,
          finalRange,
          initialBars,
          initialActiveDataCount,
          initialReplayProgress,
          initialVisibleRange,
          finalBars,
          initialCursor,
          currentCursor: replayControls.getReplayCursorTimestamp(),
          forwardMs,
          maxRequestSpanHours: Math.max(...window.__replayFirstCalls.map((call) => call.spanHours)),
          maxProgressiveRequestSpanHours: Math.max(...progressiveCalls.map((call) => call.spanHours)),
          totalCalls: window.__replayFirstCalls.length,
        };
      })().catch((error) => ({ ok: false, error: error.stack || error.message }));
    `);

    assert.equal(result.ok, true, result.error || 'browser replay-first smoke failed');
    assert.ok(result.initialCalls.length >= 4, 'initial replay window should be chunked');
    assert.ok(
      result.initialCalls.filter((call) => call.tf === 1 && call.spanHours <= 24).length >= 4,
      `initial replay load should include daily chunks: ${JSON.stringify(result.initialCalls)}`
    );
    assert.ok(result.prefixCalls.length >= 1, 'prefix pan should load at least one chunk');
    assert.ok(result.prefixCalls.some((call) => call.spanHours <= 2), 'prefix should use a small chunk');
    assert.ok(result.forwardCalls.length >= 1, 'forward replay should load at least one chunk');
    assert.ok(result.forwardCalls.some((call) => call.spanHours <= 2), 'forward should use a small chunk');
    assert.equal(result.initialReplayProgress.progressIndex, 1, `replay should start at Date Range start: ${JSON.stringify(result)}`);
    assert.ok(result.initialReplayProgress.replayStartIndex >= 0, 'replay start index should be resolved');
    assert.ok(result.initialActiveDataCount >= 1, 'prefix context plus cursor should render initially');
    assert.ok(
      result.initialVisibleRange.from < result.initialReplayProgress.replayStartIndex,
      `initial viewport should include prefix context before replay start: ${JSON.stringify(result)}`
    );
    assert.ok(
      result.initialVisibleRange.to - result.initialVisibleRange.from <= 180,
      `initial replay viewport should not inherit a stale wide range: ${JSON.stringify(result)}`
    );
    assert.ok(result.prefixRange.start < result.initialRange.start, 'prefix load should extend range left');
    assert.ok(result.finalRange.end > result.initialRange.end, 'forward load should extend range right');
    assert.ok(result.finalBars > result.initialBars, 'progressive loads should add bars');
    assert.ok(
      result.maxProgressiveRequestSpanHours <= 24,
      `progressive replay-first requests must stay bounded: ${JSON.stringify({
        maxProgressiveRequestSpanHours: result.maxProgressiveRequestSpanHours,
        prefixCalls: result.prefixCalls,
        forwardCalls: result.forwardCalls,
      })}`
    );
    assert.ok(result.currentCursor >= result.initialCursor, 'replay cursor should remain valid');
    assert.ok(result.forwardMs < 8_000, `forward load took too long: ${result.forwardMs}ms`);
  } finally {
    if (client) client.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    await removeProfileDir(PROFILE_DIR);
  }
}

main()
  .then(() => console.log('replay first browser smoke passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
