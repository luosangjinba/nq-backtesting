import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import {
  createChartAdapterVisibleReceipt,
  createPaneSetChartSnapshotApplication,
} from '../src/chart-snapshot-application/public.js';
import { createLightweightPaneSetAdapter } from '../src/lightweight-chart-adapter/public.js';
import { createPaneWorkspace } from '../src/pane-workspace-domain/public.js';
import { createPreparedCommit, readPreparedRollbackReceipt } from '../src/prepared-commit-contract/public.js';
import {
  createEmptyPaneProjection,
  createPaneSetMaterializationPorts,
  createPaneSetTransactionInput,
  readPaneSetTransactionInput,
} from '../src/pane-set-materialization/public.js';
import {
  createReplayAdvanceInput,
  createReplayCursorProposal,
  createReplayStep,
} from '../src/replay-contract/public.js';
import {
  createReplayPaneAction,
  planReplayPaneResponse,
} from '../src/replay-pane-response-contract/public.js';
import { createReplayRuntime } from '../src/replay-runtime/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createInitialViewportIntent } from '../src/viewport-runtime/public.js';
import {
  createWorkspaceTransactionIdentity,
  createWorkspaceTransactionIntent,
  describeWorkspaceTransactionEnvelope,
} from '../src/workspace-transaction-contract/public.js';
import {
  createWorkspaceSemanticCandidate,
  createWorkspaceTransactionRuntime,
} from '../src/workspace-transaction-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/pane-set-materialization/negative/cases.json',
), 'utf8'));
const reversibleCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/chart-snapshot-application/negative/reversible-cases.json',
), 'utf8'));

const sessionId = createSessionId('session-pane-set');
const generation = createActivationGeneration(1);
const RANGE = Object.freeze({ endEpochMs: 20_000, startEpochMs: 1_000 });
const NQ = 'instrument.cme.nq';
const ES = 'instrument.cme.es';
const HOURS = Object.freeze({ calendarRevision: 'cme-2026.1', mode: 'eth', revision: 2 });
const advance = createReplayAdvanceInput({ durationMs: 1_000, source: 'manual' });
const replayStep = createReplayStep({
  durationMs: 1_000, id: 'replay-step.test', offsetMs: 0, sourceDurationMs: 1_000,
});
let transactionSequence = 0;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, reject, resolve };
}

function identity(label) {
  return createWorkspaceTransactionIdentity({
    activationGeneration: generation,
    sessionId,
    transactionId: createTransactionId(`pane-set-${label}-${++transactionSequence}`),
  });
}

function intent(transactionIdentity, operation = 'manual-next') {
  return createWorkspaceTransactionIntent({ identity: transactionIdentity, operation });
}

function viewport(paneId, cursorEpochMs) {
  return createInitialViewportIntent({
    activationGeneration: generation,
    cursorEpochMs,
    latestOffsetBars: 12,
    paneId,
    sessionId,
  });
}

function paneWorkspace(cursorEpochMs, paneCount = 2) {
  const panes = [
    {
      instrumentId: NQ,
      paneId: 'pane-nq',
      timeframeId: 'timeframe.fixed.1-minute',
      viewportIntent: viewport('pane-nq', cursorEpochMs),
    },
    {
      instrumentId: ES,
      paneId: 'pane-es',
      timeframeId: 'timeframe.fixed.4-hour',
      viewportIntent: viewport('pane-es', cursorEpochMs),
    },
  ].slice(0, paneCount);
  return createPaneWorkspace({
    activationGeneration: generation,
    activePaneId: panes.at(-1).paneId,
    allowedInstrumentIds: [NQ, ES],
    instrumentSync: 'pane',
    panes,
    primaryInstrumentId: NQ,
    sessionId,
  });
}

function responsePlan(
  cursorEpochMs = 2_000,
  action = createReplayPaneAction({ kind: 'manual-next' }),
  paneCount = 2,
) {
  return planReplayPaneResponse({
    action,
    paneWorkspace: paneWorkspace(cursorEpochMs, paneCount),
    replayRange: RANGE,
    replayStep,
    sessionHours: HOURS,
  });
}

function transactionInput(plan, label, overrides = {}) {
  const requests = plan.affectedPaneIds.map((paneId) => Object.freeze({
    paneId,
    request: Object.freeze({ label, paneId, ...(overrides[paneId] ?? {}) }),
  }));
  return createPaneSetTransactionInput({ paneRequests: Object.freeze(requests), responsePlan: plan });
}

