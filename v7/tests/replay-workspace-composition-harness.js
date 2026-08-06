import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createLayoutSync } from '../src/layout-sync-domain/public.js';
import { createPaneLayout } from '../src/pane-layout-domain/public.js';
import {
  AUTOPLAY_SPEED_OPTIONS,
  createReplayWorkspaceComposition,
  supportsFoundationWorkspace,
  WORKSPACE_PANE_IDS,
} from '../src/replay-workspace-composition/public.js';
import { createPaneDataComposition } from '../src/replay-workspace-composition/pane-data-composition.js';
import { createWorkspaceCheckpointPersistence } from '../src/replay-workspace-composition/workspace-checkpoint-persistence.js';
import { createPaneProjectionMemo } from '../src/replay-workspace-composition/pane-projection-memo.js';
import { createWorkspaceReplayCommands } from '../src/replay-workspace-composition/workspace-replay-commands.js';
import { brandProjectedPaneSnapshot } from '../src/projection-domain/projected-pane-snapshot.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';
import { createWorkspaceCheckpoint } from '../src/workspace-checkpoint-domain/public.js';
import { validateReplayWorkspaceBoundary } from './support/replay-workspace-boundary-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const compositionDirectory = path.resolve(TEST_DIR, '../src/replay-workspace-composition');
const compositionSources = fs.readdirSync(compositionDirectory)
  .filter((file) => file.endsWith('.js'))
  .sort()
  .map((file) => fs.readFileSync(path.join(compositionDirectory, file), 'utf8'));
const uiDirectory = path.resolve(TEST_DIR, '../src/replay-workspace-ui');
const uiSources = fs.readdirSync(uiDirectory)
  .filter((file) => file.endsWith('.js'))
  .sort()
  .map((file) => fs.readFileSync(path.join(uiDirectory, file), 'utf8'));
const production = Object.freeze({
  commandSource: compositionSources.filter((source) => /export function create\w+Commands|createReplayWorkspaceCommandPort/.test(source)).join('\n'),
  compositionSource: compositionSources.join('\n'),
  uiSource: uiSources.join('\n'),
});

assert.equal(typeof createReplayWorkspaceComposition, 'function');
assert.equal(supportsFoundationWorkspace({
  configuration: { instrumentIds: ['instrument.cme.nq'] },
}), true);
assert.equal(supportsFoundationWorkspace({
  configuration: { instrumentIds: ['instrument.unsupported'] },
}), false);
assert.deepEqual(WORKSPACE_PANE_IDS, [
  'pane-main', 'pane-secondary', 'pane-tertiary', 'pane-quaternary',
]);
assert.equal(AUTOPLAY_SPEED_OPTIONS.length, 4);
assert.deepEqual(validateReplayWorkspaceBoundary(production), []);

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

const nextCalls = [];
const nextCommands = createWorkspaceReplayCommands({
  execution: {
    action: () => {
      const gate = deferred();
      nextCalls.push(gate);
      return gate.promise;
    },
    whenIdle: () => Promise.resolve(),
  },
  isDisposed: () => false,
  replay: { snapshot: () => ({ complete: false }) },
});
const rapidNext = [nextCommands.next(), nextCommands.next(), nextCommands.next()];
await new Promise((resolve) => setImmediate(resolve));
assert.equal(nextCalls.length, 1, 'rapid Manual Next intents must start one Replay transaction at a time');
nextCalls[0].resolve('first');
await new Promise((resolve) => setImmediate(resolve));
assert.equal(nextCalls.length, 2, 'the second Manual Next intent must wait instead of being dropped');
nextCalls[1].resolve('second');
await new Promise((resolve) => setImmediate(resolve));
assert.equal(nextCalls.length, 3, 'the third Manual Next intent must preserve click order');
nextCalls[2].resolve('third');
assert.deepEqual(await Promise.all(rapidNext), ['first', 'second', 'third']);
let afterCompleteCalls = 0;
const completeNextCommands = createWorkspaceReplayCommands({
  execution: {
    action: () => { afterCompleteCalls += 1; },
    whenIdle: () => Promise.resolve(),
  },
  isDisposed: () => false,
  replay: { snapshot: () => ({ complete: true }) },
});
assert.equal(await completeNextCommands.next(), null);
assert.equal(afterCompleteCalls, 0,
  'queued Manual Next intents must drain harmlessly after Replay reaches Session End');

