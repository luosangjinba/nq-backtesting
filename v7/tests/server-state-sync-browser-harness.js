import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLayoutSync } from '../src/layout-sync-domain/public.js';
import { createPaneLayout } from '../src/pane-layout-domain/public.js';
import { encodeCalculatedSeriesDocumentEnvelope } from '../src/calculated-series-persistence/public.js';
import { createServerStateSync } from '../src/server-state-sync/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createStorageAdapter, createSessionRepository } from '../src/session-persistence/public.js';
import { createSessionStore } from '../src/session-store/public.js';
import {
  canonicalJson,
  createCampaignDocument,
  createCampaignIndex,
  createCampaignRecord,
  createSeedDefinitions,
  VALIDATION_CAMPAIGN_DOCUMENT_PREFIX,
  VALIDATION_CAMPAIGN_INDEX_KEY,
} from '../src/validation-study-domain/public.js';
import { createWorkspaceCheckpoint } from '../src/workspace-checkpoint-domain/public.js';
import { createStateProxy } from '../scripts/state-proxy.mjs';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

assert.equal(typeof createServerStateSync, 'function');

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-state-sync-browser-'));
const database = path.join(temporaryDirectory, 'state.sqlite3');
const stateScript = path.join(repositoryRoot, 'v7/server/state_api.py');

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startStateService(port) {
  const process = spawn('python3', [stateScript, '--db', database, '--port', String(port)], {
    cwd: repositoryRoot,
    stdio: 'ignore',
  });
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error('state service exited before readiness');
    try {
      if ((await fetch(`http://127.0.0.1:${port}/v7/state/health`)).ok) return process;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('state service did not become ready');
}

async function persistedFixture() {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(String(key)) ?? null,
    removeItem: (key) => values.delete(String(key)),
    setItem: (key, value) => values.set(String(key), String(value)),
  };
  const repository = createSessionRepository({
    namespace: 'v7.session-browser',
    storage: createStorageAdapter(storage),
  });
  const store = createSessionStore({ repository });
  const sessionId = createSessionId('session-cross-device');
  const configuration = {
    historicalRange: {
      endEpochMs: 1_780_438_800_000,
      presentationEndEpochMs: 1_780_438_800_000,
      startEpochMs: 1_780_427_200_000,
    },
    instrumentIds: ['instrument.cme.nq'],
  };
  store.createSession({
    ...configuration,
    name: 'Cross-device Session',
    nowEpochMs: 1_780_427_200_000,
    sessionId,
  });
  const checkpoint = createWorkspaceCheckpoint({
    activePaneId: 'pane-main',
    cursorEpochMs: 1_780_427_500_000,
    panes: [{
      instrumentId: 'instrument.cme.nq',
      paneId: 'pane-main',
      timeframeId: 'timeframe.display-1-minute',
      viewport: { latestOffsetBars: -3, origin: 'manual', spanBars: 180 },
    }],
    sessionHoursMode: 'eth',
  }, configuration);
  store.saveWorkspaceCheckpoint(sessionId, {
    checkpoint,
    layout: createPaneLayout(),
    layoutSync: createLayoutSync(),
    nowEpochMs: 1_780_427_500_000,
  });
  const calculatedSeries = encodeCalculatedSeriesDocumentEnvelope('session-cross-device', {
    documentRevision: 1,
    schemaVersion: 1,
    sessionId: 'session-cross-device',
    workspacePanes: [],
  });
  values.set(calculatedSeries.key, calculatedSeries.raw);
  const campaignId = '00000000-0000-4000-8000-000000000121';
  const definitions = await createSeedDefinitions(globalThis.crypto);
  const campaign = await createCampaignRecord({
    authorLabel: 'Cross-device reviewer',
    campaignId,
    contextTimeframeId: 'timeframe.display-5-minute',
    direction: 'long',
    executionTimeframeId: 'timeframe.display-1-minute',
    instrumentId: 'instrument.cme.nq',
    nowEpochMs: 1_780_427_200_000,
    outcomeDefinitionRef: definitions.outcomeDefinitionRef,
    sessionHoursId: 'session-hours.cme-eth',
    setupDefinitionRef: definitions.setupDefinitionRef,
    title: 'Cross-device Validation Campaign',
  });
  const campaignDocument = await createCampaignDocument({
    campaign,
    crypto: globalThis.crypto,
    nowEpochMs: 1_780_427_200_000,
    outcomeDefinitions: [definitions.outcomeDefinition],
    setupDefinitions: [definitions.setupDefinition],
  });
  const campaignIndex = await createCampaignIndex({
    campaignIds: [campaignId],
    crypto: globalThis.crypto,
    nowEpochMs: 1_780_427_200_000,
  });
  values.set(VALIDATION_CAMPAIGN_INDEX_KEY, canonicalJson(campaignIndex));
  values.set(`${VALIDATION_CAMPAIGN_DOCUMENT_PREFIX}${campaignId}`, canonicalJson(campaignDocument));
  return Object.freeze(Object.fromEntries(values));
}

