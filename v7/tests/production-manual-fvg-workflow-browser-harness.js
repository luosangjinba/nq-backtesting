import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as chartProjection from '../src/annotation-chart-projection/public.js';
import * as evidenceContract from '../src/annotation-evidence-resolver/public.js';
import { createProductionManualAnnotationWorkflow } from '../src/annotation-manual-workflow/public.js';
import {
  readAcceptedManualWorkspace,
  resolveManualToolEvidence,
} from '../src/annotation-manual-workflow/accepted-workspace-evidence.js';
import { createProductionSemanticToolCatalog } from '../src/annotation-manual-workflow/semantic-tool-catalog.js';
import {
  FAIR_VALUE_GAP_PLUGIN_MANIFEST,
  FAIR_VALUE_GAP_TYPE_ID,
} from '../src/semantic-fair-value-gap/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createFakeAnnotationPrimitiveAdapter } from './support/fake-annotation-primitive-adapter.js';
import { createMemoryWebStorage } from './support/memory-web-storage.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const FIFTEEN_MINUTES = 15 * MINUTE;
const CUTOFF = BASE + (16 * MINUTE);
const MIXED_CUTOFF = BASE + (45 * MINUTE);
const sessionId = createSessionId('session.r13-10e-headless');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/production-manual-fvg-workflow/negative/cases.json',
), 'utf8'));
const moduleDescriptors = [
  'src/plugin-contract/module.json',
  'src/semantic-fair-value-gap/module.json',
].map((file) => JSON.parse(fs.readFileSync(path.join(V7_ROOT, file), 'utf8')));
const moduleIds = Object.freeze(moduleDescriptors.map(({ id }) => id));

function bars() {
  const values = Array.from({ length: 16 }, (_, index) => {
    const open = 99 + (index * 0.32);
    const close = open + (index % 2 === 0 ? 0.24 : -0.18);
    return {
      close,
      high: Math.max(open, close) + 0.7,
      low: Math.min(open, close) - 0.7,
      open,
      volume: 20 + index,
    };
  });
  values[4] = { close: 100.5, high: 101, low: 99, open: 100, volume: 31 };
  values[5] = { close: 104, high: 105, low: 100, open: 100.5, volume: 42 };
  values[6] = { close: 105, high: 106, low: 103, open: 104, volume: 36 };
  return Object.freeze(values.map((value, index) => Object.freeze({
    ...value,
    endEpochMs: BASE + ((index + 1) * MINUTE),
    startEpochMs: BASE + (index * MINUTE),
  })));
}

const acceptedBars = bars();
const projectedBars = Object.freeze(acceptedBars.map(({ endEpochMs: _endEpochMs, ...bar }) => (
  Object.freeze(bar)
)));
const coarseAcceptedBars = Object.freeze([
  { close: 100.5, high: 101, low: 99, open: 100, volume: 31 },
  { close: 104, high: 105, low: 100, open: 100.5, volume: 42 },
  { close: 105, high: 106, low: 103, open: 104, volume: 36 },
].map((value, index) => Object.freeze({
  ...value,
  endEpochMs: BASE + ((index + 1) * FIFTEEN_MINUTES),
  startEpochMs: BASE + (index * FIFTEEN_MINUTES),
})));
const coarseProjectedBars = Object.freeze(coarseAcceptedBars.map(({
  endEpochMs: _endEpochMs, ...bar
}) => Object.freeze(bar)));

function pane(paneId, values = projectedBars, {
  durationMs = MINUTE,
  timeframeId = 'timeframe.1m',
} = {}) {
  return Object.freeze({
    paneId,
    snapshot: Object.freeze({
      bars: values,
      provenance: Object.freeze({
        datasetRevision: 'dataset.r13-10e',
        displayTimeframeDurationMs: durationMs,
        displayTimeframeId: timeframeId,
        instrumentId: 'instrument.nq',
        sourceResolutionId: timeframeId,
      }),
    }),
    status: 'ready',
  });
}

