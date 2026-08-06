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
  const file = path.join(VISUAL_ROOT, `${name}-1440x900.png`);
  let actual;
  if (process.env.V7_UPDATE_VISUALS === '1') {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    actual = Buffer.from(data, 'base64');
    fs.writeFileSync(file, actual);
  }
  else {
    assert.ok(fs.existsSync(file), `missing visual fixture ${path.basename(file)}; run with V7_UPDATE_VISUALS=1`);
    const expected = fs.readFileSync(file);
    let matches = false;
    for (let attempt = 0; attempt < 5 && !matches; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await evaluate(cdp, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      }
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      actual = Buffer.from(data, 'base64');
      matches = actual.equals(expected);
    }
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
      const nativeFetch = globalThis.fetch.bind(globalThis);
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [1780693200000])); }
        static now() { return 1780693200000; }
      };
      globalThis.fetch = async (input, options) => {
        if (String(input).includes('/v4/available_dates')) {
          const dates = [
            '2026-05-01', '2026-05-03', '2026-05-05', '2026-05-08',
            '2026-06-05', '2026-06-07', '2026-06-10', '2026-06-12',
          ];
          return new Response(JSON.stringify({
            schemaVersion: 1,
            timeZone: 'America/New_York',
            instruments: [
              { instrument: 'NQ', dates, firstTimestamp: '2026-05-01T09:30', latestTimestamp: '2026-06-12T16:00' },
              { instrument: 'ES', dates, firstTimestamp: '2026-05-01T09:30', latestTimestamp: '2026-06-12T16:00' },
            ],
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return nativeFetch(input, options);
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
    const input = document.querySelector('[name="instrument"]');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  assert.equal(await evaluate(cdp, `document.querySelector('.instrument-picker').open`), false,
    'choosing an instrument must collapse the dropdown');
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
  const datePickerEvidence = await evaluate(cdp, `(() => {
    const start = document.querySelectorAll('.date-time-control')[0];
    start.querySelector('.date-time-trigger').click();
    const days = start.querySelectorAll('.date-time-day');
    const initial = {
      open: !start.querySelector('.date-time-popover').hidden,
      dayCount: days.length,
      heading: start.querySelector('.date-time-heading').textContent,
    };
    start.querySelectorAll('.date-time-heading-button')[0].click();
    const monthCount = start.querySelectorAll('.date-time-choice').length;
    start.querySelector('.date-time-heading-button').click();
    const yearCount = start.querySelectorAll('.date-time-choice').length;
    start.querySelectorAll('.date-time-choice')[6].click();
    start.querySelectorAll('.date-time-choice')[5].click();
    return {
      ...initial,
      monthCount,
      yearCount,
      availableEnabled: !start.querySelector('[data-date="2026-06-05"]').disabled,
      unavailableDisabled: start.querySelector('[data-date="2026-06-04"]').disabled,
      outsideDisabled: [...start.querySelectorAll('.date-time-day.is-outside')].every((day) => day.disabled),
      saturdayStartEnabled: !start.querySelector('[data-date="2026-06-06"]').disabled,
      saturdayEndEnabled: !document.querySelectorAll('.date-time-control')[1]
        .querySelector('[data-date="2026-06-06"]').disabled,
      partialLatestSaturdayEndDisabled: document.querySelectorAll('.date-time-control')[1]
        .querySelector('[data-date="2026-06-13"]').disabled,
    };
  })()`);
  assert.deepEqual(datePickerEvidence, {
    open: true, dayCount: 42, heading: 'June2026', monthCount: 12, yearCount: 10,
    availableEnabled: true, unavailableDisabled: true, outsideDisabled: true,
    saturdayStartEnabled: true, saturdayEndEnabled: true, partialLatestSaturdayEndDisabled: true,
  }, 'Session picker must disable source-empty and outside-month dates while retaining navigation views');
  await capture(cdp, 'date-time-picker-open');
  const todayEvidence = await evaluate(cdp, `(() => {
    const start = document.querySelectorAll('.date-time-control')[0];
    start.querySelector('.date-time-today').click();
    const value = document.querySelector('.create-form').elements.start.value;
    start.querySelector('.date-time-clear').click();
    return { value, cleared: document.querySelector('.create-form').elements.start.value };
  })()`);
  assert.equal(todayEvidence.value.startsWith('2026-06-05T'), true, 'Today must use the injected deterministic browser clock');
  assert.equal(todayEvidence.cleared, '', 'Clear must restore the empty field contract');
  const latestBoundaryEvidence = await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'Too late';
    form.elements.start.value = '2026-06-12T15:00';
    form.elements.end.value = '2026-06-12T16:01';
    form.requestSubmit();
    return form.querySelector('.form-error').textContent;
  })()`);
  assert.equal(
    latestBoundaryEvidence,
    'End time must be on or before 2026-06-12 16:00 New York time.',
    'the latest data date stays selectable while time after the final bar is rejected',
  );
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'Session Alpha';
    form.querySelectorAll('[name="instrument"]')[0].checked = true;
    form.elements.start.value = '2026-05-01T09:30';
    form.elements.end.value = '2026-05-05T16:00';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`);
  assert.match(await evaluate(cdp, `location.hash`), /^#\/session\/session-/,
    'successful create must route directly to the new NQ chart');
  assert.equal(await evaluate(cdp, `document.querySelector('h1').textContent`), 'Session Alpha');
  await evaluate(cdp, `document.querySelector('.replay-back').click()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 1`);

  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
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
    form.elements.start.value = '2026-05-02T12:34';
    form.elements.end.value = '2026-05-09T12:34';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('#app').dataset.screen === 'opened' && document.querySelector('h1')?.textContent === 'Session Beta'`);
  assert.match(await evaluate(cdp, `location.hash`), /^#\/session\/session-/,
    'successful unsupported-surface create must still open the new Session route');
  await evaluate(cdp, `document.querySelector('.opened-header .button').click()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 2 && document.querySelector('#app').dataset.viewState === 'ready'`);
  assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('.session-card h3')].map((node) => node.textContent)`),
    ['Session Alpha', 'Session Beta']);
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.session-card .delete-session-button').length`), 2,
    'every Session card must expose its own Delete action');
  assert.equal(await evaluate(cdp, `document.querySelector('.session-list').textContent.includes('Created')`), false,
    'Session cards must present the historical range without an ambiguous creation timestamp');
  await capture(cdp, 'ready-two-sessions');

  assert.equal(await evaluate(cdp, clickCardByName('Session Alpha')), true);
  await waitFor(cdp, `document.querySelector('#app').dataset.screen === 'opened' && document.querySelector('h1')?.textContent === 'Session Alpha'`);
  await evaluate(cdp, `document.querySelector('.replay-back, .opened-header .button').click()`);
  await waitFor(cdp, `document.querySelector('#app').dataset.screen === 'list' && document.querySelectorAll('.session-card').length === 2`);
  assert.equal(await evaluate(cdp, clickCardByName('Session Beta')), true);
  await waitFor(cdp, `document.querySelector('#app').dataset.screen === 'opened' && document.querySelector('h1')?.textContent === 'Session Beta'`);

  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `document.querySelector('#app')?.dataset.viewState === 'ready' && document.querySelector('h1')?.textContent === 'Session Beta'`);
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
      ranges: Object.fromEntries(records.map((record) => [record.metadata.name,
        record.configuration.historicalRange])),
      sessions: Object.fromEntries(records.map((record) => [record.metadata.name, record.activationGeneration.value])),
    };
  })()`);
  assert.deepEqual(storageEvidence.sessions, { 'Session Alpha': 3, 'Session Beta': 3 });
  assert.deepEqual(storageEvidence.ranges, {
    'Session Alpha': {
      startEpochMs: Date.parse('2026-05-01T13:30:00Z'),
      endEpochMs: Date.parse('2026-05-05T20:00:00Z'),
      presentationEndEpochMs: Date.parse('2026-05-05T20:00:00Z'),
    },
    'Session Beta': {
      startEpochMs: Date.parse('2026-05-03T22:00:00Z'),
      endEpochMs: Date.parse('2026-05-08T21:00:00Z'),
      presentationEndEpochMs: Date.parse('2026-05-08T20:59:00Z'),
    },
  }, 'Session creation must persist New York input and resolve Saturday to adjacent CME boundaries');
  assert.equal(storageEvidence.keys.some((key) => /active|current|last-opened/i.test(key)), false);

  await evaluate(cdp, `document.querySelector('.replay-back, .opened-header .button').click()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 2`);
  const confirmationEvidence = await evaluate(cdp, `(() => {
    const card = [...document.querySelectorAll('.session-card')]
      .find((node) => node.querySelector('h3')?.textContent === 'Session Beta');
    card.querySelector('.delete-session-button').click();
    return {
      confirmation: card.querySelector('.session-delete-question').textContent,
      focusedLabel: document.activeElement.getAttribute('aria-label'),
      standardHidden: card.querySelector('.session-card-actions').hidden,
    };
  })()`);
  assert.deepEqual(confirmationEvidence, {
    confirmation: 'Delete permanently?',
    focusedLabel: 'Confirm delete Session Beta',
    standardHidden: true,
  }, 'Delete must require an explicit focused confirmation');
  await capture(cdp, 'delete-confirmation');
  await evaluate(cdp, `(() => {
    const card = [...document.querySelectorAll('.session-card')]
      .find((node) => node.querySelector('h3')?.textContent === 'Session Beta');
    card.querySelector('.session-delete-cancel').click();
  })()`);
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.session-card').length`), 2,
    'cancelling deletion must preserve every Session');
  await evaluate(cdp, `(() => {
    const card = [...document.querySelectorAll('.session-card')]
      .find((node) => node.querySelector('h3')?.textContent === 'Session Beta');
    card.querySelector('.delete-session-button').click();
    card.querySelector('.session-delete-confirm').click();
  })()`);
  await waitFor(cdp, `document.querySelector('#app').dataset.viewState === 'ready'
    && document.querySelectorAll('.session-card').length === 1`);
  assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('.session-card h3')]
    .map((node) => node.textContent)`), ['Session Alpha']);
  const deleteStorageEvidence = await evaluate(cdp, `(() => {
    const keys = Object.keys(localStorage).sort();
    const records = keys.filter((key) => key.includes(':record:'))
      .map((key) => JSON.parse(localStorage.getItem(key)).value.metadata.name);
    const index = JSON.parse(localStorage.getItem(keys.find((key) => key.endsWith(':index'))));
    return { indexedCount: index.sessionIds.length, recordNames: records };
  })()`);
  assert.deepEqual(deleteStorageEvidence, { indexedCount: 1, recordNames: ['Session Alpha'] },
    'confirmed deletion must remove both the indexed identity and persisted Session record');

  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
  await evaluate(cdp, `document.querySelector('.date-time-trigger').click()`);
  const rapidClickPoint = await evaluate(cdp, `(() => {
    document.getSelection().removeAllRanges();
    const button = document.querySelector('.date-time-step[aria-label="Increase hour"]');
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  for (const clickCount of [1, 2]) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', button: 'left', buttons: 1, clickCount, ...rapidClickPoint,
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', button: 'left', buttons: 0, clickCount, ...rapidClickPoint,
    });
  }
  assert.deepEqual(await evaluate(cdp, `(() => ({
    selectedText: document.getSelection().toString(),
    userSelect: getComputedStyle(document.querySelector('.date-time-popover')).userSelect,
  }))()`), {
    selectedText: '', userSelect: 'none',
  }, 'rapid time-stepper clicks must not select calendar text');

  console.log('v7 Session Browser browser harness passed (create, A/B navigation, confirmed delete, 6 visual fixtures)');
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
