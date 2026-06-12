import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9339);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-journal-workspace-browser-smoke-profile-${process.pid}`;

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
    'about:blank',
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
    await new Promise((resolve) => setTimeout(resolve, 2_500));

    const writeExpression = `
      (async () => {
        const journalButton = document.querySelector('[data-workspace-switch="journal"]');
        const backtestingButton = document.querySelector('[data-workspace-switch="backtesting"]');
        if (!journalButton || !backtestingButton) return JSON.stringify({ error: 'missing workspace switch' });
        journalButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const deadline = Date.now() + 5_000;
        while (
          (!document.querySelector('#journalPreMarketPlan') || document.body.dataset.workspace !== 'journal') &&
          Date.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const dateInput = document.querySelector('#journalDateInput');
        const planInput = document.querySelector('#journalPreMarketPlan');
        if (!dateInput || !planInput) return JSON.stringify({ error: 'missing journal inputs' });
        dateInput.value = '2026-06-12';
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 100));
        const nextPlanInput = document.querySelector('#journalPreMarketPlan');
        nextPlanInput.value = 'Wait < confirm';
        nextPlanInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 350));

        const savedBeforeReload = JSON.parse(localStorage.getItem('v4:journal:default') || '{}');
        return JSON.stringify({
          error: '',
          savedPlan: savedBeforeReload.journalDays?.[0]?.preMarketPlan || '',
          workspaceBeforeReload: document.body.dataset.workspace,
          journalHiddenBeforeReload: document.querySelector('#journal-workspace')?.hidden || false,
        });
      })()
    `;
    const writeResult = await client.send('Runtime.evaluate', {
      expression: writeExpression,
      awaitPromise: true,
      returnByValue: true,
    });
    const writeValue = JSON.parse(writeResult.result?.value || '{}');
    assert.equal(writeValue.error, '', writeValue.error || 'journal workspace write failed');
    assert.equal(writeValue.savedPlan, 'Wait < confirm');
    assert.equal(writeValue.workspaceBeforeReload, 'journal');
    assert.equal(writeValue.journalHiddenBeforeReload, false);

    await client.send('Page.reload', { ignoreCache: true });
    await new Promise((resolve) => setTimeout(resolve, 1_200));

    const restoreExpression = `
      (async () => {
        const restoredPlanInput = document.querySelector('#journalPreMarketPlan');
        const restoredDateInput = document.querySelector('#journalDateInput');
        const workspaceAfterReload = document.body.dataset.workspace;
        document.querySelector('[data-workspace-switch="backtesting"]').click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        return JSON.stringify({
          error: '',
          workspaceAfterReload,
          workspaceAfterBacktestingSwitch: document.body.dataset.workspace,
          restoredPlan: restoredPlanInput?.value || '',
          restoredDate: restoredDateInput?.value || '',
          backtestingHiddenAfterSwitch: document.querySelector('#backtesting-workspace')?.hidden || false,
          chartCanvasCount: document.querySelectorAll('#chart canvas').length,
        });
      })()
    `;
    const result = await client.send('Runtime.evaluate', {
      expression: restoreExpression,
      awaitPromise: true,
      returnByValue: true,
    });
    const value = JSON.parse(result.result?.value || '{}');
    assert.equal(value.error, '', value.error || 'journal workspace browser smoke failed');
    assert.equal(value.workspaceAfterReload, 'journal');
    assert.equal(value.workspaceAfterBacktestingSwitch, 'backtesting');
    assert.equal(value.restoredPlan, 'Wait < confirm');
    assert.equal(value.restoredDate, '2026-06-12');
    assert.equal(value.backtestingHiddenAfterSwitch, false);
    assert.ok(value.chartCanvasCount > 0, 'backtesting chart canvas should still exist');
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
console.log('journal workspace browser smoke passed');