function mixedWorkspace({ revision = 56 } = {}) {
  return Object.freeze({
    replay: Object.freeze({ cursorEpochMs: MIXED_CUTOFF }),
    revision,
    workspace: Object.freeze({
      panes: Object.freeze([
        pane('pane-main'),
        pane('pane-second', coarseProjectedBars, {
          durationMs: FIFTEEN_MINUTES,
          timeframeId: 'timeframe.15m',
        }),
      ]),
      // Deliberately stale relative to the explicit command-time Pane used below.
      responsePlan: Object.freeze({ activePaneId: 'pane-main' }),
    }),
  });
}

function workspace({ cutoff = CUTOFF, revision = 52, paneValues = projectedBars } = {}) {
  return Object.freeze({
    replay: Object.freeze({ cursorEpochMs: cutoff }),
    revision,
    workspace: Object.freeze({
      panes: Object.freeze([pane('pane-main', paneValues), pane('pane-second', paneValues)]),
      responsePlan: Object.freeze({ activePaneId: 'pane-main' }),
    }),
  });
}

function fakeInteraction(paneId) {
  let picker = null;
  let sequence = 0;
  const subscribers = new Set();
  return Object.freeze({
    acquireBarPicker(handlers) {
      if (picker !== null) throw new Error('Bar Picker already acquired.');
      picker = handlers;
      const current = handlers;
      return Object.freeze({
        release(reason = 'released') {
          if (picker !== current) return;
          picker = null;
          current.onCancel(Object.freeze({ reason }));
        },
      });
    },
    emitArtifact(entityId) {
      for (const subscriber of subscribers) {
        subscriber(Object.freeze({
          hit: Object.freeze({ distancePx: 0, entityId, projectionId: `semantic:${entityId}:fvg-zone` }),
          paneId,
        }));
      }
    },
    select(barStartEpochMs) {
      if (picker === null) throw new Error('Bar Picker is not armed.');
      const current = picker;
      picker = null;
      current.onSelect(Object.freeze({ barStartEpochMs, paneId, sequence: ++sequence }));
    },
    snapshot: () => Object.freeze({ pickerActive: picker !== null }),
    subscribeSelection(subscriber) {
      subscribers.add(subscriber);
      return Object.freeze({ unsubscribe: () => subscribers.delete(subscriber) });
    },
  });
}

function fakeSurface(paneId) {
  const acceptedAdapter = createFakeAnnotationPrimitiveAdapter();
  const previewAdapter = createFakeAnnotationPrimitiveAdapter();
  const acceptedPort = chartProjection.createChartAnnotationProjectionPort({
    primitiveAdapter: acceptedAdapter,
  });
  const previewPort = chartProjection.createChartAnnotationPreviewPort({
    primitiveAdapter: previewAdapter,
  });
  const interactionPort = fakeInteraction(paneId);
  let disposed = false;
  return Object.freeze({
    acceptedPort,
    interactionPort,
    paneId,
    previewPort,
    async dispose() {
      if (disposed) return;
      disposed = true;
      await Promise.all([acceptedPort.dispose(), previewPort.dispose()]);
    },
    snapshot: () => Object.freeze({
      accepted: acceptedPort.snapshot(),
      disposed,
      interaction: interactionPort.snapshot(),
      paneId,
      preview: previewPort.snapshot(),
    }),
  });
}

function workflowFixture(storage = createMemoryWebStorage()) {
  const surfaces = Object.freeze([fakeSurface('pane-main'), fakeSurface('pane-second')]);
  const views = [];
  let id = 0;
  const workflow = createProductionManualAnnotationWorkflow({
    chartSurfacePort: Object.freeze({ annotationSurfaces: () => surfaces }),
    idFactory: () => `r13-10e-${++id}`,
    moduleDescriptors,
    nowEpochMs: () => CUTOFF + (20 * MINUTE) + id,
    readModuleHostSnapshot: () => Object.freeze({ moduleIds, status: 'running' }),
    sessionId,
    storage,
    view: Object.freeze({ setAnnotationWorkflow: (value) => views.push(value) }),
  });
  return Object.freeze({
    latestView: () => views.at(-1),
    storage,
    surfaces,
    workflow,
  });
}

async function capture(operation, label) {
  try { await operation(); } catch (error) { return error; }
  assert.fail(`Expected ${label} to fail.`);
}

