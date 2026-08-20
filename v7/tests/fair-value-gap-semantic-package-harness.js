import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import * as evidenceContract from '../src/annotation-evidence-resolver/public.js';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import {
  AnnotationChartProjectionError,
  createAnnotationProjection,
  readAnnotationProjection,
} from '../src/annotation-chart-projection/public.js';
import {
  ANCHOR_PROJECTION_POLICIES,
  createAnnotationProjectionFrame,
  createAnnotationProjectionSubject,
  createInitialAnchorProjectionPolicyRegistry,
  deriveAnnotationPaneProjectionSets,
} from '../src/annotation-context-projection/public.js';
import {
  createAnnotationRuntime,
  createRestoredAnnotationRuntime,
} from '../src/annotation-runtime/public.js';
import {
  AnnotationSemanticPackageError,
  createSemanticPackageRegistry,
} from '../src/annotation-semantic-registry/public.js';
import {
  createAnnotationStorageAdapter,
  createDurableAnnotationRepository,
} from '../src/annotation-persistence/public.js';
import {
  createFairValueGapSemanticPackage,
  FAIR_VALUE_GAP_PACKAGE_ID,
  FAIR_VALUE_GAP_PROFILE,
  FAIR_VALUE_GAP_TYPE_ID,
} from '../src/semantic-fair-value-gap/public.js';
import { createSessionId, serializeSessionId } from '../src/session-identity/public.js';
import { createFakeAnnotationRepository } from './support/fake-annotation-repository.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createMemoryWebStorage } from './support/memory-web-storage.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const sessionId = createSessionId('session.r13-10c');
const otherSessionId = createSessionId('session.r13-10c-other');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/fair-value-gap-semantic-package/negative/cases.json',
), 'utf8'));

function bullishValues() {
  return [
    { close: 100.5, high: 101, low: 99, open: 100, volume: 11 },
    { close: 104, high: 105, low: 100, open: 100.5, volume: 18 },
    { close: 105, high: 106, low: 103, open: 104, volume: 14 },
  ];
}

function bearishValues() {
  return [
    { close: 104, high: 106, low: 103, open: 105, volume: 11 },
    { close: 100, high: 105, low: 99, open: 104, volume: 18 },
    { close: 99, high: 101, low: 98, open: 100, volume: 14 },
  ];
}

function bars(values = bullishValues(), starts = [4, 5, 6]) {
  return values.map((value, index) => Object.freeze({
    ...value,
    endEpochMs: BASE + ((starts[index] + 1) * MINUTE),
    startEpochMs: BASE + (starts[index] * MINUTE),
  }));
}

function resolvedEvidence({
  artifactReferences = [],
  artifacts = [],
  followingBars = 1,
  precedingBars = 1,
  selectedIndex = 1,
  sourceBars = bars(),
} = {}) {
  const replayCutoffEpochMs = Math.max(...sourceBars.map(({ endEpochMs }) => endEpochMs));
  const snapshot = evidenceContract.createAcceptedAnnotationEvidenceSnapshot({
    acceptedWorkspaceRevision: 17,
    artifacts,
    bars: sourceBars,
    datasetRevision: 'dataset.r13-10c',
    displayTimeframeId: 'timeframe.1m',
    instrumentId: 'instrument.nq',
    paneId: 'pane.nq-1m',
    replayCutoffEpochMs,
    schemaVersion: 1,
    sessionId,
    sourceTimeframeId: 'timeframe.1m',
  });
  const selection = evidenceContract.createAnnotationEvidenceSelection({
    artifactReferences,
    barStartEpochMs: sourceBars[selectedIndex].startEpochMs,
    schemaVersion: 1,
  });
  const requirement = evidenceContract.createAnnotationEvidenceRequirement({
    followingBars,
    maximumArtifactReferences: artifactReferences.length,
    precedingBars,
    schemaVersion: 1,
  });
  return evidenceContract.resolveAnnotationEvidence({ requirement, selection, snapshot });
}

