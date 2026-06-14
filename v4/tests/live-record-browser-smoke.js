import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9341);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-live-record-browser-smoke-profile-${process.pid}`;

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
        try {
          const store = await import('/src/data/bar-store.js');
          const liveStore = await import('/src/live-record/live-record-store.js');
          const liveChartActions = await import('/src/live-record/live-record-chart-actions.js');
          const waitFor = async (predicate, label) => {
            const deadline = Date.now() + 5_000;
            while (Date.now() < deadline) {
              const value = predicate();
              if (value) return value;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            throw new Error('Timed out waiting for ' + label);
          };
          await waitFor(() => document.querySelector('#inspector-sidebar'), 'inspector sidebar');
          localStorage.removeItem('v4:live-records:NQ');
          liveStore.loadLiveRecords([]);
          const bars = [
            { timestamp: 1710770400, time: 1710770400, tradingDay: '2024-03-18', open: 18350, high: 18380, low: 18340, close: 18366.36 },
            { timestamp: 1710774000, time: 1710774000, tradingDay: '2024-03-18', open: 18366.36, high: 18390, low: 18360, close: 18380 }
          ];
          store.setBars(bars, '2024-03-18 09:30', '2024-03-18 11:00', 60, {
            startTs: 1710770400,
            endTs: 1710774000,
          }, { instrument: 'NQ' });
          const emptyLiveGroup = await waitFor(() => document.querySelector('[data-calendar-group-type="live-record"]'), 'empty live record group');
          const orderGroup = await waitFor(() => document.querySelector('[data-calendar-group-type="order-setup"]'), 'order setup group');
          if (!emptyLiveGroup || !orderGroup) return JSON.stringify({ error: 'missing order/live groups' });
          const emptyState = emptyLiveGroup.textContent.includes('None');
          const emptyCount = emptyLiveGroup.querySelector('.calendar-object-count')?.textContent?.trim();
          liveChartActions.handleLiveRecordChartAction('live-record-create-bearish', {
            bar: bars[0],
            price: 18366.36,
            timeframe: '1H',
          });
          liveChartActions.handleLiveRecordChartAction('live-record-set-entry', {
            bar: { ...bars[0], timestamp: 1710770460, close: 18361.25 },
            price: 18361.25,
            timeframe: '5M',
          });
          liveChartActions.handleLiveRecordChartAction('live-record-set-stop-loss', {
            bar: { ...bars[0], timestamp: 1710770520, close: 18372.5 },
            price: 18372.5,
            timeframe: '5M',
          });
          liveChartActions.handleLiveRecordChartAction('live-record-set-target-external-1', {
            bar: { ...bars[0], timestamp: 1710770580, close: 18325.5 },
            price: 18325.5,
            timeframe: '5M',
          });
          liveChartActions.handleLiveRecordChartAction('live-record-set-result-exit', {
            bar: { ...bars[0], timestamp: 1710770640, close: 18330.25 },
            price: 18330.25,
            timeframe: '1M',
          });
          liveChartActions.handleLiveRecordChartAction('live-record-set-all-ends', {
            bar: { ...bars[0], timestamp: 1710770700, close: 18331 },
            price: 18331,
            timeframe: '1M',
          });
          liveChartActions.handleLiveRecordChartAction('live-record-link-pda', {
            pdaHit: { id: 'browser-smoke-pda', type: 'fvg' },
          });
          liveChartActions.handleLiveRecordChartAction('live-record-create-bullish', {
            bar: bars[1],
            price: 18380,
            timeframe: '1H',
          });
          const shortRecord = liveStore.getLiveRecords().find((record) => record.direction === 'short');
          liveStore.updateLiveRecord(shortRecord.id, {
            result: { executionReviewNote: 'Browser reviewed execution' },
          });
          liveChartActions.handleLiveRecordChartAction('live-record-status-closed', {
            liveRecordId: shortRecord.id,
          });
          liveChartActions.handleLiveRecordChartAction('live-record-status-reviewed', {
            liveRecordId: shortRecord.id,
          });
          await new Promise((resolve) => setTimeout(resolve, 300));
          const groups = Array.from(document.querySelectorAll('.calendar-object-group[data-calendar-group-type]'))
            .map((group) => group.dataset.calendarGroupType);
          const liveGroup = document.querySelector('[data-calendar-group-type="live-record"]');
          const liveRows = Array.from(liveGroup?.querySelectorAll('.calendar-object-row') || []);
          const rowTexts = liveRows.map((row) => row.textContent?.replace(/\\s+/g, ' ').trim() || '');
          const shortRow = liveRows.find((row) => /Short/.test(row.textContent || '')) || liveRows[0];
          const liveOpen = shortRow?.querySelector('[data-inspector-action="calendar-object-open"][data-object-type="live-record"]');
          liveOpen?.click();
          await new Promise((resolve) => setTimeout(resolve, 250));
          const detail = document.querySelector('[data-inspector-section="live-record-detail"]');
          return JSON.stringify({
            error: '',
            emptyState,
            emptyCount,
            groups,
            liveCount: liveGroup?.querySelector('.calendar-object-count')?.textContent?.trim(),
            rowText: shortRow?.textContent?.replace(/\\s+/g, ' ').trim() || '',
            rowTexts,
            liveSummaryText: liveGroup?.textContent?.replace(/\\s+/g, ' ').trim() || '',
            hasStatusDot: Boolean(shortRow?.querySelector('.calendar-setup-visibility')),
            hasMenu: Boolean(shortRow?.querySelector('.calendar-object-menu')),
            detailTitle: detail?.querySelector('.inspector-section-title')?.textContent?.trim() || '',
            detailText: detail?.textContent || '',
            canvasCount: document.querySelectorAll('#chart canvas').length,
            hasStandaloneLiveOrders: document.body.textContent.includes('Live Orders'),
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
    assert.equal(value.emptyState, true, 'empty Live Records group should show None');
    assert.equal(value.emptyCount, '0', 'empty Live Records group should show count 0');
    assert.equal(
      value.groups.indexOf('live-record'),
      value.groups.indexOf('order-setup') + 1,
      'Live Records group should be directly after Order Setups'
    );
    assert.equal(value.liveCount, '2', 'Live Records group should show count 2 after bullish/bearish creation');
    assert.match(value.rowText, /Live/, 'Live Records row should show Live type label');
    assert.match(value.rowText, /Short|Reviewed/i, 'Live Records row should show bearish live summary/status');
    assert.match(value.rowText, /Exit/i, 'Live Records row should show chart-written exit');
    assert.match(value.liveSummaryText, /Reviewed 1/, 'Live Records group should summarize reviewed records');
    assert.ok(value.rowTexts.some((text) => /Long/.test(text)), 'Live Records rows should include bullish record');
    assert.ok(value.rowTexts.some((text) => /Short/.test(text)), 'Live Records rows should include bearish record');
    assert.equal(value.hasStatusDot, true, 'Live Records row should show status dot');
    assert.equal(value.hasMenu, true, 'Live Records row should show action menu');
    assert.equal(value.detailTitle, 'Live Record Detail', 'Open should show Live Record Detail');
    assert.match(value.detailText, /Display/);
    assert.match(value.detailText, /Summary/);
    assert.match(value.detailText, /Anchor/);
    assert.match(value.detailText, /Execution/);
    assert.match(value.detailText, /Entry/);
    assert.match(value.detailText, /Stop Loss/);
    assert.match(value.detailText, /Target External 1/);
    assert.match(value.detailText, /Exit Price/);
    assert.match(value.detailText, /Execution Review/);
    assert.match(value.detailText, /Browser reviewed execution/);
    assert.match(value.detailText, /Reviewed/);
    assert.match(value.detailText, /PDA/);
    assert.ok(value.canvasCount > 0, 'chart should render canvas layers');
    assert.equal(value.hasStandaloneLiveOrders, false, 'standalone Live Orders panel should not exist');
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
console.log('live record browser smoke passed');