function projectedPane({ paneResponse, proposal }, overrides = {}) {
  return Object.freeze({
    bars: Object.freeze([Object.freeze({
      close: 2,
      displayEpochMs: 1_000,
      high: 3,
      low: 1,
      open: 1.5,
      startEpochMs: 1_000,
      volume: 10,
    })]),
    paneId: paneResponse.paneId,
    provenance: Object.freeze({
      calendarRevision: HOURS.calendarRevision,
      cursorProposal: proposal,
      displayTimeframeId: paneResponse.timeframeId,
      instrumentId: paneResponse.instrumentId,
      sessionHoursMode: HOURS.mode,
      visibleThroughEpochMs: 1_000,
      ...(overrides.provenance ?? {}),
    }),
    schemaVersion: 1,
    ...overrides.snapshot,
  });
}

function fakeAdapter({ applyFailure = () => false, stageGate = null } = {}) {
  let adapterRevision = 0;
  let applyCount = 0;
  let visibleSnapshot = null;
  const stagedSnapshots = [];
  const stages = new WeakMap();
  return Object.freeze({
    adapter: Object.freeze({
      async applyVisible(context) {
        if (applyFailure(context)) throw new Error('pane-set adapter failed before visible mutation');
        if (!context.isCurrent()) throw Object.assign(new Error('stale'), { code: 'CHART_ADAPTER_STALE' });
        const record = stages.get(context.staged);
        record.previousRevision = adapterRevision;
        record.previousSnapshot = visibleSnapshot;
        record.state = 'applied';
        applyCount += 1;
        adapterRevision += 1;
        visibleSnapshot = context.workspaceSnapshot;
        return createChartAdapterVisibleReceipt({
          adapterRevision,
          identity: context.identity,
          workspaceSnapshot: context.workspaceSnapshot,
        });
      },
      finalizeVisible(staged) { stages.get(staged).state = 'finalized'; },
      async rollbackVisible(staged) {
        const record = stages.get(staged);
        if (!record || record.state === 'rolled-back') return;
        if (record.state === 'applied') {
          adapterRevision = record.previousRevision;
          visibleSnapshot = record.previousSnapshot;
        }
        record.state = 'rolled-back';
      },
      async stage(context) {
        stagedSnapshots.push(context.workspaceSnapshot);
        if (stageGate) await stageGate.promise;
        const staged = Object.freeze({ workspaceSnapshot: context.workspaceSnapshot });
        stages.set(staged, { state: 'staged' });
        return staged;
      },
    }),
    read: () => Object.freeze({
      adapterRevision,
      applyCount,
      stagedSnapshots: Object.freeze([...stagedSnapshots]),
      visibleSnapshot,
    }),
  });
}

function preparedOwner({ candidate, identity: transactionIdentity, participant, state }) {
  const previous = Object.freeze({ revision: state.revision, value: state.value });
  const contract = createPreparedCommit({
    baseRevision: state.revision,
    candidate,
    identity: transactionIdentity,
    participant,
    preparedRevision: state.revision,
    schemaVersion: 1,
  });
  return Object.freeze({
    apply() {
      state.revision += 1;
      state.value = candidate;
      return contract.apply({ identity: transactionIdentity, resultingRevision: state.revision });
    },
    dispose: () => contract.dispose(),
    finalize: (receipt) => contract.finalize({
      commitReceipt: receipt, identity: transactionIdentity, resultingRevision: state.revision,
    }),
    rollback(receipt = null) {
      if (contract.snapshot().status === 'applied') {
        state.revision = previous.revision;
        state.value = previous.value;
      }
      return contract.rollback({
        commitReceipt: receipt, identity: transactionIdentity, resultingRevision: previous.revision,
      });
    },
    snapshot: () => contract.snapshot(),
  });
}