function packageManifest(overrides = {}) {
  return createFairValueGapSemanticPackage({
    evidenceContract: overrides.evidenceContract ?? evidenceContract,
    geometryContract: overrides.geometryContract ?? geometryContract,
  });
}

function registry({ capabilities, packages } = {}) {
  return createSemanticPackageRegistry({
    availableCapabilities: capabilities ?? [
      'annotation.evidence.bundle',
      'annotation.geometry.rectangle',
      'annotation.geometry.segment',
    ],
    packages: packages ?? [packageManifest()],
  });
}

function construction(evidence = resolvedEvidence(), overrides = {}) {
  return {
    createdAtEpochMs: BASE + (8 * MINUTE),
    evidence,
    mode: 'evidence-derived',
    sessionId,
    ...overrides,
  };
}

function artifactDraft(owner, artifactId, evidence = resolvedEvidence(), overrides = {}) {
  return owner.constructArtifactDraft({
    artifactId,
    construction: construction(evidence, overrides),
    typeId: FAIR_VALUE_GAP_TYPE_ID,
    typeVersion: '1.0.0',
  });
}

function runtime(semanticContract, repository = createFakeAnnotationRepository()) {
  return createAnnotationRuntime({ geometryContract, repository, semanticContract, sessionId });
}

async function capture(action) {
  try { await action(); } catch (error) { return error; }
  assert.fail('Expected operation to fail.');
}

const owner = registry();
await owner.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
assert.deepEqual(owner.listSemanticTypes().map(({ typeId }) => typeId), [FAIR_VALUE_GAP_TYPE_ID]);
assert.deepEqual(owner.listTools().map(({ id }) => id), ['construct.imbalance.fvg']);

const bullishDraft = artifactDraft(owner, 'artifact.fvg-bullish');
const bullishRecord = owner.readArtifactDraft(bullishDraft);
assert.equal(Object.isFrozen(bullishRecord), true);
assert.equal(bullishRecord.typeId, FAIR_VALUE_GAP_TYPE_ID);
assert.equal(bullishRecord.attributes.direction, 'bullish');
assert.deepEqual(bullishRecord.attributes.lowerPrice, {
  baselineValue: 101,
  effectiveSource: 'derived',
  effectiveValue: 101,
  overrideProvenance: null,
});
assert.deepEqual(bullishRecord.attributes.upperPrice, {
  baselineValue: 103,
  effectiveSource: 'derived',
  effectiveValue: 103,
  overrideProvenance: null,
});
assert.equal(bullishRecord.attributes.midpointPrice.effectiveValue, 102);
assert.equal(bullishRecord.definition.packageId, FAIR_VALUE_GAP_PACKAGE_ID);
assert.equal(bullishRecord.definition.packageVersion, '1.0.0');
assert.equal(bullishRecord.definition.definitionId, FAIR_VALUE_GAP_PROFILE.profileId);
assert.equal(bullishRecord.definition.definitionVersion, FAIR_VALUE_GAP_PROFILE.profileVersion);
assert.equal(bullishRecord.provenance.recognitionSource, 'human');
assert.equal(bullishRecord.provenance.constructionSource, 'derived');
assert.equal(bullishRecord.provenance.sourceBars.length, 3);
assert.equal(bullishRecord.provenance.packageProvenance.acceptedWorkspaceRevision, 17);
assert.equal(bullishRecord.provenance.packageProvenance.paneId, 'pane.nq-1m');
assert.deepEqual(bullishRecord.provenance.packageProvenance.profile, FAIR_VALUE_GAP_PROFILE);
assert.deepEqual(
  bullishRecord.provenance.packageProvenance.session,
  serializeSessionId(sessionId),
);
assert.deepEqual(owner.readArtifactDraft(
  artifactDraft(owner, 'artifact.fvg-bullish'),
), bullishRecord, 'identical FVG construction must be deterministic');

