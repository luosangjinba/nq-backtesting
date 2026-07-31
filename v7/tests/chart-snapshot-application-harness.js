import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import {
  createChartAdapterVisibleReceipt,
  createChartSnapshotApplication,
  requirePreparedChartApplication,
} from '../src/chart-snapshot-application/public.js';
import { createReplayAdvanceInput, createReplayCursorProposal } from '../src/replay-contract/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';

const sessionA = createSessionId('session-a');
const sessionB = createSessionId('session-b');
const generationOne = createActivationGeneration(1);
const generationTwo = createActivationGeneration(2);
const advance = createReplayAdvanceInput({ durationMs: 1_000, source: 'manual' });
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/chart-snapshot-application/negative/cases.json',
), 'utf8'));
assert.equal(negativeCases.length, 15);
assert.equal(new Set(negativeCases).size, 15);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, reject, resolve };
}

function identity(suffix, overrides = {}) {
  return createWorkspaceTransactionIdentity({
    activationGeneration: generationOne,
    sessionId: sessionA,
    transactionId: createTransactionId(`chart-${suffix}`),
    ...overrides,
  });
}

function snapshot(transactionIdentity, label = 'default') {
  const cursorProposal = createReplayCursorProposal({
    advance,
    baseRevision: 0,
    cursorEpochMs: 2_000,
    identity: transactionIdentity,
    range: Object.freeze({ endEpochMs: 10_000, startEpochMs: 1_000 }),
  });
  return Object.freeze({
    bars: Object.freeze([Object.freeze({
      close: 2, displayEpochMs: 1_000, high: 3, low: 1, open: 1.5, startEpochMs: 1_000, volume: 10,
    })]),
    paneId: `pane-${label}`,
    provenance: Object.freeze({ cursorProposal }),
    schemaVersion: 1,
  });
}

function fakeAdapter({ applyGate = null, failApply = false, forgedReceipt = null, stageGate = null } = {}) {
  let adapterRevision = 0;
  let visibleSnapshot = null;
  const trace = [];
  const stages = new WeakMap();
  return Object.freeze({
    adapter: Object.freeze({
      async applyVisible(context) {
        trace.push(`apply:${context.workspaceSnapshot.paneId}`);
        if (applyGate) await applyGate.promise;
        if (failApply === true || (typeof failApply === 'function' && failApply(context))) {
          throw new Error('adapter failed');
        }
        if (!context.isCurrent()) throw Object.assign(new Error('stale before mutation'), {
          code: 'CHART_ADAPTER_STALE',
        });
        const record = stages.get(context.staged);
        record.previousRevision = adapterRevision;
        record.previousSnapshot = visibleSnapshot;
        record.state = 'applied';
        adapterRevision += 1;
        visibleSnapshot = context.workspaceSnapshot;
        if (forgedReceipt) return forgedReceipt(context, adapterRevision);
        return createChartAdapterVisibleReceipt({
          adapterRevision,
          identity: context.identity,
          workspaceSnapshot: context.workspaceSnapshot,
        });
      },
      finalizeVisible(staged) { stages.get(staged).state = 'finalized'; },
      async rollbackVisible(staged) {
        trace.push('rollback');
        const record = stages.get(staged);
        if (!record || record.state === 'rolled-back') return;
        if (record.state === 'applied') {
          adapterRevision = record.previousRevision;
          visibleSnapshot = record.previousSnapshot;
        }
        record.state = 'rolled-back';
      },
      async stage(context) {
        trace.push(`stage:${context.workspaceSnapshot.paneId}`);
        if (stageGate) await stageGate.promise;
        const staged = Object.freeze({ paneId: context.workspaceSnapshot.paneId });
        stages.set(staged, { state: 'staged' });
        return staged;
      },
    }),
    read: () => Object.freeze({ adapterRevision, trace: Object.freeze([...trace]), visibleSnapshot }),
  });
}

function application(adapter) {
  const target = createChartSnapshotApplication({
    activationGeneration: generationOne,
    adapter,
    sessionId: sessionA,
  });
  return Object.freeze({
    ...target,
    async present(input) {
      const prepared = await target.prepare(input);
      let receipt = null;
      try {
        receipt = await prepared.apply();
        return prepared.finalize(receipt);
      } catch (error) {
        try { await prepared.rollback(receipt); } catch { /* Preserve original failure. */ }
        throw error;
      }
    },
  });
}

const normalAdapter = fakeAdapter();
const normal = application(normalAdapter.adapter);
const normalIdentity = identity('normal');
const normalSnapshot = snapshot(normalIdentity, 'normal');
await normal.present({
  identity: normalIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: normalSnapshot,
});
assert.equal(normalAdapter.read().visibleSnapshot, normalSnapshot);
assert.equal(normal.snapshot().acceptedSnapshot.workspaceSnapshot, normalSnapshot);
assert.deepEqual(normalAdapter.read().trace, ['stage:pane-normal', 'apply:pane-normal']);