function transactionSupport() {
  const workspaceState = { revision: 0, value: null };
  const publicationStages = new WeakMap();
  return Object.freeze({
    publicationPort: Object.freeze({
      apply(stage) { publicationStages.get(stage).state = 'applied'; },
      finalize(stage) { publicationStages.get(stage).state = 'finalized'; },
      reject() {},
      rollback(stage) { publicationStages.get(stage).state = 'rolled-back'; },
      stage() {
        const stage = Object.freeze({});
        publicationStages.set(stage, { state: 'staged' });
        return stage;
      },
    }),
    workspaceStatePort: Object.freeze({
      begin() {},
      prepare({ identity: transactionIdentity, paneWorkspace: workspace, sessionHours }) {
        return preparedOwner({
          candidate: Object.freeze({
            identity: transactionIdentity,
            paneWorkspace: workspace,
            revision: workspaceState.revision + 1,
            schemaVersion: 1,
            sessionHours,
          }),
          identity: transactionIdentity,
          participant: 'workspace-state',
          state: workspaceState,
        });
      },
      reject() {},
    }),
  });
}

function semanticFor(plan) {
  return createWorkspaceSemanticCandidate({
    paneWorkspace: paneWorkspace(plan.fromCursorEpochMs),
    publication: Object.freeze({ layout: 'test' }),
    replayStep,
    sessionHours: HOURS,
  });
}

function fixture({ acquirePane, adapterOptions, projectPane } = {}) {
  const trace = [];
  const clock = createReplayRuntime({
    activationGeneration: generation,
    initialCursorEpochMs: 2_000,
    initialReplayStep: replayStep,
    range: RANGE,
    sessionId,
  });
  const adapter = fakeAdapter(adapterOptions);
  const application = createPaneSetChartSnapshotApplication({
    activationGeneration: generation,
    adapter: adapter.adapter,
    sessionId,
  });
  const ports = createPaneSetMaterializationPorts({
    acquisitionPort: Object.freeze({
      async acquirePane(context) {
        trace.push(`acquire:${context.paneRequest.paneId}:${context.paneRequest.request.label}`);
        if (acquirePane) return acquirePane(context);
        return Object.freeze({ request: context.paneRequest.request });
      },
    }),
    projectionPort: Object.freeze({
      async projectPane(context) {
        trace.push(`project:${context.paneResponse.paneId}:${context.acquired.request.label}`);
        if (projectPane) return projectPane(context);
        return projectedPane(context);
      },
    }),
  });
  const support = transactionSupport();
  const runtime = createWorkspaceTransactionRuntime({
    activationGeneration: generation,
    acquisitionPort: ports.acquisitionPort,
    chartPort: application,
    publicationPort: support.publicationPort,
    projectionPort: ports.projectionPort,
    replayPort: Object.freeze({
      prepare: (proposal) => clock.prepareVisible(proposal),
      propose: ({ identity: transactionIdentity }) => clock.proposeAdvance({ advance, identity: transactionIdentity }),
      reject: (proposal) => clock.reject(proposal),
    }),
    sessionId,
    workspaceStatePort: support.workspaceStatePort,
  });
  return { adapter, application, clock, ports, runtime, trace };
}

async function execute(target, label, plan = responsePlan(target.clock.snapshot().cursorEpochMs)) {
  const transactionIdentity = identity(label);
  const terminal = await target.runtime.execute({
    input: transactionInput(plan, label),
    intent: intent(transactionIdentity),
    semanticCandidate: semanticFor(plan),
  });
  return describeWorkspaceTransactionEnvelope(terminal);
}

const success = fixture();
assert.equal((await execute(success, 'success')).status, 'committed');
const accepted = success.runtime.snapshot().acceptedSnapshot.workspace;
assert.equal(accepted.schemaVersion, 2);
assert.deepEqual(accepted.panes.map(({ paneId, status }) => [paneId, status]), [
  ['pane-nq', 'ready'],
  ['pane-es', 'ready'],
]);
assert.equal(success.clock.snapshot().cursorEpochMs, 3_000);
assert.equal(success.adapter.read().applyCount, 1, 'complete Pane set crosses one visible boundary');
assert.equal(success.adapter.read().visibleSnapshot, accepted);
assert.deepEqual(success.trace, [
  'acquire:pane-nq:success',
  'acquire:pane-es:success',
  'project:pane-nq:success',
  'project:pane-es:success',
]);

const missingComparison = fixture({
  projectPane: async (context) => context.paneResponse.instrumentId === ES
    ? createEmptyPaneProjection({ reason: 'no-source-data' })
    : projectedPane(context),
});
assert.equal((await execute(missingComparison, 'missing-es')).status, 'committed');
assert.deepEqual(
  missingComparison.runtime.snapshot().acceptedSnapshot.workspace.panes.map(({ status }) => status),
  ['ready', 'empty'],
  'missing comparison data does not stall the shared clock',
);
assert.equal(missingComparison.clock.snapshot().cursorEpochMs, 3_000);

