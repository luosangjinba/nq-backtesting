import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const VISUAL_ROOT = path.join(TEST_DIR, 'fixtures/session-browser');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-r2-2-chrome-'));
const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-breakpad',
  '--disable-crash-reporter',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-port=0',
  '--window-size=1440,900',
  `--user-data-dir=${userDataDirectory}`,
  'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

function clickCardByName(name) {
  return `(() => {
    const card = [...document.querySelectorAll('.session-card')].find((node) => node.querySelector('h3')?.textContent === ${JSON.stringify(name)});
    if (!card) return false;
    card.querySelector('.open-session-button').click();
    return true;
  })()`;
}

async function capture(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const actual = Buffer.from(data, 'base64');
  const file = path.join(VISUAL_ROOT, `${name}-1440x900.png`);
  if (process.env.V7_UPDATE_VISUALS === '1') fs.writeFileSync(file, actual);
  else {
    assert.ok(fs.existsSync(file), `missing visual fixture ${path.basename(file)}; run with V7_UPDATE_VISUALS=1`);
    const matches = actual.equals(fs.readFileSync(file));
    if (!matches) fs.writeFileSync(path.join(os.tmpdir(), `v7-${name}-actual.png`), actual);
    assert.equal(matches, true, `${name} visual fixture changed`);
  }
}

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `{
      const NativeDate = Date;
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [1780693200000])); }
        static now() { return 1780693200000; }
      };
    }`,
  });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/` });
  await waitFor(cdp, `document.querySelector('#app')?.dataset.viewState === 'empty'`);
  assert.equal(await evaluate(cdp, `document.querySelector('h1').textContent`), 'Replay sessions');
  await capture(cdp, 'empty');

  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
  const defaultDraft = await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    return {
      name: form.elements.name.value,
      instrumentIds: [...form.querySelectorAll('[name="instrument"]:checked')].map((input) => input.value),
      start: form.elements.start.value,
      end: form.elements.end.value,
      query: form.querySelector('.instrument-picker-search').value,
      pickerOpen: form.querySelector('.instrument-picker').open,
    };
  })()`);
  assert.equal(defaultDraft.name, '');
  assert.deepEqual(defaultDraft.instrumentIds, []);
  assert.equal(defaultDraft.start, '');
  assert.equal(defaultDraft.end, '');
  assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('.instrument-category')].map((node) => node.textContent)`),
    ['All', 'Futures'], 'category filters must derive from instrument configuration');
  const searchEvidence = await evaluate(cdp, `(() => {
    document.querySelector('.instrument-picker').open = true;
    const search = document.querySelector('.instrument-picker-search');
    search.value = 'S&P';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const visible = [...document.querySelectorAll('.instrument-picker-option:not([hidden]) .instrument-symbol')]
      .map((node) => node.textContent);
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.instrument-picker-trigger').focus();
    return visible;
  })()`);
  assert.deepEqual(searchEvidence, ['ES'], 'instrument dropdown search must filter configuration-driven options');
  await capture(cdp, 'create-dialog');
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'Session Alpha';
    form.querySelectorAll('[name="instrument"]')[0].checked = true;
    form.elements.start.value = '2026-05-01T09:30';
    form.elements.end.value = '2026-05-05T16:00';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 1 && document.querySelector('#app').dataset.viewState === 'ready'`);

  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
  const reopenedDraft = await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    return {
      name: form.elements.name.value,
      instrumentIds: [...form.querySelectorAll('[name="instrument"]:checked')].map((input) => input.value),
      start: form.elements.start.value,
      end: form.elements.end.value,
      query: form.querySelector('.instrument-picker-search').value,
      pickerOpen: form.querySelector('.instrument-picker').open,
    };
  })()`);
  assert.deepEqual(reopenedDraft, defaultDraft, 'each Create Session open must start from the default draft');
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'Session Beta';
    const instruments = [...form.querySelectorAll('[name="instrument"]')];
    instruments[0].checked = false;
    instruments[1].checked = true;
    form.elements.start.value = '2026-06-10T09:30';
    form.elements.end.value = '2026-06-12T16:00';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 2 && document.querySelector('#app').dataset.viewState === 'ready'`);
  assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('.session-card h3')].map((node) => node.textContent)`),
    ['Session Alpha', 'Session Beta']);
  await capture(cdp, 'ready-two-sessions');

  assert.equal(await evaluate(cdp, clickCardByName('Session Alpha')), true);
  await waitFor(cdp, `document.querySelector('#app').dataset.screen === 'opened' && document.querySelector('h1')?.textContent === 'Session Alpha'`);
  await evaluate(cdp, `document.querySelector('.opened-header .button').click()`);
  await waitFor(cdp, `document.querySelector('#app').dataset.screen === 'list' && document.querySelectorAll('.session-card').length === 2`);
  assert.equal(await evaluate(cdp, clickCardByName('Session Beta')), true);
  await waitFor(cdp, `document.querySelector('#app').dataset.screen === 'opened' && document.querySelector('h1')?.textContent === 'Session Beta'`);

  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `document.querySelector('#app').dataset.viewState === 'ready' && document.querySelector('h1')?.textContent === 'Session Beta'`);
  assert.equal(await evaluate(cdp, `document.body.textContent.includes('Session Alpha')`), false,
    'hard refresh while B is open must not display A metadata');
  await capture(cdp, 'opened-beta-after-refresh');

  await evaluate(cdp, `document.querySelector('.opened-header .button').click()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 2`);
  assert.equal(await evaluate(cdp, clickCardByName('Session Alpha')), true);
  await waitFor(cdp, `document.querySelector('h1')?.textContent === 'Session Alpha'`);

  const storageEvidence = await evaluate(cdp, `(() => {
    const keys = Object.keys(localStorage).sort();
    const records = keys.filter((key) => key.includes(':record:')).map((key) => JSON.parse(localStorage.getItem(key)).value);
    return {
      keys,
      sessions: Object.fromEntries(records.map((record) => [record.metadata.name, record.activationGeneration.value])),
    };
  })()`);
  assert.deepEqual(storageEvidence.sessions, { 'Session Alpha': 2, 'Session Beta': 2 });
  assert.equal(storageEvidence.keys.some((key) => /active|current|last-opened/i.test(key)), false);

  console.log('v7 Session Browser browser harness passed (fresh drafts, instrument dropdown, A/B navigation, hard refresh, 4 visual fixtures)');
} finally {
  cdp?.close();
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
  ]);
  if (!stopped) {
    chrome.kill('SIGKILL');
    await exited;
  }
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => setTimeout(resolve, 200));
  await fs.promises.rm(userDataDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
}
