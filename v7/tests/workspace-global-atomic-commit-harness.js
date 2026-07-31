import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import {
  createChartAdapterVisibleReceipt,
  createChartSnapshotApplication,
} from '../src/chart-snapshot-application/public.js';
import {
  createReplayAdvanceInput,
  createReplayStep,
  readReplayCursorProposal,
} from '../src/replay-contract/public.js';
import { createReplayRuntime } from '../src/replay-runtime/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import {
  createWorkspaceTransactionIdentity,
  createWorkspaceTransactionIntent,
  describeWorkspaceTransactionEnvelope,
} from '../src/workspace-transaction-contract/public.js';
import {
  createWorkspaceSemanticCandidate,
  createWorkspaceTransactionRuntime,
} from '../src/workspace-transaction-runtime/public.js';
import {
  createWorkspaceStateRuntime,
  readWorkspaceStateSnapshot,
} from '../src/workspace-state-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/workspace-transaction-runtime/negative/global-atomic-cases.json',
), 'utf8'));
const sessionId = createSessionId('global-atomic-session');
const activationGeneration = createActivationGeneration(1);
const replayStep = createReplayStep({
  durationMs: 60_000,
  id: 'replay-step.global-atomic',
  offsetMs: 0,
  sourceDurationMs: 60_000,
});
const advance = createReplayAdvanceInput({ durationMs: 60_000, source: 'manual' });
const range = Object.freeze({ startEpochMs: 1_000_000, endEpochMs: 2_000_000 });
let sequence = 0;

function identity(label) {
  return createWorkspaceTransactionIdentity({
    activationGeneration,
    sessionId,
    transactionId: createTransactionId(`global-atomic-${label}-${++sequence}`),
  });
}

function failingHandle(handle, participant, readFailure) {
  return Object.freeze({
    apply() {
      if (readFailure() === participant) throw new Error(`${participant} injected failure`);
      return handle.apply();
    },
    dispose: handle.dispose.bind(handle),
    finalize: handle.finalize.bind(handle),
    rollback: handle.rollback.bind(handle),
    snapshot: handle.snapshot.bind(handle),
  });
}

function chartAdapter(readFailure) {
  let revision = 0;
  let visible = null;
  const trace = [];
  const stages = new WeakMap();
  return Object.freeze({
    port: Object.freeze({
      async applyVisible(context) {
        const record = stages.get(context.staged);
        record.previousRevision = revision;
        record.previousVisible = visible;
        revision += 1;
        visible = context.workspaceSnapshot;
        record.state = 'applied';
        trace.push(Object.freeze({ revision, type: 'chart-candidate-visible', visible }));
        if (readFailure() === 'chart') throw new Error('chart injected failure after paint');
        return createChartAdapterVisibleReceipt({
          adapterRevision: revision,
          identity: context.identity,
          workspaceSnapshot: context.workspaceSnapshot,
        });
      },
      finalizeVisible(stage) { stages.get(stage).state = 'finalized'; },
      async rollbackVisible(stage) {
        const record = stages.get(stage);
        if (!record || record.state === 'rolled-back') return;
        if (record.state === 'applied') {
          revision = record.previousRevision;
          visible = record.previousVisible;
          trace.push(Object.freeze({ revision, type: 'chart-accepted-restored', visible }));
        }
        record.state = 'rolled-back';
      },
      async stage() {
        const stage = Object.freeze({});
        stages.set(stage, { state: 'staged' });
        return stage;
      },
    }),
    snapshot: () => Object.freeze({ revision, visible }),
    trace: () => Object.freeze([...trace]),
  });
}