for (const stage of ['acquire', 'project']) {
  const failed = fixture({
    acquirePane: stage === 'acquire' ? async (context) => {
      if (context.paneRequest.paneId === 'pane-es') throw new Error('ES acquisition failed');
      return Object.freeze({ request: context.paneRequest.request });
    } : undefined,
    projectPane: stage === 'project' ? async (context) => {
      if (context.paneResponse.paneId === 'pane-es') throw new Error('ES projection failed');
      return projectedPane(context);
    } : undefined,
  });
  assert.equal((await execute(failed, `failed-${stage}`)).status, 'failed');
  assert.equal(failed.runtime.snapshot().acceptedSnapshot, null);
  assert.equal(failed.clock.snapshot().cursorEpochMs, 2_000);
  assert.equal(failed.adapter.read().visibleSnapshot, null);
}

let rejectApply = false;
const preserved = fixture({ adapterOptions: { applyFailure: () => rejectApply } });
assert.equal((await execute(preserved, 'preserved')).status, 'committed');
const priorWorkspace = preserved.runtime.snapshot().acceptedSnapshot.workspace;
const priorChart = preserved.application.snapshot().acceptedSnapshot;
rejectApply = true;
assert.equal((await execute(preserved, 'apply-failure')).status, 'failed');
assert.equal(preserved.runtime.snapshot().acceptedSnapshot.workspace, priorWorkspace);
assert.equal(preserved.application.snapshot().acceptedSnapshot, priorChart);
assert.equal(preserved.clock.snapshot().cursorEpochMs, 3_000);

const slowGate = deferred();
const reordered = fixture({
  acquirePane: async (context) => {
    if (context.paneRequest.request.label === 'slow') await slowGate.promise;
    return Object.freeze({ request: context.paneRequest.request });
  },
});
const slowIdentity = identity('slow');
const slowPromise = reordered.runtime.execute({
  input: transactionInput(responsePlan(), 'slow'),
  intent: intent(slowIdentity),
  semanticCandidate: semanticFor(responsePlan()),
});
await Promise.resolve();
const fastIdentity = identity('fast');
const fastTerminal = describeWorkspaceTransactionEnvelope(await reordered.runtime.execute({
  input: transactionInput(responsePlan(), 'fast'),
  intent: intent(fastIdentity),
  semanticCandidate: semanticFor(responsePlan()),
}));
assert.equal(fastTerminal.status, 'committed');
slowGate.resolve();
assert.equal(describeWorkspaceTransactionEnvelope(await slowPromise).status, 'stale');
assert.equal(reordered.adapter.read().applyCount, 1);
assert.equal(reordered.adapter.read().visibleSnapshot.responsePlan.actionKind, 'manual-next');

const plan = responsePlan();
const validInput = transactionInput(plan, 'negative');
const directIdentity = identity('direct');
const directProposal = createReplayCursorProposal({
  advance,
  baseRevision: 0,
  cursorEpochMs: 2_000,
  identity: directIdentity,
  range: RANGE,
});
const directSignal = new AbortController().signal;
const directContext = Object.freeze({
  identity: directIdentity,
  input: validInput,
  operation: 'manual-next',
  proposal: directProposal,
  signal: directSignal,
});

function directPorts({ acquirePane = async ({ paneRequest }) => Object.freeze({ request: paneRequest.request }), projectPane = projectedPane } = {}) {
  return createPaneSetMaterializationPorts({
    acquisitionPort: Object.freeze({ acquirePane }),
    projectionPort: Object.freeze({ projectPane }),
  });
}

async function completeSnapshot(customPorts = directPorts()) {
  const acquired = await customPorts.acquisitionPort.acquire(directContext);
  return customPorts.projectionPort.project(Object.freeze({ ...directContext, acquired }));
}

async function completeSnapshotFor(transactionIdentity, plan, customPorts = directPorts()) {
  const proposal = createReplayCursorProposal({
    advance,
    baseRevision: 0,
    cursorEpochMs: 2_000,
    identity: transactionIdentity,
    range: RANGE,
  });
  const context = Object.freeze({
    identity: transactionIdentity,
    input: transactionInput(plan, 'prepared-chart'),
    operation: 'manual-next',
    proposal,
    signal: new AbortController().signal,
  });
  const acquired = await customPorts.acquisitionPort.acquire(context);
  return customPorts.projectionPort.project(Object.freeze({ ...context, acquired }));
}

