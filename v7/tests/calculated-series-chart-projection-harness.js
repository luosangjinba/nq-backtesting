import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import {
  createChartCalculatedSeriesProjectionOwner,
} from '../src/chart-snapshot-application/public.js';
import {
  createCalculatedSeriesChartProjectionFactory,
  createCalculatedSeriesPaneSurfaceCandidate,
  readCalculatedSeriesChartBinding,
  readCalculatedSeriesChartProjectionReceipt,
  readPreparedCalculatedSeriesChartProjection,
} from '../src/calculated-series-chart-projection/public.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createCalculatedSeriesProjectionFixture } from './support/calculated-series-projection-fixture.js';
import { createFakeCalculatedSeriesChartSurface } from './support/fake-calculated-series-chart-surface.js';
import {
  fixedScaleRange,
  nativeAnchorOptions,
  nativePlotOptions,
  nativePriceFormat,
  nativeScaleMode,
} from '../src/lightweight-chart-adapter/calculated-series-native-options.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const FIXTURE_ROOT = path.join(TEST_DIR, 'fixtures/calculated-series-chart-projection');
const PURE_ROOT = path.join(TEST_DIR, 'fixtures/calculated-series-pure-contract/positive');
const definitionWire = JSON.parse(fs.readFileSync(path.join(PURE_ROOT, 'synthetic-definition.json'), 'utf8'));
const documentWire = JSON.parse(fs.readFileSync(path.join(PURE_ROOT, 'workspace-document.json'), 'utf8'));
const negativeCases = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, 'negative/cases.json'), 'utf8'));
const screenshotFile = path.join(FIXTURE_ROOT, 'main-internal-1000x700.png');
const adapterSource = fs.readFileSync(
  path.join(REPOSITORY_ROOT, 'v7/src/lightweight-chart-adapter/lightweight-chart-adapter.js'),
  'utf8',
);
assert.match(adapterSource, /calculatedSeriesProjectionFactory\(\)/u);
assert.doesNotMatch(adapterSource, /calculatedSeriesProjectionFactory\([^)]/u,
  'callers must not inject an API that can capture the adapter-private native surface');
