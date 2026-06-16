import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9347);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-performance-selection-profile-${process.pid}`;

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
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: PAGE_URL });
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    const expression = `
      (async () => {
        const waitFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const waitFor = async (predicate, label) => {
          const deadline = Date.now() + 5_000;
          while (Date.now() < deadline) {
            const value = predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('Timed out waiting for ' + label);
        };
        try {
          const store = await import('/src/data/bar-store.js');
          const segments = await import('/src/segment/segment-store.js');
          const segmentSelection = await import('/src/segment/segment-selection.js');
          const pdaStore = await import('/src/pda/pda-store.js');
          const pdaSelection = await import('/src/pda/pda-selection.js');
          await waitFor(() => document.querySelector('#chart canvas'), 'chart canvas');

          const baseTs = 1710770400;
          const bars = Array.from({ length: 240 }, (_, index) => {
            const price = 18300 + Math.sin(index / 8) * 60 + index * 0.2;
            return {
              timestamp: baseTs + index * 60,
              time: baseTs + index * 60,
              tradingDay: '2024-03-18',
              open: price,
              high: price + 8,
              low: price - 8,
              close: price + 2,
              volume: 100 + index,
            };
          });
          store.setBars(bars, '2024-03-18 09:00', '2024-03-18 13:00', 1, {
            startTs: bars[0].timestamp,
            endTs: bars.at(-1).timestamp,
          }, { instrument: 'NQ' });
          await waitFrame();

          function makeSegments(count) {
            return Array.from({ length: count }, (_, index) => {
              const start = bars[index % 120];
              const end = bars[(index % 120) + 30];
              return {
                id: 'perf_segment_' + count + '_' + index,
                source: 'benchmark',
                sourceChartId: 'primary',
                instrument: 'NQ',
                timeframe: '1M',
                direction: index % 2 ? 'down' : 'up',
                start: { timestamp: start.timestamp, price: start.low },
                end: { timestamp: end.timestamp, price: end.high },
                display: { showLabel: false },
                pdaResponses: [],
              };
            });
          }

          function makePdas(count) {
            return Array.from({ length: count }, (_, index) => {
              const bar = bars[(index * 3) % bars.length];
              return {
                id: 'perf_pda_' + count + '_' + index,
                source: 'benchmark',
                sourceChartId: 'primary',
                sourceInstrument: 'NQ',
                sourceTimeframe: 1,
                type: index % 2 ? 'ssl' : 'bsl',
                canonicalTimestamp: bar.timestamp,
                timestamp: bar.timestamp,
                price: index % 2 ? bar.low : bar.high,
                display: { showLabel: false },
              };
            });
          }

          async function measure(label, count) {
            segments.loadSegments(makeSegments(count));
            pdaStore.loadAnnotations(makePdas(count));
            await waitFrame();

            const segmentStart = performance.now();
            segmentSelection.selectSegment('perf_segment_' + count + '_' + Math.floor(count / 2));
            await waitFrame();
            const segmentMs = performance.now() - segmentStart;

            const pdaStart = performance.now();
            pdaSelection.selectPda('perf_pda_' + count + '_' + Math.floor(count / 2));
            await waitFrame();
            const pdaMs = performance.now() - pdaStart;

            return {
              label,
              count,
              segmentSelectionMs: Number(segmentMs.toFixed(2)),
              pdaSelectionMs: Number(pdaMs.toFixed(2)),
            };
          }

          const results = [];
          for (const count of [25, 100, 250]) {
            results.push(await measure('selection_render', count));
          }
          return JSON.stringify({ error: '', results });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error), results: [] });
        }
      })()
    `;
    const result = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    const value = JSON.parse(result.result?.value || '{}');
    if (value.error) throw new Error(value.error);
    console.log('frontend_selection_benchmark_status: ok');
    for (const item of value.results || []) {
      console.log(
        `selection case=${item.label} objects=${item.count} ` +
        `segment_selection_ms=${item.segmentSelectionMs} pda_selection_ms=${item.pdaSelectionMs}`
      );
    }
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
