import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { readViewportIntent } from '../src/viewport-runtime/public.js';
import {
  createWorkspaceTransactionIdentity,
  readWorkspaceTransactionIdentity,
} from '../src/workspace-transaction-contract/public.js';
import { readWorkspaceCheckpoint } from '../src/workspace-checkpoint-domain/public.js';
import {
  createWorkspaceStateRuntime,
  readWorkspaceStateSnapshot,
} from '../src/workspace-state-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const cursorEpochMs = 1_800_000;
const nextCursorEpochMs = 1_860_000;
const paneIds = Object.freeze([
  'pane-main', 'pane-secondary', 'pane-tertiary', 'pane-quaternary',
]);
const configuration = Object.freeze({
  historicalRange: Object.freeze({ startEpochMs: 1_000_000, endEpochMs: 3_000_000 }),
  instrumentIds: Object.freeze(['instrument.cme.nq']),
});
const initialTarget = Object.freeze({
  instrumentId: 'instrument.cme.nq',
  timeframeId: 'timeframe.fixed.1-minute',
});

function createRuntime({
  activationGeneration = createActivationGeneration(1),
  initialCheckpoint = null,
  initialCursor = cursorEpochMs,
  initialPaneCount = 4,
  sessionId = createSessionId('workspace-state-session'),
} = {}) {
  return createWorkspaceStateRuntime({
    activationGeneration,
    allowedInstrumentIds: configuration.instrumentIds,
    calendarRevision: 'calendar-r1',
    checkpointContext: configuration,
    initialCheckpoint,
    initialCursorEpochMs: initialCursor,
    initialPaneCount,
    initialRightMarginBars: 12,
    initialSessionHoursMode: initialCheckpoint === null
      ? 'eth' : readWorkspaceCheckpoint(initialCheckpoint).sessionHoursMode,
    initialTarget,
    paneIds,
    primaryInstrumentId: configuration.instrumentIds[0],
    sessionHoursModes: ['eth', 'rth'],
    sessionId,
  });
}

function identity(sessionId, activationGeneration, suffix) {
  return createWorkspaceTransactionIdentity({
    activationGeneration,
    sessionId,
    transactionId: createTransactionId(`workspace-state-test-${suffix}`),
  });
}

function accept(runtime, transactionIdentity, {
  cursor = cursorEpochMs,
  paneWorkspace = readWorkspaceStateSnapshot(runtime.snapshot()).paneWorkspace,
  sessionHours = readWorkspaceStateSnapshot(runtime.snapshot()).sessionHours,
} = {}) {
  runtime.begin(transactionIdentity);
  return readWorkspaceStateSnapshot(runtime.accept({
    cursorEpochMs: cursor,
    identity: transactionIdentity,
    paneWorkspace,
    sessionHours,
  }));
}

const sessionId = createSessionId('workspace-state-positive');
const activationGeneration = createActivationGeneration(7);
const runtime = createRuntime({ activationGeneration, sessionId });
const initial = readWorkspaceStateSnapshot(runtime.snapshot());
assert.equal(initial.revision, 0);
assert.equal(initial.schemaVersion, 1);
assert.equal(initial.sessionHours.mode, 'eth');
assert.equal(initial.sessionHours.revision, 0);
assert.deepEqual(runtime.read(initial.paneWorkspace).panes.map(({ paneId }) => paneId), paneIds);
assert.equal(readWorkspaceCheckpoint(initial.checkpoint).cursorEpochMs, cursorEpochMs);
assert.deepEqual(readWorkspaceTransactionIdentity(initial.identity), {
  activationGeneration,
  sessionId,
  transactionId: readWorkspaceTransactionIdentity(initial.identity).transactionId,
});

const focused = readWorkspaceStateSnapshot(runtime.focus('pane-quaternary'));
assert.equal(focused.revision, 1, 'focus must publish through the sole semantic state owner');
assert.equal(runtime.read(focused.paneWorkspace).activePaneId, 'pane-quaternary');

const timeframeIdentity = identity(sessionId, activationGeneration, 'timeframe');
const timeframeState = accept(runtime, timeframeIdentity, {
  paneWorkspace: runtime.desiredTimeframe('timeframe.fixed.4-minute'),
});
assert.equal(timeframeState.revision, 2);
assert.equal(
  runtime.read(timeframeState.paneWorkspace).panes[3].timeframeId,
  'timeframe.fixed.4-minute',
);

const reducedWorkspace = runtime.desiredPaneCount(3, nextCursorEpochMs);
assert.deepEqual(runtime.read(reducedWorkspace).panes.map(({ paneId }) => paneId), paneIds.slice(0, 3));
assert.equal(runtime.read(reducedWorkspace).activePaneId, 'pane-main',
  'dropping the active P4 must preserve stable Pane priority by falling back to P1');