const reversibleAdapter = fakeAdapter();
const reversible = application(reversibleAdapter.adapter);
const reversibleIdentity = identity('reversible');
const reversibleSnapshot = snapshot(reversibleIdentity, 'reversible');
const prepared = await reversible.prepare({
  identity: reversibleIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: reversibleSnapshot,
});
assert.equal(requirePreparedChartApplication(prepared), prepared);
assert.equal(prepared.snapshot().status, 'prepared');
assert.equal(prepared.snapshot().mutationPolicy, 'none');
assert.equal(reversible.snapshot().acceptedSnapshot, null);
assert.equal(reversibleAdapter.read().visibleSnapshot, null);
const reversibleCommit = await prepared.apply();
assert.equal(prepared.snapshot().status, 'applied');
assert.equal(prepared.snapshot().mutationPolicy, 'reversible-only');
assert.equal(reversible.snapshot().acceptedSnapshot, null,
  'reversible visible apply must not publish accepted Chart state');
assert.equal(reversibleAdapter.read().visibleSnapshot, reversibleSnapshot);
await assert.rejects(prepared.dispose(), (error) => error?.code === 'PREPARED_COMMIT_ROLLBACK_REQUIRED');
await prepared.rollback(reversibleCommit);
assert.equal(prepared.snapshot().status, 'rolled-back');
assert.equal(reversibleAdapter.read().visibleSnapshot, null);
assert.equal(reversible.snapshot().revision, 0);
assert.throws(
  () => requirePreparedChartApplication(Object.freeze({ apply() {} })),
  (error) => error?.code === 'PREPARED_CHART_APPLICATION_REQUIRED',
);

const finalizeIdentity = identity('reversible-finalize');
const finalizeSnapshot = snapshot(finalizeIdentity, 'reversible-finalize');
const finalizing = await reversible.prepare({
  identity: finalizeIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: finalizeSnapshot,
});
const finalizeCommit = await finalizing.apply();
finalizing.finalize(finalizeCommit);
assert.equal(finalizing.snapshot().status, 'finalized');
assert.equal(reversible.snapshot().acceptedSnapshot.workspaceSnapshot, finalizeSnapshot);
assert.equal(reversible.snapshot().revision, 1);

const abortAfterApplyAdapter = fakeAdapter();
const abortAfterApply = application(abortAfterApplyAdapter.adapter);
const abortAfterApplyIdentity = identity('abort-after-apply');
const abortAfterApplySnapshot = snapshot(abortAfterApplyIdentity, 'abort-after-apply');
const afterApplyController = new AbortController();
const abortablePrepared = await abortAfterApply.prepare({
  identity: abortAfterApplyIdentity,
  signal: afterApplyController.signal,
  workspaceSnapshot: abortAfterApplySnapshot,
});
const abortableCommit = await abortablePrepared.apply();
afterApplyController.abort('later-participant-failed');
assert.throws(
  () => abortablePrepared.finalize(abortableCommit),
  (error) => error?.code === 'CHART_APPLICATION_STALE',
);
await abortablePrepared.rollback(abortableCommit);
assert.equal(abortAfterApplyAdapter.read().visibleSnapshot, null);
assert.equal(abortAfterApply.snapshot().revision, 0);

let rejectAdapterApply = false;
const failedAdapter = fakeAdapter({ failApply: () => rejectAdapterApply });
const failed = application(failedAdapter.adapter);
const preservedIdentity = identity('preserved');
const preservedSnapshot = snapshot(preservedIdentity, 'preserved');
await failed.present({
  identity: preservedIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: preservedSnapshot,
});
const previous = failed.snapshot().acceptedSnapshot;
rejectAdapterApply = true;

const initialFailureIdentity = identity('adapter-failure');
await assert.rejects(failed.present({
  identity: initialFailureIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: snapshot(initialFailureIdentity, 'adapter-failure'),
}), /adapter failed/);
assert.equal(failed.snapshot().acceptedSnapshot, previous);
assert.equal(failedAdapter.read().visibleSnapshot, preservedSnapshot);

const identityMismatch = application(fakeAdapter().adapter);
const mismatchIdentity = identity('projection-identity');
await assert.rejects(identityMismatch.present({
  identity: mismatchIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: snapshot(identity('projection-foreign'), 'bad-identity'),
}), (error) => error?.code === 'CHART_SNAPSHOT_IDENTITY');
assert.equal(identityMismatch.snapshot().acceptedSnapshot, null);

const stageGate = deferred();
const reorderedAdapter = fakeAdapter({ stageGate });
const reordered = application(reorderedAdapter.adapter);
const slowIdentity = identity('slow');
const slowPromise = reordered.present({
  identity: slowIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: snapshot(slowIdentity, 'slow'),
});
await Promise.resolve();
const fastAdapter = reorderedAdapter;
stageGate.resolve();
const fastIdentity = identity('fast');
const fastPromise = reordered.present({
  identity: fastIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: snapshot(fastIdentity, 'fast'),
});
await assert.rejects(slowPromise, (error) => error?.code === 'CHART_APPLICATION_STALE');
await fastPromise;
assert.equal(fastAdapter.read().visibleSnapshot.paneId, 'pane-fast');