const memo = createPaneProjectionMemo();
const transactionIdentity = Object.freeze({ transactionId: 'transaction.multi-pane-replay' });
const selection = Object.freeze({ id: 'selection.nq-1m-eth' });
const acceptedBars = Object.freeze([]);
const projectedBars = Object.freeze([Object.freeze({ startEpochMs: 1_000 })]);
let projectionCalls = 0;
const compute = () => {
  projectionCalls += 1;
  return brandProjectedPaneSnapshot(Object.freeze({
    bars: projectedBars,
    paneId: 'pane-main',
    provenance: Object.freeze({}),
    schemaVersion: 1,
  }));
};
const firstProjection = memo.project({
  acceptedBars,
  compute,
  identity: transactionIdentity,
  kind: 'replay-advance',
  paneId: 'pane-main',
  requestKeys: Object.freeze(['request.same']),
  selection,
});
const sharedProjection = memo.project({
  acceptedBars,
  compute,
  identity: transactionIdentity,
  kind: 'replay-advance',
  paneId: 'pane-secondary',
  requestKeys: Object.freeze(['request.same']),
  selection,
});
assert.equal(projectionCalls, 1,
  'exact same-transaction Pane inputs must execute deterministic Projection once');
assert.equal(sharedProjection.paneId, 'pane-secondary');
assert.equal(sharedProjection.bars, firstProjection.bars,
  'reused Pane projection must retain the exact immutable bars identity');
memo.project({
  acceptedBars,
  compute,
  identity: transactionIdentity,
  kind: 'replay-advance',
  paneId: 'pane-tertiary',
  requestKeys: Object.freeze(['request.different']),
  selection,
});
assert.equal(projectionCalls, 2, 'different source identity must not reuse Pane projection');

const leaseCommits = [];
const leaseRejections = [];
let leaseSequence = 0;
const leaseBarData = Object.freeze({
  async acquireCoverageLease() {
    leaseSequence += 1;
    return Object.freeze({ id: `lease-${leaseSequence}` });
  },
  commitCoverageLeases(value) { leaseCommits.push(value); },
  oldestCoverageEpochMs: () => null,
  rejectCoverageLeases(value) { leaseRejections.push(value); },
});
const paneSelection = Object.freeze({
  id: 'selection.test',
  instrument: Object.freeze({ id: 'instrument.cme.nq' }),
});
const leasePaneData = createPaneDataComposition({
  barData: leaseBarData,
  market: Object.freeze({
    catalog: Object.freeze({ get: () => paneSelection }),
    requestForTimeLocation: (oldestEpochMs, targetEpochMs) => Object.freeze({
      oldestEpochMs, targetEpochMs,
    }),
    resolveDatasetRevision: async () => 'dataset-r1',
    supportsProjectedHistory: () => false,
  }),
  projectedHistoryData: Object.freeze({ acquire: async () => Object.freeze({}) }),
  readAcceptedSnapshot: () => null,
});
function scopedIdentity(transactionToken) {
  return createWorkspaceTransactionIdentity({
    activationGeneration: createActivationGeneration(9),
    sessionId: createSessionId('pane-data-isolation'),
    transactionId: createTransactionId(transactionToken),
  });
}
function leaseContext(identityValue, paneId) {
  return Object.freeze({
    identity: identityValue,
    paneRequest: Object.freeze({
      request: Object.freeze({
        kind: 'time-location-history',
        oldestEpochMs: 1_000,
        responsePlan: Object.freeze({ sessionHours: Object.freeze({ mode: 'eth' }) }),
        targetEpochMs: 2_000,
      }),
    }),
    paneResponse: Object.freeze({
      instrumentId: 'instrument.cme.nq', paneId, timeframeId: 'timeframe.fixed.1-minute',
    }),
    signal: new AbortController().signal,
  });
}
const leaseIdentityA = scopedIdentity('pane-data-a');
const leaseIdentityB = scopedIdentity('pane-data-b');
const acquiredLeaseA = await leasePaneData.acquisitionPort.acquirePane(
  leaseContext(leaseIdentityA, 'pane-main'),
);
const acquiredLeaseB = await leasePaneData.acquisitionPort.acquirePane(
  leaseContext(leaseIdentityB, 'pane-secondary'),
);
leasePaneData.reject(scopedIdentity('pane-data-a'));
assert.deepEqual(leaseRejections, [[acquiredLeaseA.lease]],
  'reject must settle only the complete matching transaction identity bucket');
