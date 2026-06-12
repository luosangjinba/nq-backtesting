import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9339);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || '/tmp/v4-primary-instrument-browser-smoke-profile';

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
    req.setTimeout(500, () => {
      req.destroy(new Error('timeout'));
    });
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
    await client.send('Page.navigate', { url: PAGE_URL });
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    const expression = `
      (async () => {
        try {
          const api = await import('/src/api.js');
          const primary = await import('/src/data/primary-instrument-store.js');
          const deadline = Date.now() + 5_000;
          while (!document.querySelector('#primaryInstrumentSelect') && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          const select = document.querySelector('#primaryInstrumentSelect');
          if (!select) return JSON.stringify({ error: 'missing primaryInstrumentSelect' });
          primary.setPrimaryInstrument('ES');
          await new Promise((resolve) => setTimeout(resolve, 100));
          const [nq, es] = await Promise.all([
            api.fetchBars('2024-01-08 09:30', '2024-01-08 11:00', 60, 'NQ'),
            api.fetchBars('2024-01-08 09:30', '2024-01-08 11:00', 60, 'ES'),
          ]);
          return JSON.stringify({
            error: '',
            options: Array.from(select.options).map((option) => option.value),
            selected: select.value,
            primaryInstrument: primary.getPrimaryInstrument(),
            nqBars: Array.isArray(nq.bars) ? nq.bars.length : 0,
            esBars: Array.isArray(es.bars) ? es.bars.length : 0,
            hasCanvas: Boolean(document.querySelector('#chart canvas')),
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        }
      })()
    `;
    const result = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    const value = JSON.parse(result.result?.value || '{}');
    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.deepEqual(value.options, ['NQ', 'ES']);
    assert.equal(value.selected, 'ES');
    assert.equal(value.primaryInstrument, 'ES');
    assert.ok(value.nqBars > 0, 'NQ bars should load through frontend API');
    assert.ok(value.esBars > 0, 'ES bars should load through frontend API');
    assert.equal(value.hasCanvas, true, 'primary chart canvas should render');
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
  }
}

await main();
console.log('primary instrument browser smoke passed');