async function presentSnapshot(snapshot, transactionIdentity = directIdentity) {
  const target = createPaneSetChartSnapshotApplication({
    activationGeneration: generation,
    adapter: fakeAdapter().adapter,
    sessionId,
  });
  const prepared = await target.prepare({
    identity: transactionIdentity,
    signal: new AbortController().signal,
    workspaceSnapshot: snapshot,
  });
  const receipt = await prepared.apply();
  return prepared.finalize(receipt);
}

const validSnapshot = await completeSnapshot();

function rollbackProbeAdapter(initialFailingPaneId = 'pane-es') {
  const children = new Map();
  const commits = [];
  const released = [];
  const surfaceStages = new WeakMap();
  let failingPaneId = initialFailingPaneId;
  let surface = Object.freeze({ activePaneId: null, panes: Object.freeze([]) });
  const adapter = createLightweightPaneSetAdapter({
    createPaneAdapter: ({ host }) => {
      const state = { discards: 0, value: 'accepted' };
      const stages = new WeakMap();
      children.set(host.paneId, state);
      return Object.freeze({
        async applyEmpty(context) {
          const record = stages.get(context.staged);
          record.previous = state.value;
          record.state = 'applied';
          state.value = 'empty';
        },
        async applyVisible(context) {
          const record = stages.get(context.staged);
          record.previous = state.value;
          record.state = 'applied';
          state.value = `candidate:${context.workspaceSnapshot.bars.at(-1).close}`;
          if (host.paneId === failingPaneId) throw new Error('child failed after visible mutation');
        },
        clearCrosshairPosition() {},
        crosshairObservation: () => Object.freeze({ bar: null, state: 'empty' }),
        finalizeVisible(staged) { stages.get(staged).state = 'finalized'; },
        async rollbackVisible(staged) {
          const record = stages.get(staged);
          if (!record || record.state === 'rolled-back') return;
          state.discards += 1;
          if (record.state === 'applied') state.value = record.previous;
          record.state = 'rolled-back';
        },
        dispose() {},
        projectCrosshair: () => Object.freeze({ bar: null, state: 'empty' }),
        applyWorkstationSettings(value) { state.workstationSettings = value; },
        setTruncationSelection() {},
        snapshot: () => Object.freeze({ value: state.value }),
        async stage(context) {
          const staged = Object.freeze({ workspaceSnapshot: context.workspaceSnapshot });
          stages.set(staged, { previous: null, state: 'staged' });
          return staged;
        },
        async stageEmpty() {
          const staged = Object.freeze({ empty: true });
          stages.set(staged, { previous: null, state: 'staged' });
          return staged;
        },
      });
    },
    requestFrame: (callback) => callback(),
    resolveInstrumentLabel: () => 'NQ',
    resolvePriceIncrement: () => '0.25',
    resolveViewportPort: () => Object.freeze({}),
    surfacePort: Object.freeze({
      applyPaneSet(value) {
        const receipt = Object.freeze({});
        surfaceStages.set(receipt, { previous: surface, state: 'applied' });
        surface = value;
        commits.push(value);
        return receipt;
      },
      finalizePaneSet(receipt) { surfaceStages.get(receipt).state = 'finalized'; },
      preparePane: (paneId) => Object.freeze({ paneId }),
      releasePane(paneId) { released.push(paneId); },
      rollbackPaneSet(receipt) {
        const record = surfaceStages.get(receipt);
        surface = record.previous;
        record.state = 'rolled-back';
      },
    }),
  });
  return Object.freeze({
    adapter,
    children,
    commits,
    readSurface: () => surface,
    released,
    stopFailing: () => { failingPaneId = null; },
  });
}

const rollbackProbe = rollbackProbeAdapter();
const failedStage = await rollbackProbe.adapter.stage({
  identity: directIdentity, signal: directSignal, workspaceSnapshot: validSnapshot,
});
await assert.rejects(
  () => rollbackProbe.adapter.applyVisible({
    identity: directIdentity,
    isCurrent: () => true,
    signal: directSignal,
    staged: failedStage,
    workspaceSnapshot: validSnapshot,
  }),
  /child failed after visible mutation/,
);
assert.deepEqual([...rollbackProbe.children.values()].map(({ value }) => value), ['accepted', 'accepted'],
  'one child failure must roll back every child that crossed the visible boundary');
