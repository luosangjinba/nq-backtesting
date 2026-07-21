import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createReplayAdvanceInput } from '../src/replay-contract/public.js';
import { createReplayRuntime } from '../src/replay-runtime/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/replay-runtime/negative/cases.json'), 'utf8',
));
const sessionA = createSessionId('session-a');
const sessionB = createSessionId('session-b');
const generationOne = createActivationGeneration(1);
const generationTwo = createActivationGeneration(2);
const range = { startEpochMs: 1_000, endEpochMs: 10_000 };
const manual = createReplayAdvanceInput({ source: 'manual', durationMs: 2_000 });
const auto = createReplayAdvanceInput({ source: 'auto', durationMs: 2_000 });

function identity(sessionId, activationGeneration, suffix) {
  return createWorkspaceTransactionIdentity({
    sessionId,
    activationGeneration,
    transactionId: createTransactionId(`transaction-${suffix}`),
  });
}

function runtime() {
  return createReplayRuntime({
    sessionId: sessionA,
    activationGeneration: generationOne,
    range,
    initialCursorEpochMs: 2_000,
  });
}

const clock = runtime();
const proposal = clock.proposeAdvance({ identity: identity(sessionA, generationOne, 'one'), advance: manual });
assert.equal(clock.snapshot().cursorEpochMs, 2_000, 'proposal must not publish cursor progress');
assert.equal(clock.snapshot().revision, 0);
const accepted = clock.commitVisible(proposal);
assert.equal(accepted.cursorEpochMs, 4_000);
assert.equal(accepted.visibleThroughEpochMs, 4_000);
assert.equal(accepted.revision, 1);

const retained = clock.proposeRetention({ identity: identity(sessionA, generationOne, 'retain') });
const retainedSnapshot = clock.commitVisible(retained, { visibleThroughEpochMs: 3_000 });
assert.equal(retainedSnapshot.cursorEpochMs, 4_000, 'retention proposal cannot move the source cursor');
assert.equal(retainedSnapshot.visibleThroughEpochMs, 3_000);
assert.equal(retainedSnapshot.revision, 2);

assert.equal(clock.play().playback, 'playing');
const backward = clock.proposeTarget({
  identity: identity(sessionA, generationOne, 'backward'), targetEpochMs: 2_000,
});
assert.equal(clock.snapshot().cursorEpochMs, 4_000, 'target proposal is inert');
const rewound = clock.commitVisible(backward, { visibleThroughEpochMs: null });
assert.equal(rewound.cursorEpochMs, 2_000);
assert.equal(rewound.playback, 'playing', 'non-terminal commit does not invent a pause');
assert.equal(clock.pause().playback, 'paused');

const rejected = clock.proposeAdvance({ identity: identity(sessionA, generationOne, 'two'), advance: auto });
assert.equal(clock.reject(rejected), true);
assert.equal(clock.snapshot().cursorEpochMs, 2_000, 'rejection must have zero cursor side effects');
clock.dispose();

function errorCode(action) {
  try {
    action();
    return null;
  } catch (error) {
    return error.code;
  }
}

const negativeActions = {
  'session-mismatch': () => runtime().proposeAdvance({
    identity: identity(sessionB, generationOne, 'wrong-session'), advance: manual,
  }),
  'activation-mismatch': () => runtime().proposeAdvance({
    identity: identity(sessionA, generationTwo, 'wrong-generation'), advance: manual,
  }),
  'stale-proposal': () => {
    const target = runtime();
    const first = target.proposeAdvance({ identity: identity(sessionA, generationOne, 'first'), advance: manual });
    const stale = target.proposeAdvance({ identity: identity(sessionA, generationOne, 'stale'), advance: manual });
    target.commitVisible(first);
    return target.commitVisible(stale);
  },
  'foreign-proposal': () => {
    const first = runtime();
    const second = runtime();
    return second.commitVisible(first.proposeAdvance({
      identity: identity(sessionA, generationOne, 'foreign'), advance: manual,
    }));
  },
  'commit-rejected-proposal': () => {
    const target = runtime();
    const discarded = target.proposeAdvance({
      identity: identity(sessionA, generationOne, 'discarded'), advance: manual,
    });
    target.reject(discarded);
    return target.commitVisible(discarded);
  },
  'advance-after-complete': () => {
    const target = createReplayRuntime({
      sessionId: sessionA,
      activationGeneration: generationOne,
      range,
      initialCursorEpochMs: range.endEpochMs,
    });
    return target.proposeAdvance({ identity: identity(sessionA, generationOne, 'complete'), advance: manual });
  },
  'call-after-dispose': () => {
    const target = runtime();
    target.dispose();
    return target.snapshot();
  },
  'visibility-at-cursor': () => {
    const target = runtime();
    const retainedProposal = target.proposeRetention({
      identity: identity(sessionA, generationOne, 'visibility-at-cursor'),
    });
    return target.commitVisible(retainedProposal, { visibleThroughEpochMs: 2_000 });
  },
  'visibility-before-range': () => {
    const target = runtime();
    const retainedProposal = target.proposeRetention({
      identity: identity(sessionA, generationOne, 'visibility-before-range'),
    });
    return target.commitVisible(retainedProposal, { visibleThroughEpochMs: 999 });
  },
  'target-session-mismatch': () => runtime().proposeTarget({
    identity: identity(sessionB, generationOne, 'target-wrong-session'), targetEpochMs: 3_000,
  }),
  'play-after-complete': () => {
    const target = createReplayRuntime({
      sessionId: sessionA,
      activationGeneration: generationOne,
      range,
      initialCursorEpochMs: range.endEpochMs,
    });
    return target.play();
  },
};

for (const fixture of negativeCases) {
  assert.equal(errorCode(negativeActions[fixture.case]), fixture.expectedCode, fixture.case);
}

console.log(`v7 Replay Runtime harness passed (${negativeCases.length} negative controls)`);
