import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AnnotationEvidenceError,
  createAcceptedAnnotationEvidenceSnapshot,
  createAnnotationEvidenceRequirement,
  createAnnotationEvidenceSelection,
  readAnnotationEvidenceBundle,
  resolveAnnotationEvidence,
} from '../src/annotation-evidence-resolver/public.js';
import { createSessionId } from '../src/session-identity/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negative = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-evidence-resolver/negative/cases.json',
), 'utf8'));
const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const sessionId = createSessionId('session.r13-10a');

function bar(index, overrides = {}) {
  const open = 100 + index;
  return {
    close: open + 0.25,
    endEpochMs: BASE + ((index + 1) * MINUTE),
    high: open + 1,
    low: open - 1,
    open,
    startEpochMs: BASE + (index * MINUTE),
    volume: 10 + index,
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return createAcceptedAnnotationEvidenceSnapshot({
    acceptedWorkspaceRevision: 7,
    artifacts: [{
      artifactId: 'artifact.level-1',
      observedAtReplayCutoffEpochMs: BASE + (2 * MINUTE),
      revision: 3,
    }],
    bars: [bar(0), bar(1), bar(2), bar(3), bar(4)],
    datasetRevision: 'dataset.fixture-1',
    displayTimeframeId: 'timeframe.5m',
    instrumentId: 'instrument.nq',
    paneId: 'pane.nq-main',
    replayCutoffEpochMs: BASE + (4 * MINUTE) + 30_000,
    schemaVersion: 1,
    sessionId,
    sourceTimeframeId: 'timeframe.1m',
    ...overrides,
  });
}

function selection(overrides = {}) {
  return createAnnotationEvidenceSelection({
    artifactReferences: [{ artifactId: 'artifact.level-1', revision: 3 }],
    barStartEpochMs: BASE + (2 * MINUTE),
    schemaVersion: 1,
    ...overrides,
  });
}

function requirement(overrides = {}) {
  return createAnnotationEvidenceRequirement({
    followingBars: 1,
    maximumArtifactReferences: 1,
    precedingBars: 1,
    schemaVersion: 1,
    ...overrides,
  });
}

function resolve(overrides = {}) {
  return resolveAnnotationEvidence({
    requirement: requirement(),
    selection: selection(),
    snapshot: snapshot(),
    ...overrides,
  });
}

const accepted = readAnnotationEvidenceBundle(resolve());
assert.equal(Object.isFrozen(accepted), true);
assert.equal(Object.isFrozen(accepted.bars), true);
assert.equal(Object.isFrozen(accepted.bars[0].reference), true);
assert.equal(Object.isFrozen(accepted.bars[0].value), true);
assert.deepEqual(accepted.bars.map(({ relativeOffset }) => relativeOffset), [-1, 0, 1]);
assert.deepEqual(accepted.bars[0], {
  reference: {
    datasetRevision: 'dataset.fixture-1',
    displayTimeframeId: 'timeframe.5m',
    endEpochMs: BASE + (2 * MINUTE),
    instrumentId: 'instrument.nq',
    observedAtReplayCutoffEpochMs: BASE + (4 * MINUTE) + 30_000,
    sourceTimeframeId: 'timeframe.1m',
    startEpochMs: BASE + MINUTE,
  },
  relativeOffset: -1,
  value: { close: 101.25, high: 102, low: 100, open: 101, volume: 11 },
});
assert.deepEqual(accepted.artifactReferences, [{ artifactId: 'artifact.level-1', revision: 3 }]);
assert.equal(accepted.acceptedWorkspaceRevision, 7);
assert.equal(accepted.paneId, 'pane.nq-main');
assert.equal(accepted.sessionId, sessionId);
assert.deepEqual(
  readAnnotationEvidenceBundle(resolve()),
  accepted,
  'identical accepted inputs must resolve deterministic evidence',
);

const mutableBars = [bar(0), bar(1), bar(2)];
const copiedSnapshot = snapshot({
  bars: mutableBars,
  replayCutoffEpochMs: BASE + (3 * MINUTE),
});
mutableBars[1].close = 9_999;
mutableBars.push(bar(3));
const copied = readAnnotationEvidenceBundle(resolve({
  selection: selection({ artifactReferences: [], barStartEpochMs: BASE + MINUTE }),
  requirement: requirement({ maximumArtifactReferences: 0 }),
  snapshot: copiedSnapshot,
}));
assert.equal(copied.bars[1].value.close, 101.25, 'snapshot creation must sever mutable Bar input');
assert.equal(copied.bars.length, 3);

const futureArtifactSnapshot = () => snapshot({
  artifacts: [{
    artifactId: 'artifact.level-1',
    observedAtReplayCutoffEpochMs: BASE + (5 * MINUTE),
    revision: 3,
  }],
});
const twoArtifactsSnapshot = () => snapshot({
  artifacts: [
    {
      artifactId: 'artifact.level-1',
      observedAtReplayCutoffEpochMs: BASE + MINUTE,
      revision: 3,
    },
    {
      artifactId: 'artifact.level-2',
      observedAtReplayCutoffEpochMs: BASE + MINUTE,
      revision: 1,
    },
  ],
});
const operations = {
  'artifact-future': () => resolve({ snapshot: futureArtifactSnapshot() }),
  'artifact-limit': () => resolve({
    requirement: requirement({ maximumArtifactReferences: 1 }),
    selection: selection({ artifactReferences: [
      { artifactId: 'artifact.level-1', revision: 3 },
      { artifactId: 'artifact.level-2', revision: 1 },
    ] }),
    snapshot: twoArtifactsSnapshot(),
  }),
  'artifact-missing': () => resolve({
    selection: selection({ artifactReferences: [{ artifactId: 'artifact.absent', revision: 1 }] }),
  }),
  'artifact-revision': () => resolve({
    selection: selection({ artifactReferences: [{ artifactId: 'artifact.level-1', revision: 4 }] }),
  }),
  'bundle-lookalike': () => readAnnotationEvidenceBundle(accepted),
  'following-neighbor-missing': () => resolve({
    selection: selection({ artifactReferences: [], barStartEpochMs: BASE + (4 * MINUTE) }),
  }),
  'future-confirming-bar': () => resolve({
    selection: selection({ artifactReferences: [], barStartEpochMs: BASE + (3 * MINUTE) }),
  }),
  'preceding-neighbor-missing': () => resolve({
    selection: selection({ artifactReferences: [], barStartEpochMs: BASE }),
  }),
  'requirement-lookalike': () => resolve({
    requirement: { followingBars: 1, maximumArtifactReferences: 1, precedingBars: 1, schemaVersion: 1 },
  }),
  'requirement-unbounded': () => requirement({ followingBars: 17 }),
  'resolution-extra': () => resolve({ ignored: true }),
  'selected-bar-missing': () => resolve({
    selection: selection({ barStartEpochMs: BASE + 30_000 }),
  }),
  'selection-artifact-duplicate': () => selection({ artifactReferences: [
    { artifactId: 'artifact.level-1', revision: 3 },
    { artifactId: 'artifact.level-1', revision: 3 },
  ] }),
  'selection-lookalike': () => resolve({
    selection: { artifactReferences: [], barStartEpochMs: BASE, schemaVersion: 1 },
  }),
  'snapshot-artifact-duplicate': () => snapshot({ artifacts: [
    { artifactId: 'artifact.level-1', observedAtReplayCutoffEpochMs: BASE, revision: 1 },
    { artifactId: 'artifact.level-1', observedAtReplayCutoffEpochMs: BASE, revision: 2 },
  ] }),
  'snapshot-bar-envelope': () => snapshot({ bars: [bar(0, { high: 90 })] }),
  'snapshot-bars-order': () => snapshot({ bars: [bar(1), bar(0)] }),
  'snapshot-extra': () => snapshot({ futureOwner: true }),
  'snapshot-lookalike': () => resolve({ snapshot: {} }),
  'snapshot-session': () => snapshot({ sessionId: 'session.r13-10a' }),
};

assert.equal(negative.schemaVersion, 1);
for (const testCase of negative.cases) {
  assert.throws(operations[testCase.operation], (error) => {
    assert.ok(error instanceof AnnotationEvidenceError, testCase.name);
    assert.equal(error.code, testCase.expectedCode, testCase.name);
    return true;
  });
}

const moduleSource = fs.readdirSync(path.join(V7_ROOT, 'src/annotation-evidence-resolver'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/annotation-evidence-resolver', file), 'utf8'))
  .join('\n');
assert.doesNotMatch(moduleSource, /\b(?:fetch|requestRawBars|requestProjectedHistory|XMLHttpRequest)\b/,
  'pure resolver must have no data-request surface');

console.log(`v7 annotation evidence resolver harness passed (${negative.cases.length} negative controls)`);