assert.equal(rollbackProbe.commits.length, 0, 'failed children must not commit the Pane surface');

rollbackProbe.stopFailing();
const successfulStage = await rollbackProbe.adapter.stage({
  identity: directIdentity, signal: directSignal, workspaceSnapshot: validSnapshot,
});
await rollbackProbe.adapter.applyVisible({
  identity: directIdentity,
  isCurrent: () => true,
  signal: directSignal,
  staged: successfulStage,
  workspaceSnapshot: validSnapshot,
});
assert.deepEqual([...rollbackProbe.children.values()].map(({ value }) => value), ['candidate:2', 'candidate:2']);
await rollbackProbe.adapter.rollbackVisible(successfulStage);
assert.deepEqual([...rollbackProbe.children.values()].map(({ value }) => value), ['accepted', 'accepted'],
  'outer receipt rejection must roll back every successfully applied child');

const emptyComparisonSnapshot = Object.freeze({
  ...validSnapshot,
  panes: Object.freeze(validSnapshot.panes.map((entry) => entry.paneId === 'pane-es'
    ? Object.freeze({ paneId: entry.paneId, reason: 'no-eligible-source', snapshot: null, status: 'empty' })
    : entry)),
});
const emptyStage = await rollbackProbe.adapter.stage({
  identity: directIdentity, signal: directSignal, workspaceSnapshot: emptyComparisonSnapshot,
});
await rollbackProbe.adapter.applyVisible({
  identity: directIdentity,
  isCurrent: () => true,
  signal: directSignal,
  staged: emptyStage,
  workspaceSnapshot: emptyComparisonSnapshot,
});
assert.equal(rollbackProbe.children.get('pane-es').value, 'empty',
  'ready→empty must clear the existing child adapter instead of retaining its previous value');
assert.equal(rollbackProbe.adapter.snapshot().panes.find(({ paneId }) => paneId === 'pane-es').snapshot.value, 'empty');
const restoredReadyStage = await rollbackProbe.adapter.stage({
  identity: directIdentity, signal: directSignal, workspaceSnapshot: validSnapshot,
});
await rollbackProbe.adapter.applyVisible({
  identity: directIdentity,
  isCurrent: () => true,
  signal: directSignal,
  staged: restoredReadyStage,
  workspaceSnapshot: validSnapshot,
});
assert.equal(rollbackProbe.children.get('pane-es').value, 'candidate:2',
  'empty→ready must reuse the same child ownership boundary and accept fresh data');
assert.equal(rollbackProbe.children.size, 2, 'empty transitions must not leak replacement child adapters');
rollbackProbe.adapter.dispose();

function projectionWithClose(close) {
  return directPorts({
    projectPane: async (context) => projectedPane(context, {
      snapshot: {
        bars: Object.freeze([Object.freeze({
          close,
          displayEpochMs: 1_000,
          high: close + 1,
          low: close - 1,
          open: close - 0.5,
          startEpochMs: 1_000,
          volume: 10,
        })]),
      },
    }),
  });
}

const reversibleProbe = rollbackProbeAdapter(null);
const reversibleApplication = createPaneSetChartSnapshotApplication({
  activationGeneration: generation,
  adapter: reversibleProbe.adapter,
  sessionId,
});
const acceptedIdentity = identity('prepared-chart-accepted');
const acceptedSnapshot = await completeSnapshotFor(
  acceptedIdentity,
  responsePlan(2_000, createReplayPaneAction({ kind: 'manual-next' }), 1),
  projectionWithClose(10),
);
const acceptedPrepared = await reversibleApplication.prepare({
  identity: acceptedIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: acceptedSnapshot,
});
const acceptedCommit = await acceptedPrepared.apply();
acceptedPrepared.finalize(acceptedCommit);
const priorSurface = reversibleProbe.readSurface();
assert.deepEqual(priorSurface.panes.map(({ paneId, status }) => [paneId, status]), [
  ['pane-nq', 'ready'],
]);
assert.equal(reversibleApplication.snapshot().revision, 1);