function publicationPort(readFailure) {
  const state = { persistenceRevision: 0, value: null };
  const trace = [];
  const stages = new WeakMap();
  return Object.freeze({
    port: Object.freeze({
      apply(stage) {
        const record = stages.get(stage);
        record.state = 'applying';
        state.value = record.candidate;
        trace.push(Object.freeze({ type: 'publication-candidate-visible', value: state.value }));
        if (readFailure() === 'publication') throw new Error('publication injected failure');
        state.persistenceRevision += 1;
        trace.push(Object.freeze({
          persistenceRevision: state.persistenceRevision,
          type: 'persistence-candidate-written',
        }));
        if (readFailure() === 'persistence') throw new Error('persistence injected failure');
        record.state = 'applied';
      },
      finalize(stage) { stages.get(stage).state = 'finalized'; },
      reject() {},
      rollback(stage) {
        const record = stages.get(stage);
        if (record.state === 'applying' || record.state === 'applied') {
          state.persistenceRevision = record.previous.persistenceRevision;
          state.value = record.previous.value;
          trace.push(Object.freeze({
            persistenceRevision: state.persistenceRevision,
            type: 'publication-and-persistence-restored',
            value: state.value,
          }));
        }
        record.state = 'rolled-back';
      },
      stage({ candidate }) {
        const stage = Object.freeze({});
        stages.set(stage, {
          candidate,
          previous: Object.freeze({ ...state }),
          state: 'staged',
        });
        return stage;
      },
    }),
    snapshot: () => Object.freeze({ ...state }),
    trace: () => Object.freeze([...trace]),
  });
}

function projectedSnapshot(proposal, close) {
  const displayEpochMs = readReplayCursorProposal(proposal).targetEpochMs - 60_000;
  return Object.freeze({
    bars: Object.freeze([Object.freeze({
      close,
      displayEpochMs,
      high: close + 1,
      low: close - 1,
      open: close - 0.5,
      startEpochMs: displayEpochMs,
      volume: 10,
    })]),
    paneId: 'pane-main',
    provenance: Object.freeze({ cursorProposal: proposal }),
    schemaVersion: 1,
  });
}

function fixture() {
  let failure = null;
  let close = 100;
  const readFailure = () => failure;
  const replay = createReplayRuntime({
    activationGeneration,
    initialCursorEpochMs: 1_200_000,
    initialReplayStep: replayStep,
    range,
    sessionId,
  });
  const workspaceState = createWorkspaceStateRuntime({
    activationGeneration,
    allowedInstrumentIds: ['instrument.cme.nq'],
    calendarRevision: 'calendar-global-atomic-r1',
    checkpointContext: Object.freeze({
      historicalRange: range,
      instrumentIds: Object.freeze(['instrument.cme.nq']),
    }),
    initialCursorEpochMs: replay.snapshot().cursorEpochMs,
    initialPaneCount: 1,
    initialRightMarginBars: 12,
    initialSessionHoursMode: 'eth',
    initialTarget: Object.freeze({
      instrumentId: 'instrument.cme.nq',
      timeframeId: 'timeframe.fixed.1-minute',
    }),
    paneIds: ['pane-main'],
    primaryInstrumentId: 'instrument.cme.nq',
    sessionHoursModes: ['eth', 'rth'],
    sessionId,
  });
  const adapter = chartAdapter(readFailure);
  const chart = createChartSnapshotApplication({
    activationGeneration,
    adapter: adapter.port,
    sessionId,
  });
  const publication = publicationPort(readFailure);
  const runtime = createWorkspaceTransactionRuntime({
    activationGeneration,
    acquisitionPort: Object.freeze({ async acquire() { return Object.freeze({}); } }),
    chartPort: chart,
    projectionPort: Object.freeze({
      async project({ proposal }) { return projectedSnapshot(proposal, ++close); },
    }),
    publicationPort: publication.port,
    replayPort: Object.freeze({
      prepare(proposal, workspaceSnapshot) {
        return failingHandle(replay.prepareVisible(proposal, {
          visibleThroughEpochMs: readReplayCursorProposal(
            workspaceSnapshot.provenance.cursorProposal,
          ).targetEpochMs - 60_000,
        }), 'replay', readFailure);
      },
      propose: ({ identity: transactionIdentity }) => replay.proposeAdvance({
        advance, identity: transactionIdentity,
      }),
      reject: (proposal) => replay.reject(proposal),
    }),
    sessionId,
    workspaceStatePort: Object.freeze({
      begin: workspaceState.begin,
      prepare(input) {
        return failingHandle(workspaceState.prepare(input), 'workspace-state', readFailure);
      },
      reject: workspaceState.reject,
    }),
  });

  async function execute(label) {
    const semantic = readWorkspaceStateSnapshot(workspaceState.snapshot());
    const terminal = await runtime.execute({
      input: Object.freeze({ label }),
      intent: createWorkspaceTransactionIntent({
        identity: identity(label), operation: 'manual-next',
      }),
      semanticCandidate: createWorkspaceSemanticCandidate({
        paneWorkspace: semantic.paneWorkspace,
        publication: Object.freeze({ layout: 'one-pane' }),
        replayStep,
        sessionHours: semantic.sessionHours,
      }),
    });
    return describeWorkspaceTransactionEnvelope(terminal);
  }

  return Object.freeze({
    adapter,
    chart,
    execute,
    publication,
    replay,
    runtime,
    setFailure(value) { failure = value; },
    workspaceState,
  });
}

