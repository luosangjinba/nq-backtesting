import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9341);
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

async function clickWorkspaceSwitch(client, workspace) {
  const selector = `[data-workspace-switch="${workspace}"]`;
  const getPoint = async () => {
    const result = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const button = document.querySelector(${JSON.stringify(selector)});
          if (!button) return null;
          const rect = button.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        })()
      `,
      returnByValue: true,
    });
    return result.result?.value || null;
  };
  const waitForWorkspace = async () => {
    const deadline = Date.now() + 2_000;
    while (Date.now() < deadline) {
      const state = await client.send('Runtime.evaluate', {
        expression: `document.body.dataset.workspace || ''`,
        returnByValue: true,
      });
      if (state.result?.value === workspace) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  };

  const point = await getPoint();
  if (!point) throw new Error(`missing workspace switch: ${workspace}`);
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    clickCount: 1,
  });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    clickCount: 1,
  });
  if (await waitForWorkspace()) return;

  await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const button = document.querySelector(${JSON.stringify(selector)});
        if (!button) return false;
        button.click();
        return true;
      })()
    `,
    returnByValue: true,
  });
  if (!(await waitForWorkspace())) {
    throw new Error(`workspace switch did not activate: ${workspace}`);
  }
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
    await clickWorkspaceSwitch(client, 'journal');

    const writeExpression = `
      (async () => {
        const journalButton = document.querySelector('[data-workspace-switch="journal"]');
        const backtestingButton = document.querySelector('[data-workspace-switch="backtesting"]');
        if (!journalButton || !backtestingButton) return JSON.stringify({ error: 'missing workspace switch' });
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
        const initialTradeText = document.querySelector('.journal-trade-list')?.innerText || '';
        const nextPlanInput = document.querySelector('#journalPreMarketPlan');
        const sessionIntent = document.querySelector('#journalSessionIntent');
        const mentalStateBefore = document.querySelector('#journalMentalStateBefore');
        const intradayStateNotes = document.querySelector('#journalIntradayStateNotes');
        const postMarketSummary = document.querySelector('#journalPostMarketSummary');
        const mainMistake = document.querySelector('#journalMainMistake');
        const bestBehavior = document.querySelector('#journalBestBehavior');
        const nextSessionFocus = document.querySelector('#journalNextSessionFocus');
        const disciplineSummary = document.querySelector('#journalDisciplineSummary');
        if (
          !sessionIntent ||
          !mentalStateBefore ||
          !intradayStateNotes ||
          !postMarketSummary ||
          !mainMistake ||
          !bestBehavior ||
          !nextSessionFocus ||
          !disciplineSummary
        ) return JSON.stringify({ error: 'missing day-level journal inputs' });
        nextPlanInput.value = 'Wait < confirm';
        nextPlanInput.dispatchEvent(new Event('input', { bubbles: true }));
        sessionIntent.value = 'One A+ setup only';
        sessionIntent.dispatchEvent(new Event('input', { bubbles: true }));
        mentalStateBefore.value = 'Calm but cautious';
        mentalStateBefore.dispatchEvent(new Event('input', { bubbles: true }));
        intradayStateNotes.value = 'Felt urge to chase after first move';
        intradayStateNotes.dispatchEvent(new Event('input', { bubbles: true }));
        postMarketSummary.value = 'Executed one planned simulation trade';
        postMarketSummary.dispatchEvent(new Event('input', { bubbles: true }));
        mainMistake.value = 'Watched low-quality chop too long';
        mainMistake.dispatchEvent(new Event('input', { bubbles: true }));
        bestBehavior.value = 'Waited for confirmation before entry';
        bestBehavior.dispatchEvent(new Event('input', { bubbles: true }));
        nextSessionFocus.value = 'Reduce screen time in chop';
        nextSessionFocus.dispatchEvent(new Event('input', { bubbles: true }));
        disciplineSummary.value = 'No real-money impulse trade';
        disciplineSummary.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 350));

        document.querySelector('#journalAddTradeButton').click();
        const tradeDeadline = Date.now() + 5_000;
        while (!document.querySelector('[data-journal-trade-field="netPnl"]') && Date.now() < tradeDeadline) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const tradeType = document.querySelector('[data-journal-trade-field="tradeType"]');
        const instrument = document.querySelector('[data-journal-trade-field="instrument"]');
        const direction = document.querySelector('[data-journal-trade-field="direction"]');
        const result = document.querySelector('[data-journal-trade-field="result"]');
        const netPnl = document.querySelector('[data-journal-trade-field="netPnl"]');
        const manualR = document.querySelector('[data-journal-trade-field="rMultipleManual"]');
        const reflection = document.querySelector('[data-journal-trade-field="reflection"]');
        tradeType.value = 'simulation';
        tradeType.dispatchEvent(new Event('change', { bubbles: true }));
        instrument.value = 'ES';
        instrument.dispatchEvent(new Event('input', { bubbles: true }));
        direction.value = 'short';
        direction.dispatchEvent(new Event('change', { bubbles: true }));
        result.value = 'target';
        result.dispatchEvent(new Event('input', { bubbles: true }));
        netPnl.value = '125.5';
        netPnl.dispatchEvent(new Event('input', { bubbles: true }));
        manualR.value = '1.25';
        manualR.dispatchEvent(new Event('input', { bubbles: true }));
        reflection.value = 'Followed plan';
        reflection.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 350));

        document.querySelector('[data-journal-add-fill]').click();
        const fillDeadline = Date.now() + 5_000;
        while (!document.querySelector('[data-journal-fill-field="price"]') && Date.now() < fillDeadline) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const fillType = document.querySelector('[data-journal-fill-field="type"]');
        const fillTime = document.querySelector('[data-journal-fill-field="time"]');
        const fillPrice = document.querySelector('[data-journal-fill-field="price"]');
        const fillQuantity = document.querySelector('[data-journal-fill-field="quantity"]');
        const fillReason = document.querySelector('[data-journal-fill-field="reason"]');
        fillType.value = 'entry';
        fillType.dispatchEvent(new Event('change', { bubbles: true }));
        fillTime.value = '2026-06-12 09:45';
        fillTime.dispatchEvent(new Event('input', { bubbles: true }));
        fillPrice.value = '5400.25';
        fillPrice.dispatchEvent(new Event('input', { bubbles: true }));
        fillQuantity.value = '2';
        fillQuantity.dispatchEvent(new Event('input', { bubbles: true }));
        fillReason.value = 'entry trigger';
        fillReason.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 350));

        const savedBeforeReload = JSON.parse(localStorage.getItem('v4:journal:default') || '{}');
        const savedTrade = savedBeforeReload.journalDays?.[0]?.liveTrades?.[0] || {};
        return JSON.stringify({
          error: '',
          initialTradeText,
          savedPlan: savedBeforeReload.journalDays?.[0]?.preMarketPlan || '',
          savedSessionIntent: savedBeforeReload.journalDays?.[0]?.sessionIntent || '',
          savedMentalStateBefore: savedBeforeReload.journalDays?.[0]?.mentalStateBefore || '',
          savedIntradayStateNotes: savedBeforeReload.journalDays?.[0]?.intradayStateNotes || '',
          savedPostMarketSummary: savedBeforeReload.journalDays?.[0]?.postMarketSummary || '',
          savedMainMistake: savedBeforeReload.journalDays?.[0]?.mainMistake || '',
          savedBestBehavior: savedBeforeReload.journalDays?.[0]?.bestBehavior || '',
          savedNextSessionFocus: savedBeforeReload.journalDays?.[0]?.nextSessionFocus || '',
          savedDisciplineSummary: savedBeforeReload.journalDays?.[0]?.disciplineSummary || '',
          savedTradeType: savedTrade.tradeType || '',
          savedInstrument: savedTrade.instrument || '',
          savedNetPnl: savedTrade.netPnl,
          savedManualR: savedTrade.rMultipleManual,
          savedFillCount: savedTrade.fills?.length || 0,
          savedFillPrice: savedTrade.fills?.[0]?.price,
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
    assert.match(writeValue.initialTradeText, /No actual trades recorded/);
    assert.equal(writeValue.savedPlan, 'Wait < confirm');
    assert.equal(writeValue.savedSessionIntent, 'One A+ setup only');
    assert.equal(writeValue.savedMentalStateBefore, 'Calm but cautious');
    assert.equal(writeValue.savedIntradayStateNotes, 'Felt urge to chase after first move');
    assert.equal(writeValue.savedPostMarketSummary, 'Executed one planned simulation trade');
    assert.equal(writeValue.savedMainMistake, 'Watched low-quality chop too long');
    assert.equal(writeValue.savedBestBehavior, 'Waited for confirmation before entry');
    assert.equal(writeValue.savedNextSessionFocus, 'Reduce screen time in chop');
    assert.equal(writeValue.savedDisciplineSummary, 'No real-money impulse trade');
    assert.equal(writeValue.savedTradeType, 'simulation');
    assert.equal(writeValue.savedInstrument, 'ES');
    assert.equal(writeValue.savedNetPnl, 125.5);
    assert.equal(writeValue.savedManualR, 1.25);
    assert.equal(writeValue.savedFillCount, 1);
    assert.equal(writeValue.savedFillPrice, 5400.25);
    assert.equal(writeValue.workspaceBeforeReload, 'journal');
    assert.equal(writeValue.journalHiddenBeforeReload, false);

    await client.send('Page.navigate', { url: PAGE_URL });
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    const restoreExpression = `
      (async () => {
        const deadline = Date.now() + 10_000;
        while (
          (
            document.readyState !== 'complete' ||
            !document.querySelector('#journalPreMarketPlan') ||
            document.body.dataset.workspace !== 'journal'
          ) &&
          Date.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const restoredPlanInput = document.querySelector('#journalPreMarketPlan');
        const restoredSessionIntent = document.querySelector('#journalSessionIntent');
        const restoredMentalStateBefore = document.querySelector('#journalMentalStateBefore');
        const restoredIntradayStateNotes = document.querySelector('#journalIntradayStateNotes');
        const restoredPostMarketSummary = document.querySelector('#journalPostMarketSummary');
        const restoredMainMistake = document.querySelector('#journalMainMistake');
        const restoredBestBehavior = document.querySelector('#journalBestBehavior');
        const restoredNextSessionFocus = document.querySelector('#journalNextSessionFocus');
        const restoredDisciplineSummary = document.querySelector('#journalDisciplineSummary');
        const restoredDateInput = document.querySelector('#journalDateInput');
        const workspaceAfterReload = document.body.dataset.workspace;
        const restoredTradeText = document.querySelector('.journal-trade-list')?.innerText || '';
        return JSON.stringify({
          error: '',
          workspaceAfterReload,
          restoredPlan: restoredPlanInput?.value || '',
          restoredSessionIntent: restoredSessionIntent?.value || '',
          restoredMentalStateBefore: restoredMentalStateBefore?.value || '',
          restoredIntradayStateNotes: restoredIntradayStateNotes?.value || '',
          restoredPostMarketSummary: restoredPostMarketSummary?.value || '',
          restoredMainMistake: restoredMainMistake?.value || '',
          restoredBestBehavior: restoredBestBehavior?.value || '',
          restoredNextSessionFocus: restoredNextSessionFocus?.value || '',
          restoredDisciplineSummary: restoredDisciplineSummary?.value || '',
          restoredDate: restoredDateInput?.value || '',
          restoredTradeText,
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
    assert.equal(value.restoredPlan, 'Wait < confirm');
    assert.equal(value.restoredSessionIntent, 'One A+ setup only');
    assert.equal(value.restoredMentalStateBefore, 'Calm but cautious');
    assert.equal(value.restoredIntradayStateNotes, 'Felt urge to chase after first move');
    assert.equal(value.restoredPostMarketSummary, 'Executed one planned simulation trade');
    assert.equal(value.restoredMainMistake, 'Watched low-quality chop too long');
    assert.equal(value.restoredBestBehavior, 'Waited for confirmation before entry');
    assert.equal(value.restoredNextSessionFocus, 'Reduce screen time in chop');
    assert.equal(value.restoredDisciplineSummary, 'No real-money impulse trade');
    assert.equal(value.restoredDate, '2026-06-12');
    assert.match(value.restoredTradeText, /simulation/);
    assert.match(value.restoredTradeText, /ES/);
    assert.match(value.restoredTradeText, /PnL 125.5/);
    assert.match(value.restoredTradeText, /Fills 1/);

    const isolationExpression = `
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const waitForSelector = async (selector) => {
          const deadline = Date.now() + 5_000;
          while (!document.querySelector(selector) && Date.now() < deadline) {
            await wait(100);
          }
          return document.querySelector(selector);
        };

        const dateInput = await waitForSelector('#journalDateInput');
        dateInput.value = '2026-06-13';
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        await wait(250);
        const nextDateTradeText = document.querySelector('.journal-trade-list')?.innerText || '';
        const nextDatePlan = document.querySelector('#journalPreMarketPlan')?.value || '';
        const nextDateFocus = document.querySelector('#journalNextSessionFocus')?.value || '';

        const accountInput = await waitForSelector('#journalAccountInput');
        accountInput.value = 'funded';
        accountInput.dispatchEvent(new Event('change', { bubbles: true }));
        await wait(250);
        const fundedTradeText = document.querySelector('.journal-trade-list')?.innerText || '';
        const fundedPlan = document.querySelector('#journalPreMarketPlan')?.value || '';
        const fundedFocus = document.querySelector('#journalNextSessionFocus')?.value || '';

        const restoredAccountInput = await waitForSelector('#journalAccountInput');
        restoredAccountInput.value = 'default';
        restoredAccountInput.dispatchEvent(new Event('change', { bubbles: true }));
        await wait(250);
        const restoredDateInput = await waitForSelector('#journalDateInput');
        restoredDateInput.value = '2026-06-12';
        restoredDateInput.dispatchEvent(new Event('change', { bubbles: true }));
        await wait(250);
        const restoredDefaultTradeText = document.querySelector('.journal-trade-list')?.innerText || '';

        const defaultPayload = JSON.parse(localStorage.getItem('v4:journal:default') || '{}');
        const fundedPayload = JSON.parse(localStorage.getItem('v4:journal:funded') || '{}');
        const defaultDay = defaultPayload.journalDays?.find((day) => day.date === '2026-06-12') || {};
        const fundedDay = fundedPayload.journalDays?.find((day) => day.date === '2026-06-13') || {};
        return JSON.stringify({
          nextDateTradeText,
          nextDatePlan,
          nextDateFocus,
          fundedTradeText,
          fundedPlan,
          fundedFocus,
          restoredDefaultTradeText,
          defaultTradeCount: defaultDay.liveTrades?.length || 0,
          defaultFillCount: defaultDay.liveTrades?.[0]?.fills?.length || 0,
          fundedTradeCount: fundedDay.liveTrades?.length || 0,
        });
      })()
    `;
    const isolationResult = await client.send('Runtime.evaluate', {
      expression: isolationExpression,
      awaitPromise: true,
      returnByValue: true,
    });
    const isolationValue = JSON.parse(isolationResult.result?.value || '{}');
    assert.match(isolationValue.nextDateTradeText, /No actual trades recorded/);
    assert.equal(isolationValue.nextDatePlan, '');
    assert.equal(isolationValue.nextDateFocus, '');
    assert.match(isolationValue.fundedTradeText, /No actual trades recorded/);
    assert.equal(isolationValue.fundedPlan, '');
    assert.equal(isolationValue.fundedFocus, '');
    assert.match(isolationValue.restoredDefaultTradeText, /simulation/);
    assert.match(isolationValue.restoredDefaultTradeText, /ES/);
    assert.equal(isolationValue.defaultTradeCount, 1);
    assert.equal(isolationValue.defaultFillCount, 1);
    assert.equal(isolationValue.fundedTradeCount, 0);

    await clickWorkspaceSwitch(client, 'backtesting');
    await new Promise((resolve) => setTimeout(resolve, 100));
    const backtestingResult = await client.send('Runtime.evaluate', {
      expression: `JSON.stringify({
        workspaceAfterBacktestingSwitch: document.body.dataset.workspace,
        backtestingHiddenAfterSwitch: document.querySelector('#backtesting-workspace')?.hidden || false,
        chartCanvasCount: document.querySelectorAll('#chart canvas').length,
      })`,
      returnByValue: true,
    });
    const backtestingValue = JSON.parse(backtestingResult.result?.value || '{}');
    assert.equal(backtestingValue.workspaceAfterBacktestingSwitch, 'backtesting');
    assert.equal(backtestingValue.backtestingHiddenAfterSwitch, false);
    assert.ok(backtestingValue.chartCanvasCount > 0, 'backtesting chart canvas should still exist');
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