leasePaneData.finalize(scopedIdentity('pane-data-b'), ['pane-secondary']);
assert.deepEqual(leaseCommits, [{
  activeConsumerIds: ['pane-secondary'], leases: [acquiredLeaseB.lease],
}], 'finalize must not commit a superseded transaction lease');

let projectedCallerSignal = null;
const projectedPaneData = createPaneDataComposition({
  barData: leaseBarData,
  market: Object.freeze({
    catalog: Object.freeze({ get: () => paneSelection }),
    requestProjectedHistoryBefore: () => Object.freeze({ kind: 'projected-request' }),
    resolveDatasetRevision: async () => 'dataset-r1',
    supportsProjectedHistory: () => true,
  }),
  projectedHistoryData: Object.freeze({
    acquire: async (_request, { signal }) => {
      projectedCallerSignal = signal;
      return Object.freeze({});
    },
  }),
  readAcceptedSnapshot: () => null,
});
const projectedController = new AbortController();
await projectedPaneData.acquisitionPort.acquirePane(Object.freeze({
  identity: scopedIdentity('projected-signal'),
  paneRequest: Object.freeze({
    request: Object.freeze({
      historyDisplayBars: 100,
      kind: 'history-extension',
      oldestEpochMs: 1_000,
      responsePlan: Object.freeze({ sessionHours: Object.freeze({ mode: 'eth' }) }),
    }),
  }),
  paneResponse: Object.freeze({
    instrumentId: 'instrument.cme.nq', paneId: 'pane-main', timeframeId: 'timeframe.fixed.1-hour',
  }),
  signal: projectedController.signal,
}));
assert.equal(projectedCallerSignal, projectedController.signal,
  'Pane Data must pass the Workspace transaction AbortSignal to Projected History');

const checkpointContext = Object.freeze({
  historicalRange: Object.freeze({ startEpochMs: 100, endEpochMs: 1_000 }),
  instrumentIds: Object.freeze(['instrument.cme.nq']),
});
function checkpoint(cursorEpochMs) {
  return createWorkspaceCheckpoint({
    activePaneId: 'pane-main',
    cursorEpochMs,
    panes: [{
      instrumentId: 'instrument.cme.nq',
      paneId: 'pane-main',
      timeframeId: 'timeframe.display-1-minute',
      viewport: { latestOffsetBars: 12, origin: 'default', spanBars: null },
    }],
    sessionHoursMode: 'eth',
  }, checkpointContext);
}
const acceptedCheckpoint = checkpoint(500);
const candidateCheckpoint = checkpoint(600);
const acceptedLayout = createPaneLayout();
const acceptedLayoutSync = createLayoutSync();
let currentCheckpoint = acceptedCheckpoint;
const persistedCheckpoints = [];
let durableCheckpoint = acceptedCheckpoint;
let durableRevision = 11;
const checkpointPersistence = createWorkspaceCheckpointPersistence({
  initialCheckpoint: acceptedCheckpoint,
  initialLayout: acceptedLayout,
  initialLayoutSync: acceptedLayoutSync,
  persist: ({ checkpoint: value, reversible }) => {
    persistedCheckpoints.push(value);
    const previous = Object.freeze({ checkpoint: durableCheckpoint, revision: durableRevision });
    durableCheckpoint = value;
    durableRevision += 1;
    if (!reversible) return undefined;
    let status = 'applied';
    return Object.freeze({
      finalize() { status = 'finalized'; },
      rollback() {
        durableCheckpoint = previous.checkpoint;
        durableRevision = previous.revision;
        status = 'rolled-back';
      },
      snapshot: () => Object.freeze({ status }),
    });
  },
  readLayout: () => acceptedLayout,
  readLayoutSync: () => acceptedLayoutSync,
  view: Object.freeze({ setState() {} }),
  workspaceState: Object.freeze({ checkpoint: () => currentCheckpoint }),
});
currentCheckpoint = candidateCheckpoint;
assert.equal(checkpointPersistence.save({ rethrow: true, reversible: true }), true);
assert.equal(persistedCheckpoints.at(-1), candidateCheckpoint);
assert.equal(checkpointPersistence.restore({
  checkpoint: acceptedCheckpoint,
  layout: acceptedLayout,
  layoutSync: acceptedLayoutSync,
}), true);
assert.equal(durableCheckpoint, acceptedCheckpoint);
assert.equal(durableRevision, 11,
  'transaction rollback must restore the exact prior durable revision');

