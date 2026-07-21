import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import {
  createChartAdapterVisibleReceipt,
  createPaneSetChartSnapshotApplication,
} from '../src/chart-snapshot-application/public.js';
import { createPaneWorkspace } from '../src/pane-workspace-domain/public.js';
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
import { createWorkspaceTransactionRuntime } from '../src/workspace-transaction-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/pane-set-materialization/negative/cases.json',
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

function paneWorkspace(cursorEpochMs) {
  return createPaneWorkspace({
    activationGeneration: generation,
    activePaneId: 'pane-es',
    allowedInstrumentIds: [NQ, ES],
    instrumentSync: 'pane',
    panes: [
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
    ],
    primaryInstrumentId: NQ,
    sessionId,
  });
}

function responsePlan(cursorEpochMs = 2_000, action = createReplayPaneAction({ kind: 'manual-next' })) {
  return planReplayPaneResponse({
    action,
    paneWorkspace: paneWorkspace(cursorEpochMs),
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
  return Object.freeze({
    adapter: Object.freeze({
      async applyVisible(context) {
        if (applyFailure(context)) throw new Error('pane-set adapter failed before visible mutation');
        if (!context.isCurrent()) throw Object.assign(new Error('stale'), { code: 'CHART_ADAPTER_STALE' });
        applyCount += 1;
        adapterRevision += 1;
        visibleSnapshot = context.workspaceSnapshot;
        return createChartAdapterVisibleReceipt({
          adapterRevision,
          identity: context.identity,
          workspaceSnapshot: context.workspaceSnapshot,
        });
      },
      async discard() {},
      async stage(context) {
        stagedSnapshots.push(context.workspaceSnapshot);
        if (stageGate) await stageGate.promise;
        return Object.freeze({ workspaceSnapshot: context.workspaceSnapshot });
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
  const runtime = createWorkspaceTransactionRuntime({
    activationGeneration: generation,
    acquisitionPort: ports.acquisitionPort,
    projectionPort: ports.projectionPort,
    replayPort: Object.freeze({
      commitVisible: (proposal) => clock.commitVisible(proposal),
      propose: ({ identity: transactionIdentity }) => clock.proposeAdvance({ advance, identity: transactionIdentity }),
      reject: (proposal) => clock.reject(proposal),
    }),
    sessionId,
    visibleCompletionPort: application,
  });
  return { adapter, application, clock, ports, runtime, trace };
}

async function execute(target, label, plan = responsePlan(target.clock.snapshot().cursorEpochMs)) {
  const transactionIdentity = identity(label);
  const terminal = await target.runtime.execute({
    input: transactionInput(plan, label),
    intent: intent(transactionIdentity),
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
});
await Promise.resolve();
const fastIdentity = identity('fast');
const fastTerminal = describeWorkspaceTransactionEnvelope(await reordered.runtime.execute({
  input: transactionInput(responsePlan(), 'fast'),
  intent: intent(fastIdentity),
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

async function presentSnapshot(snapshot, transactionIdentity = directIdentity) {
  const target = createPaneSetChartSnapshotApplication({
    activationGeneration: generation,
    adapter: fakeAdapter().adapter,
    sessionId,
  });
  return target.present({
    identity: transactionIdentity,
    signal: new AbortController().signal,
    workspaceSnapshot: snapshot,
  });
}

const validSnapshot = await completeSnapshot();
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

assert.equal(negativeCases.length, 22);
for (const fixtureCase of negativeCases) {
  assert.equal(typeof negative[fixtureCase.case], 'function', `missing negative control ${fixtureCase.case}`);
  await assert.rejects(
    Promise.resolve().then(negative[fixtureCase.case]),
    (error) => error?.code === fixtureCase.expectedCode,
    `${fixtureCase.case} must fail with ${fixtureCase.expectedCode}`,
  );
}

console.log(`v7 Pane-set Materialization harness passed (${negativeCases.length} negative/race controls)`);