const bearishRecord = owner.readArtifactDraft(artifactDraft(
  owner,
  'artifact.fvg-bearish',
  resolvedEvidence({ sourceBars: bars(bearishValues()) }),
));
assert.equal(bearishRecord.attributes.direction, 'bearish');
assert.equal(bearishRecord.attributes.lowerPrice.effectiveValue, 101);
assert.equal(bearishRecord.attributes.upperPrice.effectiveValue, 103);
assert.equal(bearishRecord.attributes.midpointPrice.effectiveValue, 102);

const annotation = runtime(owner);
await annotation.createSemanticArtifact({
  draft: bullishDraft,
  expectedDocumentRevision: 0,
  sessionId,
});
const bullishArtifact = annotation.getSemanticArtifact('artifact.fvg-bullish');
assert.equal(bullishArtifact.revision, 1);
assert.equal(owner.inspectArtifact(bullishArtifact).groups.length, 0);
const projectionInputs = owner.projectionInputsForArtifact(bullishArtifact);
assert.equal(projectionInputs.length, 2);
assert.deepEqual(projectionInputs.map(({ geometry }) => geometry.typeId), [
  'geometry.rectangle', 'geometry.segment',
]);
assert.equal(projectionInputs[0].presentation.label.text, 'Bullish FVG');
assert.equal(projectionInputs[0].presentation.label.visible, true);
assert.equal(Object.hasOwn(projectionInputs[1].presentation, 'label'), false);
assert.equal(projectionInputs.every(({ policy }) => (
  policy.policyId === ANCHOR_PROJECTION_POLICIES.acceptedContainingBucket
)), true);

function frame(reconciliationRevision, replayCutoffEpochMs) {
  return createAnnotationProjectionFrame({
    annotationRevision: annotation.getDocument().revision,
    panes: [
      {
        acceptedBuckets: Array.from({ length: 10 }, (_, index) => ({
          endEpochMs: BASE + ((index + 1) * MINUTE),
          startEpochMs: BASE + (index * MINUTE),
        })),
        instrumentId: 'instrument.nq',
        paneId: 'pane.nq-1m',
        timeframeId: 'timeframe.1m',
      },
      {
        acceptedBuckets: [
          { endEpochMs: BASE + (5 * MINUTE), startEpochMs: BASE },
          { endEpochMs: BASE + (10 * MINUTE), startEpochMs: BASE + (5 * MINUTE) },
        ],
        instrumentId: 'instrument.nq',
        paneId: 'pane.nq-5m',
        timeframeId: 'timeframe.5m',
      },
      {
        acceptedBuckets: [
          { endEpochMs: BASE + (15 * MINUTE), startEpochMs: BASE },
        ],
        instrumentId: 'instrument.nq',
        paneId: 'pane.nq-15m',
        timeframeId: 'timeframe.15m',
      },
    ],
    reconciliationRevision,
    replayCutoffEpochMs,
    sessionId,
  });
}

function derive(reconciliationRevision, replayCutoffEpochMs) {
  return deriveAnnotationPaneProjectionSets({
    createProjection: createAnnotationProjection,
    frame: frame(reconciliationRevision, replayCutoffEpochMs),
    geometryContract,
    policyRegistry: createInitialAnchorProjectionPolicyRegistry(),
    subjects: projectionInputs.map(createAnnotationProjectionSubject),
  });
}

const hiddenSets = derive(1, BASE + (6 * MINUTE));
assert.deepEqual(hiddenSets.map(({ projections }) => projections.length), [0, 0, 0]);
const visibleSets = derive(2, BASE + (7 * MINUTE));
const visibleByPane = new Map(visibleSets.map((set) => [set.paneId, set]));
assert.deepEqual(Object.fromEntries([...visibleByPane].map(([paneId, set]) => (
  [paneId, set.projections.length]
))), {
  'pane.nq-15m': 0,
  'pane.nq-1m': 2,
  'pane.nq-5m': 2,
});
assert.deepEqual(visibleByPane.get('pane.nq-15m').provenance, [],
  'a 1m FVG collapsed inside one 15m bucket must omit the whole target-Pane projection');
const projectedZone = visibleByPane.get('pane.nq-1m').projections
  .map(readAnnotationProjection)
  .find(({ geometry }) => geometry.typeId === 'geometry.rectangle');