let failedPersistenceCalls = 0;
currentCheckpoint = candidateCheckpoint;
const atomicFailurePersistence = createWorkspaceCheckpointPersistence({
  initialCheckpoint: acceptedCheckpoint,
  initialLayout: acceptedLayout,
  initialLayoutSync: acceptedLayoutSync,
  persist: () => {
    failedPersistenceCalls += 1;
    throw new Error('injected atomic storage failure');
  },
  readLayout: () => acceptedLayout,
  readLayoutSync: () => acceptedLayoutSync,
  view: Object.freeze({ setState() {} }),
  workspaceState: Object.freeze({ checkpoint: () => currentCheckpoint }),
});
assert.throws(() => atomicFailurePersistence.save({ rethrow: true }),
  /injected atomic storage failure/);
assert.equal(failedPersistenceCalls, 1);
assert.equal(atomicFailurePersistence.restore({
  checkpoint: acceptedCheckpoint,
  layout: acceptedLayout,
  layoutSync: acceptedLayoutSync,
}), true);
assert.equal(failedPersistenceCalls, 1,
  'rollback after an atomic failed write must not manufacture a compensating Session revision');

const negativeCases = Object.freeze([
  {
    code: 'ui-constructs-runtime-owner',
    value: { ...production, uiSource: `${production.uiSource}\ncreateReplayRuntime({});` },
  },
  {
    code: 'ui-missing-public-composition-port',
    value: { ...production, uiSource: production.uiSource.replace(
      'createReplayWorkspaceComposition({', 'missingComposition({',
    ) },
  },
  {
    code: 'ui-missing-presentation-subscription',
    value: { ...production, uiSource: production.uiSource.replace(
      'createWorkspacePresentationPort(view)', 'view',
    ) },
  },
  {
    code: 'composition-touches-dom',
    value: { ...production, compositionSource: `${production.compositionSource}\ndocument.querySelector('#app');` },
  },
  {
    code: 'composition-missing-runtime-owner',
    value: { ...production, compositionSource: production.compositionSource.replace(
      'createBarDataRuntime({', 'missingBarDataRuntime({',
    ) },
  },
  {
    code: 'command-port-constructs-owner',
    value: { ...production, commandSource: `${production.commandSource}\ncreateWorkspaceStateRuntime({});` },
  },
]);

for (const entry of negativeCases) {
  assert.ok(validateReplayWorkspaceBoundary(entry.value).some(({ code }) => code === entry.code),
    `negative control must report ${entry.code}`);
}

console.log('v7 Replay Workspace composition harness passed', {
  scope: 'public boot, UI command/presentation boundary, owner composition, DOM isolation',
  negativeControls: negativeCases.length,
});