async function runProfile(webPort, profilePath, seed = null) {
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
    '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--window-size=1280,900',
    `--user-data-dir=${profilePath}`, 'about:blank',
  ], { stdio: 'ignore' });
  let cdp = null;
  try {
    const activePortFile = path.join(profilePath, 'DevToolsActivePort');
    const deadline = Date.now() + 8_000;
    while (!fs.existsSync(activePortFile) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const debugPort = fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `{
        globalThis.__stateSyncErrors = [];
        addEventListener('error', (event) => globalThis.__stateSyncErrors.push(event.message));
        addEventListener('unhandledrejection', (event) => globalThis.__stateSyncErrors.push(String(event.reason)));
      }`,
    });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/` });
    try {
      await waitFor(cdp, `document.querySelector('[data-state-sync-status]')?.dataset.stateSyncStatus === 'synced'`);
    } catch (error) {
      const diagnostic = await evaluate(cdp, `({
        body: document.body.innerText,
        errors: globalThis.__stateSyncErrors,
        status: document.querySelector('[data-state-sync-status]')?.dataset.stateSyncStatus ?? null,
      })`);
      throw new Error(`${error.message}: ${JSON.stringify(diagnostic)}`);
    }
    if (seed) {
      await evaluate(cdp, `(() => {
        const entries = ${JSON.stringify(seed)};
        for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
      })()`);
      await cdp.send('Page.reload', { ignoreCache: true });
    }
    try {
      await waitFor(cdp, `document.querySelector('[data-state-sync-status]')?.dataset.stateSyncStatus === 'synced'
        && [...document.querySelectorAll('.session-card h3')]
          .some((node) => node.textContent === 'Cross-device Session')`);
    } catch (error) {
      const diagnostic = await evaluate(cdp, `({
        body: document.body.innerText.slice(0, 1200),
        campaignKeys: Object.keys(localStorage).filter((key) => key.startsWith('v7.validation-campaign:')),
        errors: globalThis.__stateSyncErrors,
        sessionKeys: Object.keys(localStorage).filter((key) => key.startsWith('v7.session-browser:')),
        status: document.querySelector('[data-state-sync-status]')?.dataset.stateSyncStatus ?? null,
      })`);
      throw new Error(`${error.message}: ${JSON.stringify(diagnostic)}`);
    }
    const result = await evaluate(cdp, `(() => {
      const recordKey = [...Array(localStorage.length).keys()]
        .map((index) => localStorage.key(index))
        .find((key) => key.startsWith('v7.session-browser:record:'));
      const entry = JSON.parse(localStorage.getItem(recordKey));
      return {
        campaignBytes: [...Array(localStorage.length).keys()]
          .map((index) => localStorage.key(index))
          .filter((key) => key.startsWith('v7.validation-campaign:'))
          .sort()
          .map((key) => [key, localStorage.getItem(key)]),
        calculatedSeriesSidecar: localStorage.getItem(
          'v7.calculated-series:document:session-cross-device'
        ),
        checkpoint: entry.value.workspace.checkpoint,
        sessionCount: document.querySelectorAll('.session-card').length,
        syncMessage: document.querySelector('.local-note').textContent,
      };
    })()`);
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/#/campaigns` });
    await waitFor(cdp, `[...document.querySelectorAll('.validation-card h2')]
      .some((node) => node.textContent === 'Cross-device Validation Campaign')`);
    result.campaignTitle = await evaluate(cdp, `document.querySelector('.validation-card h2').textContent`);
    return result;
  } finally {
    try { cdp?.close(); } catch {}
    const exited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill('SIGTERM');
    await exited;
  }
}

const statePort = await reservePort();
const stateService = await startStateService(statePort);
const webServer = createStaticServer(repositoryRoot, {
  stateProxy: createStateProxy({
    origin: `http://127.0.0.1:${statePort}`,
    userId: 'reviewer',
  }),
});
await new Promise((resolve) => webServer.listen(0, '127.0.0.1', resolve));
const webPort = webServer.address().port;

try {
  const first = await runProfile(
    webPort,
    path.join(temporaryDirectory, 'profile-a'),
    await persistedFixture(),
  );
  const second = await runProfile(webPort, path.join(temporaryDirectory, 'profile-b'));
  assert.equal(first.sessionCount, 1);
  assert.equal(second.sessionCount, 1);
  assert.equal(second.syncMessage, 'Synced as reviewer');
  assert.equal(second.calculatedSeriesSidecar, first.calculatedSeriesSidecar,
    'a separate browser profile must hydrate the exact calculated-series sidecar');
  assert.deepEqual(second.campaignBytes, first.campaignBytes,
    'a separate browser profile must hydrate exact Campaign index/document bytes');
  assert.equal(second.campaignTitle, 'Cross-device Validation Campaign');
  assert.deepEqual(second.checkpoint, first.checkpoint,
    'a separate browser profile must hydrate the exact Workspace checkpoint');
} finally {
  webServer.closeAllConnections();
  await new Promise((resolve) => webServer.close(resolve));
  if (stateService.exitCode === null) {
    const exited = new Promise((resolve) => stateService.once('exit', resolve));
    stateService.kill('SIGTERM');
    await exited;
  }
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
}

console.log('v7 server state sync browser harness passed (two isolated Chrome profiles, Session/checkpoint/calculated-series/Campaign sidecars)');
