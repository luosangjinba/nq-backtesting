import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9362);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-comparison-window-browser-smoke-profile-${process.pid}`;

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

async function waitForExpression(client, expression, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue = null;
  while (Date.now() < deadline) {
    lastValue = await evaluate(client, expression);
    if (lastValue) return lastValue;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for expression: ${expression}; last value: ${lastValue}`);
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
    await waitForExpression(client, `Boolean(document.querySelector('#comparisonWindowToggle'))`);
    await evaluate(client, `
      (() => {
        window.__comparisonFetchCalls = 0;
        const nativeFetch = window.fetch.bind(window);
        window.fetch = (...args) => {
          if (String(args[0]).includes('/v4/bars')) {
            window.__comparisonFetchCalls += 1;
            window.__comparisonLastBarsUrl = String(args[0]);
            return Promise.resolve(new Response(JSON.stringify({
              bars: [
                { time: '2026-06-12 10:00', timestamp: 1781258400, tradingDay: '2026-06-12', open: 7383.25, high: 7443.5, low: 7380.25, close: 7440.5, volume: 200251 },
              ],
              requestedRange: { startTs: 1781256600, endTs: 1781258400 },
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }));
          }
          return nativeFetch(...args);
        };
        return true;
      })();
    `);

    const initial = await evaluate(client, `Boolean(document.querySelector('#comparisonWindowToggle'))`);
    assert.equal(initial, true, 'Compare toolbar toggle should exist');

    const shown = await evaluate(client, `
      (() => {
      document.querySelector('#comparisonWindowToggle').click();
      const root = document.querySelector('#comparison-window-root');
      const win = document.querySelector('#comparison-window');
      const instrument = document.querySelector('[data-comparison-instrument]');
      const timeframe = document.querySelector('[data-comparison-timeframe]');
      const status = document.querySelector('[data-comparison-status]');
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        hidden: root.hidden,
        width: win.getBoundingClientRect().width,
        height: win.getBoundingClientRect().height,
        instrumentValue: instrument.value,
        timeframeValue: timeframe.value,
        statusText: status.textContent,
        stackWidth: stack.width,
        stackHeight: stack.height,
        primaryWidth: primary.width,
        primaryHeight: primary.height,
      };
      })();
    `);
    assert.equal(shown.hidden, false, 'Comparison window should be visible after toggle');
    assert.ok(shown.width >= 280, 'Comparison window should have stable width');
    assert.ok(shown.height >= 210, 'Comparison window should have stable height');
    assert.equal(shown.instrumentValue, 'ES', 'Comparison window should expose independent instrument control');
    assert.equal(shown.timeframeValue, '60', 'Comparison window should expose independent timeframe control');
    assert.match(shown.statusText, /Choose a main date range/, 'Comparison window should wait for main range before loading');

    const dragStart = await evaluate(client, `
      (() => {
      const before = document.querySelector('#comparison-window').getBoundingClientRect();
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        x: before.left + 20,
        y: before.top + 12,
        beforeLeft: before.left,
        beforeTop: before.top,
        stackWidth: stack.width,
        stackHeight: stack.height,
        primaryWidth: primary.width,
        primaryHeight: primary.height,
      };
      })();
    `);
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: dragStart.x,
      y: dragStart.y,
      button: 'left',
      clickCount: 1,
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: dragStart.x + 80,
      y: dragStart.y + 40,
      button: 'left',
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: dragStart.x + 80,
      y: dragStart.y + 40,
      button: 'left',
      clickCount: 1,
    });
    const moved = await evaluate(client, `
      (() => {
      const after = document.querySelector('#comparison-window').getBoundingClientRect();
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        beforeLeft: ${dragStart.beforeLeft},
        afterLeft: after.left,
        beforeTop: ${dragStart.beforeTop},
        afterTop: after.top,
        stackWidth: stack.width,
        stackHeight: stack.height,
        primaryWidth: primary.width,
        primaryHeight: primary.height,
      };
      })();
    `);
    assert.ok(moved.afterLeft > moved.beforeLeft, 'Drag should move window horizontally');
    assert.ok(moved.afterTop > moved.beforeTop, 'Drag should move window vertically');
    assert.equal(moved.stackWidth, dragStart.stackWidth, 'Dragging window should not resize chart stack width');
    assert.equal(moved.stackHeight, dragStart.stackHeight, 'Dragging window should not resize chart stack height');
    assert.equal(moved.primaryWidth, dragStart.primaryWidth, 'Dragging window should not resize primary panel width');
    assert.equal(moved.primaryHeight, dragStart.primaryHeight, 'Dragging window should not resize primary panel height');

    const stageDrag = await evaluate(client, `
      (() => {
      const before = document.querySelector('#comparison-window').getBoundingClientRect();
      return { x: before.left + before.width / 2, y: before.top + before.height / 2, beforeLeft: before.left, beforeTop: before.top };
      })();
    `);
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: stageDrag.x,
      y: stageDrag.y,
      button: 'left',
      clickCount: 1,
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: stageDrag.x + 90,
      y: stageDrag.y + 50,
      button: 'left',
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: stageDrag.x + 90,
      y: stageDrag.y + 50,
      button: 'left',
      clickCount: 1,
    });
    const stageMoved = await evaluate(client, `
      (() => {
      const after = document.querySelector('#comparison-window').getBoundingClientRect();
      return { beforeLeft: ${stageDrag.beforeLeft}, afterLeft: after.left, beforeTop: ${stageDrag.beforeTop}, afterTop: after.top };
      })();
    `);
    assert.equal(stageMoved.afterLeft, stageMoved.beforeLeft, 'Dragging inside chart stage should not move outer window');
    assert.equal(stageMoved.afterTop, stageMoved.beforeTop, 'Dragging inside chart stage should not move outer window vertically');
    const fetchCallsWithoutRange = await evaluate(client, `window.__comparisonFetchCalls`);
    assert.equal(fetchCallsWithoutRange, 0, 'Comparison window should not request bars before a main range exists');

    await evaluate(client, `
      (async () => {
        const store = await import('/src/data/bar-store.js');
        store.setBars([
          { time: '2026-06-12 09:30', timestamp: 1781256600, tradingDay: '2026-06-12', open: 29494.5, high: 29501, low: 29371, close: 29430.5, volume: 4223 },
        ], '2026-06-12 09:30', '2026-06-12 10:00', 1, { startTs: 1781256600, endTs: 1781258400 }, { instrument: 'NQ' });
        return true;
      })();
    `);
    await waitForExpression(client, `window.__comparisonFetchCalls === 1 && document.querySelector('[data-comparison-placeholder]').hidden`);
    const loaded = await evaluate(client, `
      (() => {
        return {
          fetchCalls: window.__comparisonFetchCalls,
          url: window.__comparisonLastBarsUrl,
          info: document.querySelector('#comparison-chart-info').textContent,
          placeholderHidden: document.querySelector('[data-comparison-placeholder]').hidden,
          overlayStatus: document.querySelector('[data-comparison-overlay-status]').textContent,
        };
      })();
    `);
    assert.equal(loaded.fetchCalls, 1, 'Comparison window should request bars after main range loads');
    assert.match(loaded.url, /instrument=ES/, 'Comparison window should use its own default instrument');
    assert.match(loaded.url, /tf=60/, 'Comparison window should use its own default timeframe');
    assert.equal(loaded.info, 'ES 1H');
    assert.equal(loaded.placeholderHidden, true, 'Comparison placeholder should hide after data loads');
    assert.match(loaded.overlayStatus, /Time overlays ready/, 'Comparison overlay status should update after data loads');

    const reset = await evaluate(client, `
      (() => {
      document.querySelector('[data-comparison-reset]').click();
      const win = document.querySelector('#comparison-window');
      return { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
      })();
    `);
    assert.deepEqual(reset, { left: '18%', top: '10%', width: '48%', height: '46%' });

    const closed = await evaluate(client, `
      (() => {
      document.querySelector('[data-comparison-close]').click();
      return { hidden: document.querySelector('#comparison-window-root').hidden, checked: document.querySelector('#comparisonWindowToggle').checked };
      })();
    `);
    assert.deepEqual(closed, { hidden: true, checked: false });
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
  }
}

main().then(
  () => console.log('comparison-window-browser-smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