const replaceIdentity = identity(sessionId, activationGeneration, 'replace');
const replaced = accept(runtime, replaceIdentity, {
  cursor: nextCursorEpochMs,
  paneWorkspace: reducedWorkspace,
  sessionHours: runtime.proposeSessionHours('rth'),
});
assert.equal(replaced.revision, 3);
assert.equal(replaced.identity, replaceIdentity);
assert.deepEqual(replaced.sessionHours, {
  calendarRevision: 'calendar-r1',
  mode: 'rth',
  revision: 1,
});
assert.deepEqual(readWorkspaceCheckpoint(replaced.checkpoint), {
  activePaneId: 'pane-main',
  cursorEpochMs: nextCursorEpochMs,
  panes: readWorkspaceCheckpoint(replaced.checkpoint).panes,
  sessionHoursMode: 'rth',
});

const viewportRevision = replaced.revision;
runtime.viewportPort('pane-secondary').captureManual({
  latestLogicalIndex: 120,
  range: { from: 30, to: 110 },
});
const manual = readWorkspaceStateSnapshot(runtime.snapshot());
assert.equal(manual.revision, viewportRevision + 1);
assert.equal(readWorkspaceCheckpoint(manual.checkpoint).panes[1].viewport.origin, 'manual');
assert.equal(runtime.checkpoint(), manual.checkpoint,
  'persistence must consume the checkpoint already owned by the accepted snapshot');

const restoredActivation = createActivationGeneration(8);
const restored = createRuntime({
  activationGeneration: restoredActivation,
  initialCheckpoint: manual.checkpoint,
  initialCursor: nextCursorEpochMs,
  initialPaneCount: 3,
  sessionId,
});
const restoredSnapshot = readWorkspaceStateSnapshot(restored.snapshot());
const restoredViewport = readViewportIntent(
  restored.read(restoredSnapshot.paneWorkspace).panes[1].viewportIntent,
);
assert.equal(restoredViewport.scope.activationGeneration, restoredActivation,
  'restore must rebrand Viewport state to the new activation');
assert.equal(restoredSnapshot.sessionHours.mode, 'rth');
assert.equal(readWorkspaceCheckpoint(restoredSnapshot.checkpoint).panes[1].viewport.origin, 'manual');
restored.dispose();
runtime.dispose();

function runNegative(operation) {
  const ownSessionId = createSessionId(`negative-${operation}`);
  const ownActivation = createActivationGeneration(1);
  const candidate = createRuntime({ activationGeneration: ownActivation, sessionId: ownSessionId });
  const first = identity(ownSessionId, ownActivation, `${operation}-first`);
  const second = identity(ownSessionId, ownActivation, `${operation}-second`);
  const state = readWorkspaceStateSnapshot(candidate.snapshot());
  try {
    if (operation === 'accept-without-begin') {
      candidate.accept({
        cursorEpochMs,
        identity: first,
        paneWorkspace: state.paneWorkspace,
        sessionHours: state.sessionHours,
      });
    } else if (operation === 'foreign-session-begin') {
      candidate.begin(identity(createSessionId('foreign-session'), ownActivation, operation));
    } else if (operation === 'foreign-activation-begin') {
      candidate.begin(identity(ownSessionId, createActivationGeneration(2), operation));
    } else if (operation === 'superseded-transaction-accept') {
      candidate.begin(first);
      candidate.begin(second);
      candidate.accept({
        cursorEpochMs,
        identity: first,
        paneWorkspace: state.paneWorkspace,
        sessionHours: state.sessionHours,
      });
    } else if (operation === 'duplicate-transaction-begin') {
      candidate.begin(first);
      candidate.begin(first);
    } else if (operation === 'unsupported-session-hours') {
      candidate.proposeSessionHours('overnight');
    } else if (operation === 'session-hours-revision-skip') {
      candidate.begin(first);
      candidate.accept({
        cursorEpochMs,
        identity: first,
        paneWorkspace: state.paneWorkspace,
        sessionHours: { calendarRevision: 'calendar-r1', mode: 'rth', revision: 2 },
      });
    } else if (operation === 'foreign-pane-session') {
      const foreign = createRuntime({ sessionId: createSessionId('foreign-pane-session') });
      candidate.begin(first);
      try {
        candidate.accept({
          cursorEpochMs,
          identity: first,
          paneWorkspace: readWorkspaceStateSnapshot(foreign.snapshot()).paneWorkspace,
          sessionHours: state.sessionHours,
        });
      } finally {
        foreign.dispose();
      }
    } else if (operation === 'snapshot-lookalike') {
      readWorkspaceStateSnapshot({ ...state });
    } else if (operation === 'post-dispose-read') {
      candidate.dispose();
      candidate.snapshot();
    } else {
      assert.fail(`Unknown Workspace State negative operation ${operation}`);
    }
  } finally {
    candidate.dispose();
  }
}

const negativeFixture = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/workspace-state-runtime/negative/cases.json',
), 'utf8'));
assert.ok(negativeFixture.cases.length >= 10);
for (const testCase of negativeFixture.cases) {
  assert.throws(
    () => runNegative(testCase.operation),
    (error) => error?.code === testCase.expectedErrorCode,
    `${testCase.name} must fail with ${testCase.expectedErrorCode}`,
  );
}

console.log('v7 Workspace State Runtime harness passed (sole owner + identity/revision negatives)');
