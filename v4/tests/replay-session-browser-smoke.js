import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9377);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/empty-smoke.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-replay-session-browser-smoke-profile-${process.pid}`;

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
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rawValue = await evaluate(client, `
      (async () => {
        const parseDateTime = (value) => {
          const match = String(value || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})(?:[ T](\\d{2}):(\\d{2}))?/);
          if (!match) return null;
          return Math.floor(Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            Number(match[4] || 0),
            Number(match[5] || 0),
            0
          ) / 1000);
        };
        const formatDateTime = (timestamp) => {
          const date = new Date(Number(timestamp) * 1000);
          const y = date.getUTCFullYear();
          const m = String(date.getUTCMonth() + 1).padStart(2, '0');
          const d = String(date.getUTCDate()).padStart(2, '0');
          const h = String(date.getUTCHours()).padStart(2, '0');
          const min = String(date.getUTCMinutes()).padStart(2, '0');
          return \`\${y}-\${m}-\${d} \${h}:\${min}\`;
        };
        const makeBar = (timestamp, index, instrument = 'NQ') => {
          const base = instrument === 'ES' ? 5200 : 30000;
          const close = base + index;
          return {
            time: formatDateTime(timestamp),
            timestamp,
            tradingDay: formatDateTime(timestamp).slice(0, 10),
            open: close - 1,
            high: close + 2,
            low: close - 3,
            close,
            volume: 1000 + index,
          };
        };

        window.__replaySessionBarsCalls = [];
        const nativeFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
          const url = new URL(String(args[0]), window.location.href);
          if (!url.pathname.endsWith('/v4/bars')) return nativeFetch(...args);
          const start = url.searchParams.get('start');
          const end = url.searchParams.get('end');
          const timeframe = Number(url.searchParams.get('tf') || 1);
          const instrument = url.searchParams.get('instrument') || 'NQ';
          const startTs = parseDateTime(start);
          const endTs = parseDateTime(end);
          const step = timeframe * 60;
          const call = { start, end, timeframe, instrument, startTs, endTs };
          window.__replaySessionBarsCalls.push(call);
          const bars = [];
          let index = 0;
          for (let ts = startTs - step * 2; ts <= endTs + step * 3; ts += step) {
            bars.push(makeBar(ts, index, instrument));
            index += 1;
          }
          return new Response(JSON.stringify({
            bars,
            requestedRange: { startTs, endTs },
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        };

        const loader = await import('/src/ui/replay/replay-session-loader.js');
        const sessionState = await import('/src/ui/replay/replay-session-state.js');
        const store = await import('/src/data/bar-store.js');

        const summarize = () => {
          const bars = store.getDisplayBars();
          const timestamps = bars.map((bar) => Number(bar.timestamp));
          return {
            count: bars.length,
            min: Math.min(...timestamps),
            max: Math.max(...timestamps),
            range: store.getCurrentRange(),
            requestedRange: store.getRequestedRange(),
            timeframe: store.getCurrentTimeframe(),
            session: sessionState.getActiveReplaySession(),
          };
        };

        const longStart = '2026-06-01 21:55';
        const longEnd = '2027-06-01 21:55';
        const opened = await loader.openReplaySessionFromRange({
          instrument: 'NQ',
          timeframe: 1,
          sessionStart: longStart,
          sessionEnd: longEnd,
          viewportBarCapacity: 8,
          paddingBars: 2,
        });
        const initial = summarize();
        const initialCall = window.__replaySessionBarsCalls.at(-1);

        const prefix = await loader.loadPreviousReplaySessionPrefix({ chunkBars: 5 });
        const afterPrefix = summarize();
        const prefixCall = window.__replaySessionBarsCalls.at(-1);

        const forward = await loader.loadNextReplaySessionBar();
        const afterForward = summarize();
        const forwardCall = window.__replaySessionBarsCalls.at(-1);

        const reloadedDaily = await loader.reloadReplaySessionTimeframe({
          timeframe: 1440,
          viewportBarCapacity: 4,
          paddingBars: 1,
        });
        const afterDaily = summarize();
        const dailyCall = window.__replaySessionBarsCalls.at(-1);

        await loader.openReplaySessionFromRange({
          instrument: 'NQ',
          timeframe: 1,
          sessionStart: '2026-07-01 10:00',
          sessionEnd: '2026-07-01 10:01',
          viewportBarCapacity: 3,
          paddingBars: 0,
        });
        const shortForward = await loader.loadNextReplaySessionBar();
        const finished = await loader.loadNextReplaySessionBar();
        const afterFinished = summarize();

        return JSON.stringify({
          calls: window.__replaySessionBarsCalls,
          openedRequest: opened.request,
          initialCall,
          initial,
          prefixRequest: prefix.request,
          prefixCall,
          afterPrefix,
          forwardRequest: forward.request,
          forwardCall,
          afterForward,
          dailyRequest: reloadedDaily.request,
          dailyCall,
          afterDaily,
          shortForwardRequest: shortForward.request,
          finished,
          afterFinished,
        });
      })()
    `);
    const value = JSON.parse(rawValue);

    assert.equal(value.initialCall.end, '2026-06-01 21:55', 'initial request must end at session start/cursor');
    assert.notEqual(value.initialCall.end, '2027-06-01 21:55', 'initial request must not end at sessionEnd');
    assert.equal(value.initialCall.timeframe, 1);
    assert.ok(value.initial.count > 1, 'initial session should include visible prefix bars');
    assert.equal(value.initial.max, value.initial.session.cursor, 'initial visible max must be cursor');
    assert.equal(value.initial.range.end, '2026-06-01 21:55', 'primary range end must be cursor');
    assert.equal(value.initial.requestedRange.endTs, value.initial.session.cursor);
    assert.ok(value.initial.requestedRange.startTs < value.initial.session.cursor, 'initial request should be bounded prefix');

    assert.ok(value.prefixCall.endTs < value.initialCall.startTs, 'prefix request should load older bars before current prefix');
    assert.ok(value.afterPrefix.count > value.initial.count, 'prefix load should prepend older visible bars');
    assert.equal(value.afterPrefix.max, value.initial.session.cursor, 'prefix load must not add future bars');
    assert.equal(value.afterPrefix.session.cursor, value.initial.session.cursor);

    assert.equal(value.forwardCall.start, '2026-06-01 21:55', 'forward request must start at current cursor');
    assert.equal(value.forwardCall.end, '2026-06-01 21:56', 'forward request must end at the immediate next bar');
    assert.equal(value.afterForward.session.cursor, value.forwardCall.endTs);
    assert.equal(value.afterForward.max, value.forwardCall.endTs, 'forward buffer must ignore fetch padding beyond next bar');

    assert.equal(value.dailyCall.timeframe, 1440, 'timeframe reload should request the selected timeframe');
    assert.equal(value.dailyCall.endTs, value.afterForward.session.cursor, 'timeframe reload must still end at cursor');
    assert.notEqual(value.dailyCall.end, '2027-06-01 21:55', 'timeframe reload must not request sessionEnd as end');
    assert.ok(value.afterDaily.max <= value.afterDaily.session.cursor, 'daily reload must not show bars after cursor');

    assert.equal(value.shortForwardRequest.start, '2026-07-01 10:00', 'short session forward should start at current cursor');
    assert.equal(value.shortForwardRequest.end, '2026-07-01 10:01', 'short session forward should reveal sessionEnd bar');
    assert.equal(value.afterFinished.session.cursor, value.afterFinished.session.sessionEnd, 'short session should stop at sessionEnd');
    assert.equal(value.finished.finished, true, 'next forward after sessionEnd should report finished');
    assert.equal(value.afterFinished.max, value.afterFinished.session.sessionEnd, 'finished session must not retain future padding');
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    await rm(PROFILE_DIR, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    }).catch(() => {});
  }
}

await main();
console.log('replay session browser smoke passed');