assert.equal(projectedZone.presentation.label.text, 'Bullish FVG');
assert.equal(projectedZone.geometry.payload.lowPrice, 101);
assert.equal(projectedZone.geometry.payload.highPrice, 103);
assert.equal(visibleByPane.get('pane.nq-5m').provenance
  .every(({ mappings }) => mappings.length === 2), true);

const canonicalDocument = JSON.stringify(annotation.getDocument());
await owner.disablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
assert.equal(owner.resolutionOf(bullishArtifact).status, 'unresolved');
assert.equal(owner.projectionInputsForArtifact(bullishArtifact).length, 0);
assert.equal(JSON.stringify(annotation.getDocument()), canonicalDocument);
await owner.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
assert.equal(owner.projectionInputsForArtifact(bullishArtifact).length, 2);
assert.equal(JSON.stringify(annotation.getDocument()), canonicalDocument);

const durableStorage = createMemoryWebStorage();
const durableRepository = createDurableAnnotationRepository({
  namespace: 'test.annotation.fvg',
  storage: createAnnotationStorageAdapter(durableStorage),
});
const durableRegistry = registry();
await durableRegistry.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
const durable = await createRestoredAnnotationRuntime({
  geometryContract,
  repository: durableRepository,
  semanticContract: durableRegistry,
  sessionId,
});
await durable.createSemanticArtifact({
  draft: artifactDraft(durableRegistry, 'artifact.fvg-durable'),
  expectedDocumentRevision: 0,
  sessionId,
});
const durableBytes = await durable.exportDocument();
await durable.dispose();
await durableRegistry.dispose();
const unresolved = await createRestoredAnnotationRuntime({
  geometryContract,
  repository: durableRepository,
  sessionId,
});
assert.equal(unresolved.listSemanticArtifacts()[0].artifactId, 'artifact.fvg-durable');
assert.equal(await unresolved.exportDocument(), durableBytes);
await unresolved.dispose();
const restoredRegistry = registry();
await restoredRegistry.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
const restored = await createRestoredAnnotationRuntime({
  geometryContract,
  repository: durableRepository,
  semanticContract: restoredRegistry,
  sessionId,
});
assert.equal(restoredRegistry.resolutionOf(restored.listSemanticArtifacts()[0]).status, 'resolved');
assert.equal(restoredRegistry.projectionInputsForArtifact(
  restored.listSemanticArtifacts()[0],
).length, 2);