assert.deepEqual(cases, ['chart', 'replay', 'workspace-state', 'publication', 'persistence']);
for (const failure of cases) {
  const target = fixture();
  assert.equal((await target.execute(`accepted-before-${failure}`)).status, 'committed');
  const prior = Object.freeze({
    adapter: target.adapter.snapshot(),
    chart: target.chart.snapshot().acceptedSnapshot,
    publication: target.publication.snapshot(),
    replay: target.replay.snapshot(),
    runtime: target.runtime.snapshot().acceptedSnapshot,
    workspaceState: target.workspaceState.snapshot(),
  });
  const traceOffsets = Object.freeze({
    chart: target.adapter.trace().length,
    publication: target.publication.trace().length,
  });
  target.setFailure(failure);
  assert.equal((await target.execute(`fail-${failure}`)).status, 'failed');
  const chartTrace = target.adapter.trace().slice(traceOffsets.chart);
  assert.equal(chartTrace[0]?.type, 'chart-candidate-visible',
    `${failure}: the failed complete candidate must cross the visible Chart boundary dynamically`);
  assert.notEqual(chartTrace[0]?.visible, prior.adapter.visible,
    `${failure}: failure injection must exercise a new candidate, not the accepted snapshot`);
  assert.equal(chartTrace.at(-1)?.type, 'chart-accepted-restored',
    `${failure}: the visible Chart must roll back after the injected failure`);
  if (failure === 'publication' || failure === 'persistence') {
    const publicationTrace = target.publication.trace().slice(traceOffsets.publication);
    assert.equal(publicationTrace[0]?.type, 'publication-candidate-visible',
      `${failure}: publication failure must occur after candidate visibility`);
    assert.equal(publicationTrace.at(-1)?.type, 'publication-and-persistence-restored',
      `${failure}: durable publication must restore the last accepted value`);
  }
  assert.deepEqual(target.adapter.snapshot(), prior.adapter, `${failure}: Chart adapter restored`);
  assert.equal(target.chart.snapshot().acceptedSnapshot, prior.chart, `${failure}: Chart state restored`);
  assert.deepEqual(target.replay.snapshot(), prior.replay, `${failure}: Replay restored`);
  assert.equal(target.workspaceState.snapshot(), prior.workspaceState, `${failure}: semantic state restored`);
  assert.equal(target.runtime.snapshot().acceptedSnapshot, prior.runtime, `${failure}: publication restored`);
  assert.deepEqual(target.publication.snapshot(), prior.publication, `${failure}: persistence restored`);
}

console.log(`v7 Workspace global atomic commit harness passed (${cases.length} participant failures)`);