assert.equal(reversibleCases.length, 3);
for (const [index, fixtureCase] of reversibleCases.entries()) {
  const { boundary: laterBoundary } = fixtureCase;
  const candidateIdentity = identity(`prepared-chart-${laterBoundary}`);
  const candidateSnapshot = await completeSnapshotFor(
    candidateIdentity,
    responsePlan(),
    projectionWithClose(20 + index),
  );
  const preparedChart = await reversibleApplication.prepare({
    identity: candidateIdentity,
    signal: new AbortController().signal,
    workspaceSnapshot: candidateSnapshot,
  });
  const commitReceipt = await preparedChart.apply();
  assert.deepEqual(reversibleProbe.readSurface().panes.map(({ paneId }) => paneId), [
    'pane-nq', 'pane-es',
  ], `${laterBoundary} failure must occur after the complete candidate Pane set is visible`);
  assert.equal(reversibleApplication.snapshot().revision, 1,
    'reversible Chart apply must not publish accepted Chart state');
  const rollbackReceipt = await preparedChart.rollback(commitReceipt);
  assert.equal(readPreparedRollbackReceipt(rollbackReceipt).applied, true);
  assert.deepEqual(reversibleProbe.readSurface(), priorSurface,
    `${laterBoundary} failure must restore the exact prior Pane surface`);
  assert.equal(reversibleProbe.children.get('pane-nq').value, 'candidate:10');
  assert.equal(reversibleProbe.children.get('pane-es').value, 'accepted');
  assert.equal(reversibleProbe.adapter.snapshot().adapterRevision, 1);
  assert.equal(reversibleApplication.snapshot().acceptedSnapshot.workspaceSnapshot, acceptedSnapshot);
}

const finalizedIdentity = identity('prepared-chart-finalize');
const finalizedSnapshot = await completeSnapshotFor(
  finalizedIdentity,
  responsePlan(),
  projectionWithClose(30),
);
const finalizedPrepared = await reversibleApplication.prepare({
  identity: finalizedIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: finalizedSnapshot,
});
const finalizedCommit = await finalizedPrepared.apply();
finalizedPrepared.finalize(finalizedCommit);
assert.equal(reversibleApplication.snapshot().revision, 2);
assert.deepEqual(reversibleProbe.adapter.snapshot().acceptedPaneIds, ['pane-nq', 'pane-es']);
assert.deepEqual([...reversibleProbe.children.values()].map(({ value }) => value), [
  'candidate:30', 'candidate:30',
]);
reversibleApplication.dispose();
reversibleProbe.adapter.dispose();