const overlap = bullishValues();
overlap[2] = { ...overlap[2], low: 100.5, open: 101, close: 102 };
const touching = bullishValues();
touching[2] = { ...touching[2], low: 101, open: 102, close: 103 };
const referencedEvidence = resolvedEvidence({
  artifactReferences: [{ artifactId: 'artifact.level', revision: 1 }],
  artifacts: [{
    artifactId: 'artifact.level',
    observedAtReplayCutoffEpochMs: BASE,
    revision: 1,
  }],
});
const inconsistentArtifact = Object.freeze({
  ...bullishArtifact,
  attributes: Object.freeze({
    ...bullishArtifact.attributes,
    lowerPrice: Object.freeze({
      ...bullishArtifact.attributes.lowerPrice,
      effectiveValue: 100,
    }),
  }),
});
const validLabeledProjection = readAnnotationProjection(
  visibleByPane.get('pane.nq-1m').projections[0],
);
const operations = {
  'artifact-reference': () => artifactDraft(owner, 'artifact.negative-reference', referencedEvidence),
  'bundle-lookalike': () => artifactDraft(owner, 'artifact.negative-lookalike', {}),
  'cross-session': () => artifactDraft(
    owner,
    'artifact.negative-session',
    resolvedEvidence(),
    { sessionId: otherSessionId },
  ),
  'gapped-bars': () => artifactDraft(
    owner,
    'artifact.negative-gap',
    resolvedEvidence({ sourceBars: bars(bullishValues(), [4, 5, 7]) }),
  ),
  'future-unclosed-evidence': () => {
    const sourceBars = bars();
    const snapshot = evidenceContract.createAcceptedAnnotationEvidenceSnapshot({
      acceptedWorkspaceRevision: 17,
      artifacts: [],
      bars: sourceBars,
      datasetRevision: 'dataset.r13-10c',
      displayTimeframeId: 'timeframe.1m',
      instrumentId: 'instrument.nq',
      paneId: 'pane.nq-1m',
      replayCutoffEpochMs: sourceBars[1].endEpochMs,
      schemaVersion: 1,
      sessionId,
      sourceTimeframeId: 'timeframe.1m',
    });
    return evidenceContract.resolveAnnotationEvidence({
      requirement: evidenceContract.createAnnotationEvidenceRequirement({
        followingBars: 1,
        maximumArtifactReferences: 0,
        precedingBars: 1,
        schemaVersion: 1,
      }),
      selection: evidenceContract.createAnnotationEvidenceSelection({
        artifactReferences: [],
        barStartEpochMs: sourceBars[1].startEpochMs,
        schemaVersion: 1,
      }),
      snapshot,
    });
  },
  'incompatible-capabilities': async () => {
    const incompatible = registry({ capabilities: [] });
    await incompatible.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
  },
  'inconsistent-stored-attributes': () => owner.projectionInputsForArtifact(inconsistentArtifact),
  'invalid-created-at': () => artifactDraft(
    owner,
    'artifact.negative-created',
    resolvedEvidence(),
    { createdAtEpochMs: -1 },
  ),
  'missing-evidence-contract': () => packageManifest({ evidenceContract: {} }),
  'missing-geometry-contract': () => packageManifest({ geometryContract: {} }),
  'malformed-bar-evidence': () => evidenceContract.createAcceptedAnnotationEvidenceSnapshot({
    acceptedWorkspaceRevision: 17,
    artifacts: [],
    bars: bars().map((bar, index) => (
      index === 1 ? { ...bar, high: bar.close - 1 } : bar
    )),
    datasetRevision: 'dataset.r13-10c',
    displayTimeframeId: 'timeframe.1m',
    instrumentId: 'instrument.nq',
    paneId: 'pane.nq-1m',
    replayCutoffEpochMs: BASE + (8 * MINUTE),
    schemaVersion: 1,
    sessionId,
    sourceTimeframeId: 'timeframe.1m',
  }),
  'overlapping-wicks': () => artifactDraft(
    owner,
    'artifact.negative-overlap',
    resolvedEvidence({ sourceBars: bars(overlap) }),
  ),
  'projection-label-extra-field': () => createAnnotationProjection({
    entityId: validLabeledProjection.entityId,
    geometry: validLabeledProjection.geometry,
    presentation: {
      ...validLabeledProjection.presentation,
      label: { ...validLabeledProjection.presentation.label, future: true },
    },
    projectionId: 'projection.invalid-label',
    revision: 1,
  }),
  'raw-session': () => artifactDraft(
    owner,
    'artifact.negative-raw-session',
    resolvedEvidence(),
    { sessionId: 'session.r13-10c' },
  ),
  'touching-wicks': () => artifactDraft(
    owner,
    'artifact.negative-touch',
    resolvedEvidence({ sourceBars: bars(touching) }),
  ),
  'two-bar-evidence': () => artifactDraft(
    owner,
    'artifact.negative-two-bars',
    resolvedEvidence({ followingBars: 0 }),
  ),
  'unsupported-mode': () => artifactDraft(
    owner,
    'artifact.negative-mode',
    resolvedEvidence(),
    { mode: 'manual' },
  ),
  'wrong-relative-offsets': () => artifactDraft(
    owner,
    'artifact.negative-offsets',
    resolvedEvidence({ followingBars: 2, precedingBars: 0, selectedIndex: 0 }),
  ),
};