async function settle(predicate, message, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail(message);
}

function validInnerTool(overrides = {}) {
  return Object.freeze({
    evidenceRequirement: Object.freeze({
      followingBars: 1,
      maximumArtifactReferences: 0,
      precedingBars: 1,
      schemaVersion: 1,
    }),
    id: 'construct.imbalance.fvg',
    label: 'FVG from selected Bar',
    packageId: 'first-party.fair-value-gap',
    packageVersion: '1.0.0',
    semanticContributionId: `semantic.${FAIR_VALUE_GAP_TYPE_ID}`,
    typeId: FAIR_VALUE_GAP_TYPE_ID,
    typeVersion: '1.0.0',
    version: '1.0.0',
    ...overrides,
  });
}

const catalog = createProductionSemanticToolCatalog({
  manifests: [FAIR_VALUE_GAP_PLUGIN_MANIFEST],
  moduleDescriptors,
});
const activeTypes = Object.freeze([{
  packageId: 'first-party.fair-value-gap',
  packageVersion: '1.0.0',
  typeId: FAIR_VALUE_GAP_TYPE_ID,
  version: '1.0.0',
}]);
const hostSnapshot = Object.freeze({ moduleIds, status: 'running' });
const requirement = validInnerTool().evidenceRequirement;
const negativeOperations = {
  'outer-inner-package-mismatch': () => catalog.list({
    hostSnapshot,
    semanticTools: [validInnerTool({ packageId: 'first-party.wrong-package' })],
    semanticTypes: activeTypes,
  }),
  'inactive-semantic-type': () => catalog.list({
    hostSnapshot,
    semanticTools: [validInnerTool()],
    semanticTypes: [],
  }),
  'invalid-evidence-requirement': () => catalog.list({
    hostSnapshot,
    semanticTools: [validInnerTool({
      evidenceRequirement: Object.freeze({ ...requirement, followingBars: 33 }),
    })],
    semanticTypes: activeTypes,
  }),
  'workspace-not-accepted': () => readAcceptedManualWorkspace({}),
  'missing-following-bar': () => resolveManualToolEvidence({
    artifacts: [],
    evidenceContract,
    requirement,
    selection: { barStartEpochMs: acceptedBars[5].startEpochMs, paneId: 'pane-main' },
    sessionId,
    workspace: workspace({ paneValues: Object.freeze(projectedBars.slice(0, 6)) }),
  }),
  'future-following-bar': () => resolveManualToolEvidence({
    artifacts: [],
    evidenceContract,
    requirement,
    selection: { barStartEpochMs: acceptedBars[5].startEpochMs, paneId: 'pane-main' },
    sessionId,
    workspace: workspace({ cutoff: acceptedBars[5].endEpochMs }),
  }),
};

assert.equal(negativeCases.schemaVersion, 1);
for (const testCase of negativeCases.cases) {
  const error = await capture(negativeOperations[testCase.name], testCase.name);
  assert.equal(error.code, testCase.expectedCode, testCase.name);
}

const storage = createMemoryWebStorage();
const primary = workflowFixture(storage);
await primary.workflow.start();
assert.equal(primary.latestView().tools[0].disabled, true,
  'the tool must remain disabled until one accepted Workspace publication arrives');
await primary.workflow.acceptWorkspace(workspace());
assert.deepEqual(primary.workflow.snapshot().toolIds, ['construct.imbalance.fvg']);
assert.equal(primary.latestView().tools[0].displayName, 'FVG');
assert.equal(primary.latestView().tools[0].state, 'active');
assert.equal(primary.latestView().tools[0].disabled, false);

primary.workflow.toggleTool('construct.imbalance.fvg');
primary.surfaces[0].interactionPort.select(acceptedBars[2].startEpochMs);
await settle(() => primary.workflow.snapshot().status === 'error', 'Non-FVG rejection did not settle.');
assert.equal(primary.workflow.snapshot().annotationDocumentRevision, 0);
assert.ok(primary.latestView().error?.message, 'Rejected construction must remain visible.');