const mutableRequestEntries = plan.affectedPaneIds.map((paneId) => Object.freeze({
  paneId,
  request: Object.freeze({ paneId }),
}));
const negative = {
  'input-extra-field': () => createPaneSetTransactionInput({
    paneRequests: Object.freeze([...mutableRequestEntries]), responsePlan: plan, replay: {},
  }),
  'requests-mutable-array': () => createPaneSetTransactionInput({ paneRequests: mutableRequestEntries, responsePlan: plan }),
  'request-extra-field': () => createPaneSetTransactionInput({
    paneRequests: Object.freeze(mutableRequestEntries.map((entry, index) => index === 0
      ? Object.freeze({ ...entry, cursor: 2_000 }) : entry)),
    responsePlan: plan,
  }),
  'request-pane-empty': () => createPaneSetTransactionInput({
    paneRequests: Object.freeze(mutableRequestEntries.map((entry, index) => index === 0
      ? Object.freeze({ ...entry, paneId: '' }) : entry)),
    responsePlan: plan,
  }),
  'request-mutable': () => createPaneSetTransactionInput({
    paneRequests: Object.freeze(mutableRequestEntries.map((entry, index) => index === 0
      ? Object.freeze({ ...entry, request: {} }) : entry)),
    responsePlan: plan,
  }),
  'request-missing-pane': () => createPaneSetTransactionInput({
    paneRequests: Object.freeze(mutableRequestEntries.slice(0, 1)), responsePlan: plan,
  }),
  'request-order': () => createPaneSetTransactionInput({
    paneRequests: Object.freeze([...mutableRequestEntries].reverse()), responsePlan: plan,
  }),
  'response-plan-lookalike': () => createPaneSetTransactionInput({
    paneRequests: Object.freeze([...mutableRequestEntries]), responsePlan: Object.freeze({ ...plan }),
  }),
  'input-lookalike': () => readPaneSetTransactionInput(Object.freeze({})),
  'acquisition-port-missing': () => createPaneSetMaterializationPorts({
    acquisitionPort: Object.freeze({}), projectionPort: Object.freeze({ projectPane() {} }),
  }),
  'projection-port-missing': () => createPaneSetMaterializationPorts({
    acquisitionPort: Object.freeze({ acquirePane() {} }), projectionPort: Object.freeze({}),
  }),
  'acquired-mutable': async () => directPorts({ acquirePane: async () => ({}) }).acquisitionPort.acquire(directContext),
  'projection-mutable': async () => completeSnapshot(directPorts({ projectPane: async () => ({}) })),
  'projection-wrong-pane': async () => completeSnapshot(directPorts({
    projectPane: async (context) => projectedPane(context, { snapshot: { paneId: 'pane-other' } }),
  })),
  'projection-foreign-proposal': async () => completeSnapshot(directPorts({
    projectPane: async (context) => projectedPane(context, {
      provenance: { cursorProposal: createReplayCursorProposal({
        advance,
        baseRevision: 0,
        cursorEpochMs: 2_000,
        identity: identity('foreign-proposal'),
        range: RANGE,
      }) },
    }),
  })),
  'empty-reason': () => createEmptyPaneProjection({ reason: 'holiday' }),
  'chart-missing-pane': () => presentSnapshot(Object.freeze({
    ...validSnapshot, panes: Object.freeze(validSnapshot.panes.slice(0, 1)),
  })),
  'chart-pane-order': () => presentSnapshot(Object.freeze({
    ...validSnapshot, panes: Object.freeze([...validSnapshot.panes].reverse()),
  })),
  'chart-empty-invalid': () => presentSnapshot(Object.freeze({
    ...validSnapshot,
    panes: Object.freeze([
      validSnapshot.panes[0],
      Object.freeze({ paneId: 'pane-es', reason: 'holiday', snapshot: null, status: 'empty' }),
    ]),
  })),
  'chart-provenance-mismatch': () => presentSnapshot(Object.freeze({
    ...validSnapshot,
    panes: Object.freeze([
      validSnapshot.panes[0],
      Object.freeze({
        ...validSnapshot.panes[1],
        snapshot: Object.freeze({
          ...validSnapshot.panes[1].snapshot,
          provenance: Object.freeze({ ...validSnapshot.panes[1].snapshot.provenance, instrumentId: NQ }),
        }),
      }),
    ]),
  })),
  'chart-instrument-label-port-missing': () => createLightweightPaneSetAdapter({
    requestFrame: (callback) => callback(),
    resolvePriceIncrement: () => '0.25',
    resolveViewportPort: () => Object.freeze({}),
    surfacePort: Object.freeze({
      applyPaneSet: () => Object.freeze({}),
      finalizePaneSet() {},
      preparePane: (paneId) => Object.freeze({ paneId }),
      releasePane() {},
      rollbackPaneSet() {},
    }),
  }).stage({ identity: directIdentity, signal: directSignal, workspaceSnapshot: validSnapshot }),
  'chart-target-mismatch': async () => {
    const exactPlan = responsePlan(2_000, createReplayPaneAction({ kind: 'goto-exact', targetEpochMs: 4_000 }));
    const exactInput = transactionInput(exactPlan, 'exact-mismatch');
    const mismatchContext = Object.freeze({ ...directContext, input: exactInput });
    const ports = directPorts();
    const acquired = await ports.acquisitionPort.acquire(mismatchContext);
    const snapshot = await ports.projectionPort.project(Object.freeze({ ...mismatchContext, acquired }));
    return presentSnapshot(snapshot);
  },
  'chart-cursor-mismatch': () => {
    const cursorPlan = responsePlan(3_000);
    return presentSnapshot(Object.freeze({ ...validSnapshot, responsePlan: cursorPlan }));
  },
};

assert.equal(negativeCases.length, 23);
for (const fixtureCase of negativeCases) {
  assert.equal(typeof negative[fixtureCase.case], 'function', `missing negative control ${fixtureCase.case}`);
  await assert.rejects(
    Promise.resolve().then(negative[fixtureCase.case]),
    (error) => error?.code === fixtureCase.expectedCode,
    `${fixtureCase.case} must fail with ${fixtureCase.expectedCode}`,
  );
}

console.log(`v7 Pane-set Materialization harness passed (${negativeCases.length} negative/race controls + ${reversibleCases.length} later-boundary rollbacks)`);