assert.equal(negativeCases.schemaVersion, 1);
for (const testCase of negativeCases.cases) {
  const error = await capture(operations[testCase.name]);
  assert.ok(
    error instanceof AnnotationSemanticPackageError
      || error instanceof AnnotationChartProjectionError
      || error instanceof evidenceContract.AnnotationEvidenceError,
    testCase.name,
  );
  assert.equal(error.code, testCase.expectedCode, testCase.name);
}
assert.equal(owner.packageSnapshot(FAIR_VALUE_GAP_PACKAGE_ID).state, 'active');

const moduleSource = fs.readdirSync(path.join(V7_ROOT, 'src/semantic-fair-value-gap'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/semantic-fair-value-gap', file), 'utf8'))
  .join('\n');
assert.doesNotMatch(
  moduleSource,
  /\b(?:fetch|XMLHttpRequest|requestRawBars|requestProjectedHistory|setData|localStorage)\b/,
  'FVG package must have no Bar request, Chart data writer, network, or storage surface',
);
assert.doesNotMatch(moduleSource, /(?:replay-runtime|bar-data-runtime|workspace-state-runtime)/,
  'FVG package must not import stateful runtime owners');

const repositoryRoot = path.resolve(V7_ROOT, '..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-fvg-package-'));
const server = createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/fair-value-gap-semantic-package/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1440,820',
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

let cdp;
async function stopChrome() {
  if (chrome.exitCode !== null || chrome.signalCode !== null) return;
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  if (chrome.exitCode === null && chrome.signalCode === null) {
    const killed = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill('SIGKILL');
    await Promise.race([killed, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  }
}

try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/fair-value-gap-semantic-package/`,
  });
  await waitFor(cdp, `['ready', 'failed'].includes(document.body.dataset.scenario)`, 15_000);
  const initial = await evaluate(cdp, `({
    candleBytes: globalThis.__fairValueGapFixture?.candleBytes(),
    error: document.body.dataset.error ?? null,
    initialCandleBytes: globalThis.__fairValueGapFixture?.initialCandleBytes,
    projectionCount: globalThis.__fairValueGapFixture?.projectionCount(),
    scenario: document.body.dataset.scenario,
  })`);
  assert.equal(initial.scenario, 'ready', initial.error ?? 'fixture did not become ready');
  assert.equal(initial.projectionCount, 0);
  assert.equal(initial.candleBytes, initial.initialCandleBytes);

  const bullish = await evaluate(cdp, `(async () => {
    const fixture = globalThis.__fairValueGapFixture;
    await fixture.constructBullish();
    const artifact = fixture.document().artifacts[0];
    return {
      artifactType: artifact.typeId,
      direction: artifact.attributes.direction,
      greenLabelPixels: fixture.colorPixels([167, 243, 208]),
      greenPixels: fixture.colorPixels([16, 185, 129]),
      projectionCount: fixture.projectionCount(),
    };
  })()`);
  assert.equal(bullish.artifactType, FAIR_VALUE_GAP_TYPE_ID);
  assert.equal(bullish.direction, 'bullish');
  assert.equal(bullish.projectionCount, 2);
  assert.ok(bullish.greenPixels > 10, 'bullish FVG Rectangle/midpoint must be visible');
  assert.ok(bullish.greenLabelPixels > 1, 'bullish FVG label must be visible');

  const bearish = await evaluate(cdp, `(async () => {
    const fixture = globalThis.__fairValueGapFixture;
    await fixture.constructBearish();
    const artifact = fixture.document().artifacts.find(({ attributes }) => (
      attributes.direction === 'bearish'
    ));
    return {
      candleBytes: fixture.candleBytes(),
      direction: artifact.attributes.direction,
      projectionCount: fixture.projectionCount(),
      redLabelPixels: fixture.colorPixels([254, 205, 211]),
      redPixels: fixture.colorPixels([244, 63, 94]),
    };
  })()`);
  assert.equal(bearish.direction, 'bearish');
  assert.equal(bearish.projectionCount, 4);
  assert.equal(bearish.candleBytes, initial.initialCandleBytes);
  assert.ok(bearish.redPixels > 10, 'bearish FVG Rectangle/midpoint must be visible');
  assert.ok(bearish.redLabelPixels > 1, 'bearish FVG label must be visible');

  const canonicalDocument = await evaluate(
    cdp,
    'JSON.stringify(globalThis.__fairValueGapFixture.document())',
  );
  assert.equal(await evaluate(cdp, 'globalThis.__fairValueGapFixture.before()'), 0);
  assert.equal(
    await evaluate(cdp, 'JSON.stringify(globalThis.__fairValueGapFixture.document())'),
    canonicalDocument,
  );
  assert.equal(await evaluate(cdp, 'globalThis.__fairValueGapFixture.after()'), 4);
  const disabled = await evaluate(cdp, `(async () => {
    const fixture = globalThis.__fairValueGapFixture;
    const projectionCount = await fixture.disablePackage();
    return {
      document: JSON.stringify(fixture.document()),
      packageState: fixture.packageSnapshot().state,
      projectionCount,
    };
  })()`);
  assert.equal(disabled.packageState, 'disabled');
  assert.equal(disabled.projectionCount, 0);
  assert.equal(disabled.document, canonicalDocument);
  const enabled = await evaluate(cdp, `(async () => {
    const fixture = globalThis.__fairValueGapFixture;
    const projectionCount = await fixture.enablePackage();
    return {
      candleBytes: fixture.candleBytes(),
      document: JSON.stringify(fixture.document()),
      packageState: fixture.packageSnapshot().state,
      projectionCount,
    };
  })()`);
  assert.equal(enabled.packageState, 'active');
  assert.equal(enabled.projectionCount, 4);
  assert.equal(enabled.document, canonicalDocument);
  assert.equal(enabled.candleBytes, initial.initialCandleBytes);
  const navigationTarget = await evaluate(cdp, `(() => {
    const bounds = document.querySelector('#chart').getBoundingClientRect();
    return { x: bounds.left + (bounds.width / 2), y: bounds.top + (bounds.height / 2) };
  })()`);
  const rangeBeforeWheel = await evaluate(cdp, 'globalThis.__fairValueGapFixture.logicalRange()');
  await cdp.send('Input.dispatchMouseEvent', {
    deltaX: 0,
    deltaY: -240,
    type: 'mouseWheel',
    x: navigationTarget.x,
    y: navigationTarget.y,
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const rangeAfterWheel = await evaluate(cdp, 'globalThis.__fairValueGapFixture.logicalRange()');
  assert.notEqual(
    rangeAfterWheel.to - rangeAfterWheel.from,
    rangeBeforeWheel.to - rangeBeforeWheel.from,
    'native Chart wheel zoom must remain active',
  );
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'none', buttons: 0, type: 'mouseMoved',
    x: navigationTarget.x, y: navigationTarget.y,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed',
    x: navigationTarget.x, y: navigationTarget.y,
  });
  for (const delta of [24, 48, 72, 96, 120]) {
    await cdp.send('Input.dispatchMouseEvent', {
      button: 'left', buttons: 1, type: 'mouseMoved',
      x: navigationTarget.x + delta, y: navigationTarget.y,
    });
  }
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased',
    x: navigationTarget.x + 120, y: navigationTarget.y,
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const rangeAfterDrag = await evaluate(cdp, 'globalThis.__fairValueGapFixture.logicalRange()');
  assert.notEqual(rangeAfterDrag.from, rangeAfterWheel.from, 'native Chart drag must remain active');
  await evaluate(cdp, 'globalThis.__disposeFairValueGapFixture()');
} finally {
  if (cdp) cdp.close();
  await stopChrome();
  await new Promise((resolve) => server.close(resolve));
  try {
    fs.rmSync(userDataDirectory, {
      force: true, maxRetries: 10, recursive: true, retryDelay: 100,
    });
  } catch (error) {
    if (error.code !== 'ENOTEMPTY') throw error;
  }
}

await Promise.all([
  annotation.dispose(), owner.dispose(), restored.dispose(), restoredRegistry.dispose(),
]);

console.log(`v7 Fair Value Gap Semantic Package harness passed (${negativeCases.cases.length} negative controls)`);