primary.workflow.toggleTool('construct.imbalance.fvg');
primary.surfaces[0].interactionPort.select(acceptedBars[5].startEpochMs);
await settle(
  () => primary.workflow.snapshot().annotationDocumentRevision === 1
    && primary.latestView().inspector.open,
  'Valid exact-Bar construction did not commit and open Inspector.',
);
const artifactId = primary.latestView().inspector.artifactId;
assert.equal(primary.latestView().inspector.tabs.map(({ id }) => id).join(','), 'inputs,evidence,history');
for (const surface of primary.surfaces) {
  assert.equal(surface.acceptedPort.snapshot().projectionCount, 2);
  assert.equal(surface.previewPort.snapshot().projectionCount, 0);
}

await primary.workflow.updateInspectorField({
  expectedDraftRevision: primary.latestView().inspector.draftRevision,
  field: 'lowerPrice',
  value: 101.25,
});
assert.equal(primary.workflow.snapshot().annotationDocumentRevision, 1);
for (const surface of primary.surfaces) {
  assert.equal(surface.acceptedPort.snapshot().projectionCount, 0);
  assert.equal(surface.previewPort.snapshot().projectionCount, 2);
}
await primary.workflow.cancelInspector();
assert.equal(primary.workflow.snapshot().annotationDocumentRevision, 1);
for (const surface of primary.surfaces) {
  assert.equal(surface.acceptedPort.snapshot().projectionCount, 2);
  assert.equal(surface.previewPort.snapshot().projectionCount, 0);
}

primary.surfaces[0].interactionPort.emitArtifact(artifactId);
await settle(() => primary.latestView().inspector.open, 'Accepted Artifact selection did not open Inspector.');
await primary.workflow.updateInspectorField({
  expectedDraftRevision: primary.latestView().inspector.draftRevision,
  field: 'lowerPrice',
  value: 101.25,
});
await primary.workflow.updateInspectorField({
  expectedDraftRevision: primary.latestView().inspector.draftRevision,
  field: 'upperPrice',
  value: 102.75,
});
await primary.workflow.applyInspector();
assert.equal(primary.workflow.snapshot().annotationDocumentRevision, 2);
assert.equal(primary.latestView().inspector.open, false);
for (const surface of primary.surfaces) {
  assert.equal(surface.acceptedPort.snapshot().projectionCount, 2);
  assert.equal(surface.previewPort.snapshot().projectionCount, 0);
}
await primary.workflow.dispose();

const mixedStorage = createMemoryWebStorage();
const mixed = workflowFixture(mixedStorage);
await mixed.workflow.start();
await mixed.workflow.acceptWorkspace(mixedWorkspace());
mixed.workflow.toggleTool('construct.imbalance.fvg', 'pane-main');
mixed.surfaces[0].interactionPort.select(acceptedBars[5].startEpochMs);
await settle(
  () => mixed.workflow.snapshot().annotationDocumentRevision === 1
    && mixed.latestView().inspector.open,
  '1m FVG did not settle against the 1m/15m Workspace.',
);
assert.equal(mixed.workflow.snapshot().error, null);
assert.equal(mixed.latestView().busy, false);
assert.equal(mixed.surfaces[0].acceptedPort.snapshot().projectionCount, 2);
assert.equal(mixed.surfaces[1].acceptedPort.snapshot().projectionCount, 0,
  'the 1m FVG must be unavailable when both anchors collapse into one 15m bucket');
await mixed.workflow.updateInspectorField({
  expectedDraftRevision: mixed.latestView().inspector.draftRevision,
  field: 'lowerPrice',
  value: 101.25,
});
assert.equal(mixed.latestView().busy, true);
assert.equal(mixed.surfaces[0].previewPort.snapshot().projectionCount, 2);
assert.equal(mixed.surfaces[1].previewPort.snapshot().projectionCount, 0);
await mixed.workflow.cancelInspector();
assert.equal(mixed.latestView().inspector.open, false);
assert.equal(mixed.latestView().busy, false,
  'cancel must release the Workspace interaction gate after cross-timeframe settlement');