assert.doesNotMatch(adapterSource, /calculatedSeriesSurface\s*\(/u,
  'the adapter must not expose its raw calculated-series native surface');

function ownerFor(fixture, surface = createFakeCalculatedSeriesChartSurface(), overrides = {}) {
  const binding = readCalculatedSeriesChartBinding(fixture.binding);
  const owner = createChartCalculatedSeriesProjectionOwner({
    currentBinding: overrides.currentBinding ?? (() => binding),
    projectionFactory: createCalculatedSeriesChartProjectionFactory({ surfaceAdapter: surface }),
    recoverFromAcceptedSnapshot: overrides.recoverFromAcceptedSnapshot,
  });
  return { owner, surface };
}

async function accept(owner, candidate) {
  const prepared = await owner.prepare(candidate);
  const receipt = await prepared.apply();
  await prepared.finalize(receipt);
  return { prepared, receipt };
}

function assertNoNativeValue(value) {
  const forbidden = new Set([
    'chart', 'pane', 'series', 'priceScale', 'primitive', 'nativeScaleId', 'canvas', 'element',
  ]);
  const visit = (entry) => {
    if (!entry || typeof entry !== 'object') return;
    for (const [key, child] of Object.entries(entry)) {
      assert.equal(forbidden.has(key), false, `${key} must not escape the adapter boundary`);
      visit(child);
    }
  };
  visit(value);
}

const initial = createCalculatedSeriesProjectionFixture({ definitionWire, documentWire });
const first = ownerFor(initial);
const prepared = await first.owner.prepare(initial.candidate);
assert.deepEqual(readPreparedCalculatedSeriesChartProjection(prepared), {
  baseSurfaceRevision: 0,
  candidateDigest: readPreparedCalculatedSeriesChartProjection(prepared).candidateDigest,
  mode: 'workspace-stage',
  state: 'prepared',
  targetSurfaceRevision: 1,
});
assert.equal(first.surface.snapshot().mutationCount, 0, 'prepare may preflight but must not mutate Chart state');
const receipt = await prepared.apply();
const receiptWire = readCalculatedSeriesChartProjectionReceipt(receipt);
assert.equal(receiptWire.paintedReadback.logicalResourceCount, 9);
assert.equal(receiptWire.paintedReadback.nativePlotSeries, 7);
assert.deepEqual(receiptWire.paintedReadback.resourceIds, [
  'instance-synthetic:price-group:plot:area-output',
  'instance-synthetic:price-group:plot:band-output',
  'instance-synthetic:price-group:plot:baseline-output',
  'instance-synthetic:price-group:plot:line-output',
  'instance-synthetic:price-group:reference-line:price-reference',
  'instance-synthetic:ratio-group:plot:histogram-output',
]);
assert.deepEqual(receiptWire.paintedReadback.whitespaceGaps, {
  bridgePixelCount: 0,
  checkedProbeCount: 6,
  gapCount: 3,
});
assertNoNativeValue(receiptWire);
await prepared.dispose();
assert.equal(first.owner.snapshot().child.acceptedSurfaceRevision, 0);
await accept(first.owner, initial.candidate);

const initialPlan = first.surface.inspect().accepted;
const ratioScale = initialPlan.scales.find(({ scaleGroupId }) => scaleGroupId === 'scale-ratio');
assert.deepEqual(nativeAnchorOptions(ratioScale, 'right', 0.01)
  .autoscaleInfoProvider().priceRange, { maxValue: 1, minValue: -1 });
assert.notEqual(nativeScaleMode({ transform: 'linear' }), nativeScaleMode({ transform: 'logarithmic' }));
assert.deepEqual(fixedScaleRange({ domain: { kind: 'fixed', minimum: -4, maximum: 7 } }), {
  from: -4, to: 7,
});
assert.deepEqual(fixedScaleRange({
  domain: { kind: 'symmetric-around-zero', magnitude: 3 },
}), { from: -3, to: 3 });
assert.equal(nativePlotOptions({
  kind: 'line', style: { stroke: { color: '#000000FF', pattern: 'solid', width: 1 } }, title: 'Logical title',
}, 'right', { title: '' }).title, '');
assert.equal(nativePriceFormat({
  formatter: {
    formatterId: 'host.percentage',
    options: { decimals: 2 },
  },
}).formatter(1.234), '1.23%');

let acceptedSurfaceRevision = 1;
for (const state of ['pending', 'empty', 'unavailable', 'error']) {
  const nonReady = createCalculatedSeriesProjectionFixture({
    baseSurfaceRevision: acceptedSurfaceRevision,
    definitionWire,
    documentWire,
    mode: 'same-snapshot-settlement',
    state,
  });
  await accept(first.owner, nonReady.candidate);
  acceptedSurfaceRevision += 1;
  assert.deepEqual(first.surface.snapshot().accepted.resourceIds, [],
    `${state} must clear every stale Plot pixel`);
}
const settled = createCalculatedSeriesProjectionFixture({
  baseSurfaceRevision: acceptedSurfaceRevision,
  definitionWire,
  documentWire,
  mode: 'same-snapshot-settlement',
});
await accept(first.owner, settled.candidate);
acceptedSurfaceRevision += 1;
assert.equal(first.owner.snapshot().child.acceptedSurfaceRevision, acceptedSurfaceRevision);

const moved = createCalculatedSeriesProjectionFixture({
  baseSurfaceRevision: acceptedSurfaceRevision,
  definitionWire,
  documentWire,
  movePriceToInternal: true,
});
const movedPrepared = await first.owner.prepare(moved.candidate);
const movedReceipt = await movedPrepared.apply();
const movedPlan = first.surface.inspect();
assert.equal(movedPlan.accepted.plots.find(({ plotGroupId }) => (
  plotGroupId === 'price-group'
)).regionId, 'region-main', 'accepted map stays unpublished before finalize');
assert.equal(movedPlan.active.plots.find(({ plotGroupId }) => (
  plotGroupId === 'price-group'
)).regionId, 'region-secondary', 'the same validated points can stage in an existing internal region');
const appliedMovedPlan = first.surface.snapshot();
assert.equal(appliedMovedPlan.active, 'applied');
await movedPrepared.rollback(movedReceipt);
assert.equal(first.owner.snapshot().child.acceptedSurfaceRevision, acceptedSurfaceRevision);
await first.owner.dispose();
await first.owner.dispose();

const styledDocument = structuredClone(documentWire);
styledDocument.workspacePanes[0].resolvedInstances[0].instanceRevision += 1;
styledDocument.workspacePanes[0].resolvedInstances[0].styleOverrides = [{
  plotGroupId: 'price-group',
  style: { stroke: { color: '#112233FF', width: 3, pattern: 'dotted' } },
  targetId: 'line-output',
  targetKind: 'plot',
}];
const styledFixture = createCalculatedSeriesProjectionFixture({
  definitionWire,
  documentWire: styledDocument,
});
const styled = ownerFor(styledFixture);
await accept(styled.owner, styledFixture.candidate);
assert.deepEqual(styled.surface.inspect().accepted.plots
  .find(({ plotId }) => plotId === 'line-output').style,
{ stroke: { color: '#112233FF', pattern: 'dotted', width: 3 } });
await styled.owner.dispose();

const symmetricOverlayDefinition = structuredClone(definitionWire);
const symmetricOverlayDocument = structuredClone(documentWire);
const priceScale = symmetricOverlayDocument.workspacePanes[0].scaleGroups[0];
const unusedLeftScale = structuredClone(priceScale);
unusedLeftScale.axisIntent = 'auxiliary';
unusedLeftScale.order = 1;
unusedLeftScale.scaleGroupId = 'scale-left-unused';
const symmetricOverlayScale = structuredClone(priceScale);
symmetricOverlayScale.axisIntent = 'auxiliary';
symmetricOverlayScale.order = 2;
symmetricOverlayScale.scaleGroupId = 'scale-overlay-symmetric-auto';
symmetricOverlayScale.scaleIntent.domain = { kind: 'symmetric-around-zero', magnitude: 'auto' };
symmetricOverlayDocument.workspacePanes[0].scaleGroups.push(unusedLeftScale, symmetricOverlayScale);
symmetricOverlayDocument.workspacePanes[0].resolvedInstances[0]
  .plotGroupPlacements[0].scaleGroupId = symmetricOverlayScale.scaleGroupId;
symmetricOverlayDefinition.plotGroups[0].scaleIntent.domain = structuredClone(
  symmetricOverlayScale.scaleIntent.domain,
);
const symmetricOverlayFixture = createCalculatedSeriesProjectionFixture({
  definitionWire: symmetricOverlayDefinition,
  documentWire: symmetricOverlayDocument,
});
const symmetricOverlay = ownerFor(symmetricOverlayFixture);
await accept(symmetricOverlay.owner, symmetricOverlayFixture.candidate);
const acceptedSymmetricOverlayScale = symmetricOverlay.surface.inspect().accepted.scales
  .find(({ scaleGroupId }) => scaleGroupId === symmetricOverlayScale.scaleGroupId);
assert.equal(acceptedSymmetricOverlayScale.nativeRole, 'overlay');
assert.deepEqual(
  nativeAnchorOptions(acceptedSymmetricOverlayScale, 'calculated-series-overlay-test', 0.01)
    .autoscaleInfoProvider().priceRange,
  { maxValue: 106, minValue: -106 },
  'auto-symmetric output must remain admissible on a native auto-scaled overlay',
);
await symmetricOverlay.owner.dispose();

async function expectCode(code, operation, label = code) {
  await assert.rejects(operation, (error) => {
    assert.equal(error?.code, code, error?.stack ?? String(error));
    return true;
  }, label);
}

const operations = {
  'candidate-lookalike': async () => ownerFor(initial).owner.prepare({}),
  'binding-lookalike': async () => readCalculatedSeriesChartBinding({}),
  'surface-port': async () => createCalculatedSeriesChartProjectionFactory({ surfaceAdapter: {} }),
  'preflight-failure': async () => {
    const surface = createFakeCalculatedSeriesChartSurface();
    surface.failNext('preflight');
    return ownerFor(initial, surface).owner.prepare(initial.candidate);
  },
  'factory-rebind': async () => {
    const surface = createFakeCalculatedSeriesChartSurface();
    const factory = createCalculatedSeriesChartProjectionFactory({ surfaceAdapter: surface });
    createChartCalculatedSeriesProjectionOwner({
      currentBinding: () => readCalculatedSeriesChartBinding(initial.binding), projectionFactory: factory,
    });
    return createChartCalculatedSeriesProjectionOwner({
      currentBinding: () => readCalculatedSeriesChartBinding(initial.binding), projectionFactory: factory,
    });
  },
  'owner-controls-lookalike': async () => {
    const factory = createCalculatedSeriesChartProjectionFactory({
      surfaceAdapter: createFakeCalculatedSeriesChartSurface(),
    });
    return factory.bindChartOwner({ isBindingCurrent: () => true, reportFault: async () => {} });
  },
  'stale-binding': async () => ownerFor(initial, undefined, { currentBinding: () => null }).owner.prepare(initial.candidate),
  'stale-base': async () => {
    const configured = ownerFor(initial);
    await accept(configured.owner, initial.candidate);
    return configured.owner.prepare(initial.candidate);
  },
  'receipt-lookalike': async () => {
    const configured = ownerFor(initial);
    const value = await configured.owner.prepare(initial.candidate);
    await value.apply();
    return value.rollback({});
  },
  'native-readback-lookalike': async () => {
    const base = createFakeCalculatedSeriesChartSurface();
    const surface = {
      ...base,
      async apply(plan) {
        const applied = await base.apply(plan);
        return { ...applied, readback: { ...applied.readback, chart: {} } };
      },
    };
    const configured = ownerFor(initial, surface);
    const value = await configured.owner.prepare(initial.candidate);
    try {
      return await value.apply();
    } catch (error) {
      assert.equal(base.snapshot().active, null);
      assert.equal(base.snapshot().mutationCount, 0);
      throw error;
    }
  },
  'binding-stale-after-paint': async () => {
    const base = createFakeCalculatedSeriesChartSurface();
    let current = readCalculatedSeriesChartBinding(initial.binding);
    const surface = {
      ...base,
      async apply(plan) {
        const applied = await base.apply(plan);
        current = null;
        return applied;
      },
    };
    const configured = ownerFor(initial, surface, { currentBinding: () => current });
    const value = await configured.owner.prepare(initial.candidate);
    try {
      return await value.apply();
    } catch (error) {
      assert.equal(base.snapshot().active, null);
      assert.equal(base.snapshot().mutationCount, 0);
      throw error;
    }
  },
  'prepared-lookalike': async () => readPreparedCalculatedSeriesChartProjection({}),
  'active-preparation': async () => {
    const configured = ownerFor(initial);
    await configured.owner.prepare(initial.candidate);
    return configured.owner.prepare(initial.candidate);
  },
  'concurrent-preparation': async () => {
    const configured = ownerFor(initial);
    const firstPreparation = configured.owner.prepare(initial.candidate);
    try {
      return await configured.owner.prepare(initial.candidate);
    } finally {
      const firstPrepared = await firstPreparation;
      await firstPrepared.rollback();
      await configured.owner.dispose();
    }
  },
  'revision-collision': async () => {
    const configured = ownerFor(initial);
    const value = await configured.owner.prepare(initial.candidate);
    await value.rollback();
    const changed = createCalculatedSeriesProjectionFixture({
      definitionWire, documentWire, projectionRevision: 2, targetSurfaceRevision: 1,
    });
    return configured.owner.prepare(changed.candidate);
  },
  'settlement-identity-drift': async () => {
    const configured = ownerFor(initial);
    await accept(configured.owner, initial.candidate);
    const changed = createCalculatedSeriesProjectionFixture({
      baseSurfaceRevision: 1,
      definitionWire,
      documentWire,
      mode: 'same-snapshot-settlement',
      movePriceToInternal: true,
    });
    return configured.owner.prepare(changed.candidate);
  },
  'baseline-stroke-unsupported': async () => {
    const definition = structuredClone(definitionWire);
    const baseline = definition.plotGroups[0].plots.find(({ kind }) => kind === 'baseline');
    baseline.style.bottomStroke.width = 2;
    const fixture = createCalculatedSeriesProjectionFixture({
      definitionWire: definition,
      documentWire,
    });
    return ownerFor(fixture).owner.prepare(fixture.candidate);
  },
  'log-nonpositive': async () => {
    const definition = structuredClone(definitionWire);
    const document = structuredClone(documentWire);
    const intent = {
      ...definition.plotGroups[1].scaleIntent,
      domain: { kind: 'auto' },
      transform: 'logarithmic',
      zeroPolicy: 'forbid-nonpositive',
    };
    definition.plotGroups[1].scaleIntent = structuredClone(intent);
    document.workspacePanes[0].scaleGroups[1].scaleIntent = structuredClone(intent);
    const fixture = createCalculatedSeriesProjectionFixture({
      definitionWire: definition,
      documentWire: document,
    });
    return ownerFor(fixture).owner.prepare(fixture.candidate);
  },
  'collapsed-region': async () => {
    const wire = structuredClone(documentWire);
    wire.workspacePanes[0].chartRegions[1].collapsed = true;
    const fixture = createCalculatedSeriesProjectionFixture({ definitionWire, documentWire: wire });
    return ownerFor(fixture).owner.prepare(fixture.candidate);
  },
  'fixed-overlay': async () => {
    const definition = structuredClone(definitionWire);
    const document = structuredClone(documentWire);
    const price = document.workspacePanes[0].scaleGroups[0];
    const left = structuredClone(price);
    left.axisIntent = 'auxiliary';
    left.order = 1;
    left.scaleGroupId = 'scale-left-unused';
    const overlay = structuredClone(price);
    overlay.axisIntent = 'auxiliary';
    overlay.order = 2;
    overlay.scaleGroupId = 'scale-overlay-fixed';
    overlay.scaleIntent.domain = { kind: 'fixed', minimum: 90, maximum: 110 };
    document.workspacePanes[0].scaleGroups.push(left, overlay);
    const placement = document.workspacePanes[0].resolvedInstances[0].plotGroupPlacements[0];
    placement.scaleGroupId = overlay.scaleGroupId;
    definition.plotGroups[0].scaleIntent.domain = structuredClone(overlay.scaleIntent.domain);
    const fixture = createCalculatedSeriesProjectionFixture({ definitionWire: definition, documentWire: document });
    return ownerFor(fixture).owner.prepare(fixture.candidate);
  },
  'native-segment-limit': async () => {
    const linePoints = [];
    for (let index = 0; index < 65; index += 1) {
      linePoints.push({
        displayEpochMs: (index * 2 + 1) * 1_000,
        state: 'value',
        value: 99 + (index % 3),
      });
      if (index < 64) {
        linePoints.push({
          displayEpochMs: (index * 2 + 2) * 1_000,
          state: 'whitespace',
        });
      }
    }
    const fixture = createCalculatedSeriesProjectionFixture({
      definitionWire,
      documentWire,
      linePoints,
      replayVisibleThroughEpochMs: 130_000,
    });
    return ownerFor(fixture).owner.prepare(fixture.candidate);
  },
  'dispose-failure': async () => {
    const surface = createFakeCalculatedSeriesChartSurface();
    const configured = ownerFor(initial, surface);
    surface.failNext('dispose', { recoveryUnproven: true });
    return configured.owner.dispose();
  },
};
for (const fixture of negativeCases) {
  await expectCode(fixture.expectedCode, operations[fixture.name], fixture.name);
}

for (const phase of ['apply:mutation', 'apply:readback']) {
  const surface = createFakeCalculatedSeriesChartSurface();
  const configured = ownerFor(initial, surface);
  surface.failNext(phase);
  const value = await configured.owner.prepare(initial.candidate);
  await expectCode('CALCULATED_SERIES_CHART_APPLY_FAILED', () => value.apply());
  assert.equal(configured.owner.snapshot().status, 'ready');
}

{
  const surface = createFakeCalculatedSeriesChartSurface();
  let recoveryCalls = 0;
  const configured = ownerFor(initial, surface, {
    recoverFromAcceptedSnapshot: async () => { recoveryCalls += 1; return false; },
  });
  surface.failNext('apply:mutation', { recoveryUnproven: true });
  const value = await configured.owner.prepare(initial.candidate);
  await expectCode('CALCULATED_SERIES_CHART_APPLY_UNPROVEN', () => value.apply());
  assert.equal(configured.owner.snapshot().status, 'poisoned');
  assert.equal(configured.owner.snapshot().recoveryOutcome, 'activation-poisoned');
  assert.equal(recoveryCalls, 1);
}

for (const phase of ['rollback', 'finalize:cleanup']) {
  const surface = createFakeCalculatedSeriesChartSurface();
  let recoveryCalls = 0;
  const configured = ownerFor(initial, surface, {
    recoverFromAcceptedSnapshot: async () => { recoveryCalls += 1; return false; },
  });
  const value = await configured.owner.prepare(initial.candidate);
  const valueReceipt = await value.apply();
  surface.failNext(phase, { recoveryUnproven: true });
  await expectCode(
    phase === 'rollback'
      ? 'CALCULATED_SERIES_CHART_ROLLBACK_UNPROVEN'
      : 'CALCULATED_SERIES_CHART_FINALIZE_UNPROVEN',
    () => (phase === 'rollback' ? value.rollback(valueReceipt) : value.finalize(valueReceipt)),
  );
  assert.equal(configured.owner.snapshot().status, 'poisoned');
  assert.equal(configured.owner.snapshot().recoveryOutcome, 'activation-poisoned');
  assert.equal(recoveryCalls, 1);
}

const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-h119-chrome-'));
const server = createStaticServer(REPOSITORY_ROOT, {
  additionalPublicPathPrefixes: [
    '/v7/tests/fixtures/calculated-series-chart-projection/',
    '/v7/tests/fixtures/calculated-series-pure-contract/',
    '/v7/tests/support/',
  ],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1000,700',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const file = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').split(/\r?\n/u)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function stopChrome() {
  if (chrome.exitCode !== null) return;
  chrome.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => chrome.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (chrome.exitCode === null) chrome.kill('SIGKILL');
}

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find(({ type }) => type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}/v7/tests/fixtures/calculated-series-chart-projection/`,
  });
  await waitFor(cdp, `['ready', 'failed'].includes(document.querySelector('#chart')?.dataset.scenario)`, 10_000);
  const scenarioState = await evaluate(cdp, `(() => {
    const chart = document.querySelector('#chart');
    return { error: chart?.dataset.error ?? null, scenario: chart?.dataset.scenario ?? null };
  })()`);
  assert.deepEqual(scenarioState, { error: null, scenario: 'ready' });
  const result = await evaluate(cdp, 'globalThis.__calculatedSeriesProjectionResult');
  assert.deepEqual(result.before, result.after, 'projection settlement must not mutate candle writer state');
  assert.equal(result.ready.paneCount, 2);
  assert.ok(result.ready.matchedColorPixels > 0, 'real calculated-series colors must paint');
  assert.equal(result.ready.nativePlotSeries, 7);
  assert.equal(result.nativeWhitespaceControl.gapCount, 1);
  assert.equal(result.nativeWhitespaceControl.checkedProbeCount, 2);
  assert.ok(result.nativeWhitespaceControl.bridgePixelCount > 0,
    'the visual probe must detect pinned Lightweight Charts native whitespace bridging');
  assert.deepEqual(result.ready.whitespaceGaps, {
    bridgePixelCount: 0,
    checkedProbeCount: 6,
    gapCount: 3,
  }, 'every explicit line/area/baseline whitespace gap must be pixel-proven unbridged');
  assert.deepEqual(result.readySurface.nativeInventory, {
    bands: 1, nativePlotSeries: 7, plots: 4, referenceLines: 1, regions: 2, scales: 2,
  });
  assert.deepEqual(result.pendingSurface.nativeInventory, {
    bands: 0, nativePlotSeries: 0, plots: 0, referenceLines: 0, regions: 2, scales: 0,
  });
  assert.deepEqual(result.retained.retainedHandles, {
    bands: 1, plots: 4, referenceLines: 1, regions: 2, scales: 2,
  });
  assert.equal(result.moved.paneCount, 2);
  assert.equal(result.surface.nativeInventory.plots, 4, 'move rollback must restore prior inventory');

  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const image = Buffer.from(screenshot.data, 'base64');
  assert.ok(image.length > 10_000, 'real single-chart Main/internal screenshot must be painted');
  if (process.env.V7_UPDATE_VISUALS === '1') fs.writeFileSync(screenshotFile, image);
  else {
    assert.ok(fs.existsSync(screenshotFile), 'missing H119 focused screenshot evidence');
    assert.ok(fs.statSync(screenshotFile).size > 10_000, 'H119 screenshot evidence is empty');
  }

  const point = await evaluate(cdp, `(() => {
    const box = document.querySelector('#chart').getBoundingClientRect();
    return { x: box.left + box.width * .55, y: box.top + box.height * .4 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: point.x, y: point.y, button: 'none', buttons: 0,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: point.x + 24, y: point.y, button: 'left', buttons: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: point.x + 24, y: point.y, button: 'left', buttons: 0, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x: point.x, y: point.y, deltaX: 0, deltaY: -80,
  });
  await waitFor(cdp, 'globalThis.__calculatedSeriesProjectionResult.viewportIntents.length > 0');
  assert.ok((await evaluate(cdp,
    'globalThis.__calculatedSeriesProjectionResult.crosshair.length')) > 0);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1, height: 560, mobile: false, width: 760,
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const containment = await evaluate(cdp, `(() => {
    const box = document.querySelector('#chart').getBoundingClientRect();
    return { bottom: box.bottom, right: box.right, viewportHeight: innerHeight, viewportWidth: innerWidth };
  })()`);
  assert.ok(containment.right <= containment.viewportWidth + 1);
  assert.ok(containment.bottom <= containment.viewportHeight + 1);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1, height: 700, mobile: false, width: 1000,
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  await evaluate(cdp, 'globalThis.__disposeCalculatedSeriesProjectionFixture()');
} finally {
  cdp?.close();
  await stopChrome();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 50,
  });
}

console.log(
  `v7 H119 calculated-series Chart-owned projection harness passed (${negativeCases.length} negative controls, exact reversible child transaction, real one-chart Main/internal Plot evidence)`,
);
