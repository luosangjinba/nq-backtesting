import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import * as replay from '../src/replay-contract/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/replay-contract/negative/cases.json'), 'utf8',
));
const range = replay.createReplayRange({ startEpochMs: 1_000, endEpochMs: 10_000 });
const identity = createWorkspaceTransactionIdentity({
  sessionId: createSessionId('session-a'),
  activationGeneration: createActivationGeneration(1),
  transactionId: createTransactionId('transaction-a'),
});

const manual = replay.createReplayAdvanceInput({ source: 'manual', durationMs: 3_000 });
const auto = replay.createReplayAdvanceInput({ source: 'auto', durationMs: 3_000 });
for (const advance of [manual, auto]) {
  const value = replay.readReplayCursorProposal(replay.createReplayCursorProposal({
    identity, range, baseRevision: 4, cursorEpochMs: 2_000, advance,
  }));
  assert.equal(value.targetEpochMs, 5_000);
  assert.equal(value.kind, 'advance');
  assert.deepEqual(value.revealWindow, { startEpochMs: 2_000, endEpochMs: 5_000 });
  assert.equal(value.complete, false);
}

const retained = replay.readReplayCursorProposal(replay.createReplayCursorRetentionProposal({
  identity, range, baseRevision: 4, cursorEpochMs: 2_000,
}));
assert.equal(retained.kind, 'retain');
assert.equal(retained.advance, null);
assert.equal(retained.targetEpochMs, 2_000);
assert.deepEqual(retained.revealWindow, { startEpochMs: 2_000, endEpochMs: 2_000 });

const clamped = replay.readReplayCursorProposal(replay.createReplayCursorProposal({
  identity, range, baseRevision: 4, cursorEpochMs: 9_000, advance: manual,
}));
assert.equal(clamped.targetEpochMs, 10_000, 'proposal must never exceed Session end');
assert.equal(clamped.complete, true);
assert.equal(replay.isEpochVisibleAtReplayCursor(4_999, 5_000), true);
assert.equal(replay.isEpochVisibleAtReplayCursor(5_000, 5_000), false);

function errorCode(action) {
  try {
    action();
    return null;
  } catch (error) {
    return error.code;
  }
}

const negativeActions = {
  'zero-duration': () => replay.createReplayAdvanceInput({ source: 'manual', durationMs: 0 }),
  'unknown-source': () => replay.createReplayAdvanceInput({ source: 'timer', durationMs: 1 }),
  'reversed-range': () => replay.createReplayRange({ startEpochMs: 2, endEpochMs: 1 }),
  'cursor-before-range': () => replay.createReplayCursorProposal({
    identity, range, baseRevision: 0, cursorEpochMs: 999, advance: manual,
  }),
  'raw-identity': () => replay.createReplayCursorProposal({
    identity: {}, range, baseRevision: 0, cursorEpochMs: 1_000, advance: manual,
  }),
  'negative-revision': () => replay.createReplayCursorProposal({
    identity, range, baseRevision: -1, cursorEpochMs: 1_000, advance: manual,
  }),
  'forged-proposal': () => replay.readReplayCursorProposal({ value() {} }),
  'overflow-target': () => replay.createReplayCursorProposal({
    identity,
    range: { startEpochMs: 0, endEpochMs: Number.MAX_SAFE_INTEGER },
    baseRevision: 0,
    cursorEpochMs: Number.MAX_SAFE_INTEGER - 1,
    advance: replay.createReplayAdvanceInput({ source: 'auto', durationMs: 2 }),
  }),
};

for (const fixture of negativeCases) {
  assert.equal(errorCode(negativeActions[fixture.case]), fixture.expectedCode, fixture.case);
}

console.log(`v7 Replay Contract harness passed (${negativeCases.length} negative controls)`);