assert.equal(mixed.workflow.snapshot().status, 'ready');
assert.equal(mixed.workflow.snapshot().error, null);
for (const surface of mixed.surfaces) {
  assert.equal(surface.previewPort.snapshot().projectionCount, 0);
  assert.equal(surface.interactionPort.snapshot().pickerActive, false);
}
assert.equal(mixed.surfaces[0].acceptedPort.snapshot().projectionCount, 2);
assert.equal(mixed.surfaces[1].acceptedPort.snapshot().projectionCount, 0);

mixed.workflow.toggleTool('construct.imbalance.fvg', 'pane-second');
mixed.surfaces[1].interactionPort.select(coarseAcceptedBars[1].startEpochMs);
await settle(
  () => mixed.workflow.snapshot().annotationDocumentRevision === 2
    && mixed.latestView().inspector.open,
  'explicit 15m source Pane construction did not settle.',
);
const coarseArtifactId = mixed.latestView().inspector.artifactId;
const annotationEntry = Object.entries(mixedStorage.snapshot())
  .find(([key]) => key.startsWith('v7.annotation-history:session:'));
assert.ok(annotationEntry, 'mixed-timeframe Annotation document must be durable');
const coarseArtifact = JSON.parse(annotationEntry[1]).document.artifacts
  .find(({ artifactId }) => artifactId === coarseArtifactId);
assert.equal(coarseArtifact.provenance.packageProvenance.paneId, 'pane-second');
assert.equal(coarseArtifact.provenance.sourceTimeframeId, 'timeframe.15m',
  'the explicit command-time Pane must override the stale accepted response-plan focus');
assert.equal(mixed.surfaces[0].acceptedPort.snapshot().projectionCount, 2);
assert.equal(mixed.surfaces[1].acceptedPort.snapshot().projectionCount, 2);
await mixed.workflow.cancelInspector();
await mixed.workflow.dispose();

const restored = workflowFixture(storage);
await restored.workflow.start();
await restored.workflow.acceptWorkspace(workspace({ revision: 53 }));
assert.equal(restored.workflow.snapshot().annotationDocumentRevision, 2);
for (const surface of restored.surfaces) assert.equal(surface.acceptedPort.snapshot().projectionCount, 2);
restored.surfaces[0].interactionPort.emitArtifact(artifactId);
await settle(() => restored.latestView().inspector.open, 'Restored Artifact did not reopen.');
const restoredInputs = restored.latestView().inspector.tabs
  .find(({ id }) => id === 'inputs').groups.flatMap(({ fields }) => fields);
assert.equal(restoredInputs.find(({ id }) => id === 'lowerPrice').value, 101.25);
assert.equal(restoredInputs.find(({ id }) => id === 'upperPrice').value, 102.75);
await restored.workflow.acceptWorkspace(workspace({ cutoff: CUTOFF + MINUTE, revision: 54 }));
assert.equal(restored.latestView().inspector.status, 'read-only');
await restored.workflow.acceptWorkspace(workspace({ cutoff: CUTOFF - 1, revision: 55 }));
assert.equal(restored.latestView().inspector.status, 'hidden');
for (const surface of restored.surfaces) assert.equal(surface.acceptedPort.snapshot().projectionCount, 0);
await restored.workflow.dispose();

const uiSource = fs.readFileSync(path.join(
  V7_ROOT, 'src/replay-workspace-ui/annotation-workflow-control.js',
), 'utf8');
assert.doesNotMatch(uiSource, /(?:imbalance\.fvg|lowerPrice|upperPrice|fair-value-gap)/i);
const compositionSource = fs.readFileSync(path.join(
  V7_ROOT, 'src/replay-workspace-composition/workspace-annotation-commands.js',
), 'utf8');
assert.doesNotMatch(compositionSource, /(?:imbalance\.fvg|lowerPrice|upperPrice|fair-value-gap)/i);
assert.match(
  fs.readFileSync(path.join(V7_ROOT, 'src/session-application/module.json'), 'utf8'),
  /optional\.annotation-manual-workflow/,
);

const repositoryRoot = path.resolve(V7_ROOT, '..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-production-fvg-'));
const server = createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/production-manual-fvg-workflow/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1480,900',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) {
      return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function stopChrome() {
  if (chrome.exitCode !== null || chrome.signalCode !== null) return;
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL');
}