const applyGate = deferred();
const applyRaceAdapter = fakeAdapter({ applyGate });
const applyRace = application(applyRaceAdapter.adapter);
const oldIdentity = identity('old-apply');
const oldPromise = applyRace.present({
  identity: oldIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: snapshot(oldIdentity, 'old-apply'),
});
await Promise.resolve();
const newIdentity = identity('new-apply');
const newPromise = applyRace.present({
  identity: newIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: snapshot(newIdentity, 'new-apply'),
});
applyGate.resolve();
await assert.rejects(oldPromise, (error) => error?.code === 'CHART_APPLICATION_STALE');
await newPromise;
assert.equal(applyRaceAdapter.read().visibleSnapshot.paneId, 'pane-new-apply');

const abortGate = deferred();
const abortAdapter = fakeAdapter({ stageGate: abortGate });
const aborted = application(abortAdapter.adapter);
const abortedIdentity = identity('coordinator-abort');
const abortController = new AbortController();
const abortedPromise = aborted.present({
  identity: abortedIdentity,
  signal: abortController.signal,
  workspaceSnapshot: snapshot(abortedIdentity, 'coordinator-abort'),
});
await Promise.resolve();
abortController.abort('superseded-by-coordinator');
abortGate.resolve();
await assert.rejects(abortedPromise, (error) => error?.code === 'CHART_APPLICATION_STALE');
assert.equal(abortAdapter.read().visibleSnapshot, null);

const duplicateAdapter = fakeAdapter();
const duplicate = application(duplicateAdapter.adapter);
const duplicateIdentity = identity('duplicate');
await duplicate.present({
  identity: duplicateIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: snapshot(duplicateIdentity, 'duplicate'),
});
await assert.rejects(duplicate.present({
  identity: duplicateIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: snapshot(duplicateIdentity, 'duplicate'),
}), (error) => error?.code === 'CHART_APPLICATION_DUPLICATE');

for (const [code, mismatchedIdentity] of [
  ['CHART_APPLICATION_SESSION_MISMATCH', identity('session', { sessionId: sessionB })],
  ['CHART_APPLICATION_ACTIVATION_MISMATCH', identity('activation', {
    activationGeneration: generationTwo,
  })],
]) {
  const target = application(fakeAdapter().adapter);
  await assert.rejects(target.present({
    identity: mismatchedIdentity,
    signal: new AbortController().signal,
    workspaceSnapshot: snapshot(mismatchedIdentity),
  }), (error) => error?.code === code);
}

assert.throws(() => application(Object.freeze({})), (error) => error?.code === 'CHART_ADAPTER_PORT_INVALID');

const mutableTarget = application(fakeAdapter().adapter);
const mutableIdentity = identity('mutable');
await assert.rejects(mutableTarget.present({
  identity: mutableIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: { ...snapshot(mutableIdentity) },
}), (error) => error?.code === 'CHART_SNAPSHOT_INVALID');

const missingDisplayIdentity = identity('missing-display');
const canonicalSnapshot = snapshot(missingDisplayIdentity);
const missingDisplayBar = { ...canonicalSnapshot.bars[0] };
delete missingDisplayBar.displayEpochMs;
await assert.rejects(application(fakeAdapter().adapter).present({
  identity: missingDisplayIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: Object.freeze({
    ...canonicalSnapshot,
    bars: Object.freeze([Object.freeze(missingDisplayBar)]),
  }),
}), (error) => error?.code === 'CHART_SNAPSHOT_BAR_DISPLAY_TIME');

for (const [index, forgedReceipt] of [
  (context, revision) => createChartAdapterVisibleReceipt({
    adapterRevision: revision,
    identity: identity('receipt-foreign'),
    workspaceSnapshot: context.workspaceSnapshot,
  }),
  (context, revision) => createChartAdapterVisibleReceipt({
    adapterRevision: revision,
    identity: context.identity,
    workspaceSnapshot: snapshot(context.identity, 'receipt-foreign'),
  }),
  () => Object.freeze({}),
].entries()) {
  const target = application(fakeAdapter({ forgedReceipt }).adapter);
  const targetIdentity = identity(`forged-${index}`);
  await assert.rejects(target.present({
    identity: targetIdentity,
    signal: new AbortController().signal,
    workspaceSnapshot: snapshot(targetIdentity, 'forged'),
  }));
  assert.equal(target.snapshot().acceptedSnapshot, null);
}

const disposeGate = deferred();
const disposingAdapter = fakeAdapter({ stageGate: disposeGate });
const disposing = application(disposingAdapter.adapter);
const disposeIdentity = identity('dispose');
const disposePromise = disposing.present({
  identity: disposeIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: snapshot(disposeIdentity, 'dispose'),
});
await Promise.resolve();
disposing.dispose();
disposeGate.resolve();
await assert.rejects(disposePromise, (error) => error?.code === 'CHART_APPLICATION_STALE');
assert.equal(disposingAdapter.read().visibleSnapshot, null);

console.log(`v7 Chart Snapshot Application harness passed (${negativeCases.length} negative/race controls)`);