async function pointerClick(cdp, target) {
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'none', buttons: 0, type: 'mouseMoved', x: target.x, y: target.y,
  });
  await new Promise((resolve) => setTimeout(resolve, 40));
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', x: target.x, y: target.y,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased', x: target.x, y: target.y,
  });
}

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  const fixtureUrl = `http://127.0.0.1:${server.address().port}`
    + '/v7/tests/fixtures/production-manual-fvg-workflow/';
  await cdp.send('Page.navigate', { url: fixtureUrl });
  await waitFor(cdp, `document.body
    && ['ready', 'failed'].includes(document.body.dataset.scenario)`, 15_000);
  let browser = await evaluate(cdp, `({
    error: document.body.dataset.error ?? null,
    scenario: document.body.dataset.scenario,
    state: globalThis.__h114?.state(),
    tool: document.querySelector('.annotation-tool-button')?.textContent,
  })`);
  assert.equal(browser.scenario, 'ready', browser.error ?? 'H114 fixture failed to start');
  assert.equal(browser.tool, 'FVG');
  assert.equal(browser.state.workflow.annotationDocumentRevision, 0);
  assert.equal(browser.state.view.tools[0].state, 'active');
  assert.equal(browser.state.coarseChart.barCount, 1);
  assert.equal(browser.state.coarseSurface.accepted.projectionCount, 0);

  await pointerClick(cdp, await evaluate(cdp, `(() => {
    const rect = document.querySelector('.annotation-tool-button').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`));
  await pointerClick(cdp, await evaluate(cdp, 'globalThis.__h114.barTarget(2)'));
  await waitFor(cdp, `document.body.dataset.workflowStatus === 'error'`, 10_000);
  browser = await evaluate(cdp, 'globalThis.__h114.state()');
  assert.equal(browser.workflow.annotationDocumentRevision, 0);
  assert.ok(await evaluate(cdp, `document.querySelector('.annotation-tool-error')?.offsetWidth > 0`));

  await pointerClick(cdp, await evaluate(cdp, `(() => {
    const rect = document.querySelector('.annotation-tool-button').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`));
  await pointerClick(cdp, await evaluate(cdp, 'globalThis.__h114.barTarget(5)'));
  try {
    await waitFor(cdp, `document.body.dataset.documentRevision === '1'
      && document.body.dataset.inspectorOpen === 'true'`, 10_000);
  } catch (error) {
    error.cause = await evaluate(cdp, `({
      actionError: document.body.dataset.actionError ?? null,
      body: { ...document.body.dataset },
      state: globalThis.__h114.state(),
      target: globalThis.__h114.barTarget(5),
    })`);
    throw error;
  }
  browser = await evaluate(cdp, 'globalThis.__h114.state()');
  assert.equal(browser.surface.accepted.projectionCount, 2);
  assert.equal(browser.coarseSurface.accepted.projectionCount, 0);
  assert.equal(browser.coarseArtifactTarget, null,
    'the real 15m Chart must not paint or hit-test a collapsed 1m FVG');
  assert.equal(await evaluate(cdp, 'document.body.dataset.actionError ?? null'), null);
  assert.deepEqual(browser.view.inspector.tabs.map(({ id }) => id), ['inputs', 'evidence', 'history']);
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.annotation-inspector-number').length`), 2);

  await evaluate(cdp, `(() => {
    const input = [...document.querySelectorAll('.annotation-inspector-number')]
      .find((value) => value.getAttribute('aria-label') === 'Lower price');
    input.value = '101.25'; input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(cdp, `document.body.dataset.previewCount === '2'`, 10_000);
  browser = await evaluate(cdp, 'globalThis.__h114.state()');
  assert.equal(browser.surface.accepted.projectionCount, 0);
  assert.equal(browser.coarseSurface.accepted.projectionCount, 0);
  assert.equal(browser.coarseSurface.preview.projectionCount, 0);
  assert.equal(browser.workflow.annotationDocumentRevision, 1);
  await evaluate(cdp, `document.querySelector('.annotation-inspector-action.action-cancel').click()`);
  await waitFor(cdp, `document.body.dataset.inspectorOpen === 'false'`, 10_000);
  browser = await evaluate(cdp, 'globalThis.__h114.state()');
  assert.equal(browser.surface.accepted.projectionCount, 2);
  assert.equal(browser.surface.preview.projectionCount, 0);
  assert.equal(browser.coarseSurface.accepted.projectionCount, 0);
  assert.equal(browser.coarseSurface.preview.projectionCount, 0);
  assert.equal(browser.view.busy, false);

  const artifactTarget = await evaluate(cdp, 'globalThis.__h114.artifactTarget()');
  assert.ok(artifactTarget, 'Accepted FVG did not expose a bounded Chart hit target.');
  await pointerClick(cdp, artifactTarget);
  await waitFor(cdp, `document.body.dataset.inspectorOpen === 'true'`, 10_000);
  for (const [label, value] of [['Lower price', '101.25'], ['Upper price', '102.75']]) {
    await evaluate(cdp, `(() => {
      const input = [...document.querySelectorAll('.annotation-inspector-number')]
        .find((entry) => entry.getAttribute('aria-label') === ${JSON.stringify(label)});
      input.value = ${JSON.stringify(value)};
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  await evaluate(cdp, `document.querySelector('.annotation-inspector-action.action-apply').click()`);
  await waitFor(cdp, `document.body.dataset.documentRevision === '2'
    && document.body.dataset.inspectorOpen === 'false'`, 10_000);
  browser = await evaluate(cdp, 'globalThis.__h114.state()');
  assert.equal(browser.surface.accepted.projectionCount, 2);
  assert.equal(browser.surface.preview.projectionCount, 0);
  assert.equal(browser.coarseSurface.accepted.projectionCount, 0);
  assert.equal(browser.coarseSurface.preview.projectionCount, 0);
  assert.equal(browser.chart.barCount, browser.initialChart.barCount);
  assert.equal(browser.chart.seriesDataRevision, browser.initialChart.seriesDataRevision);
  assert.equal(browser.coarseChart.barCount, browser.initialCoarseChart.barCount);
  assert.equal(browser.coarseChart.seriesDataRevision,
    browser.initialCoarseChart.seriesDataRevision);

  const chartCenter = await evaluate(cdp, `(() => {
    const rect = document.querySelector('#chart').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  const rangeBeforeWheel = browser.chart.logicalRange;
  await cdp.send('Input.dispatchMouseEvent', {
    deltaX: 0, deltaY: -220, type: 'mouseWheel', x: chartCenter.x, y: chartCenter.y,
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const rangeAfterWheel = await evaluate(cdp, 'globalThis.__h114.state().chart.logicalRange');
  assert.notEqual(
    rangeAfterWheel.to - rangeAfterWheel.from,
    rangeBeforeWheel.to - rangeBeforeWheel.from,
    'Native Chart wheel zoom must remain active.',
  );

  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `document.body && document.body.dataset.scenario === 'ready'
    && document.body.dataset.documentRevision === '2'`, 15_000);
  browser = await evaluate(cdp, 'globalThis.__h114.state()');
  assert.equal(browser.workflow.annotationDocumentRevision, 2);
  assert.equal(browser.surface.accepted.projectionCount, 2);
  assert.equal(browser.coarseSurface.accepted.projectionCount, 0);
  assert.equal(browser.coarseArtifactTarget, null);
  const restoredTarget = await evaluate(cdp, 'globalThis.__h114.artifactTarget()');
  await pointerClick(cdp, restoredTarget);
  await waitFor(cdp, `document.body.dataset.inspectorOpen === 'true'`, 10_000);
  const restoredFields = await evaluate(cdp, `globalThis.__h114.state().view.inspector.tabs
    .find(({ id }) => id === 'inputs').groups.flatMap(({ fields }) => fields)`);
  assert.equal(restoredFields.find(({ id }) => id === 'lowerPrice').value, 101.25);
  assert.equal(restoredFields.find(({ id }) => id === 'lowerPrice').source, 'OVERRIDDEN');
} finally {
  if (cdp) cdp.close();
  await stopChrome();
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 100,
  });
}

console.log(`v7 Production Manual FVG Workflow harness passed (${negativeCases.cases.length} negative controls)`);
