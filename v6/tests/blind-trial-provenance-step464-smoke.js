import assert from 'node:assert/strict';
import { createValidationTrial } from '../src/validation-domain/validation-artifacts.js';
import {
  createBlindTrialReplayProvenance,
  startValidationTrial,
} from '../src/validation-domain/blind-trial-provenance.js';

const pending = createValidationTrial({
  campaignId: 'campaign-1',
  createdAt: 100,
  id: 'trial-1',
});
const provenance = createBlindTrialReplayProvenance({
  cursorIndex: 4,
  cursorTime: '2026-07-15T13:34:00Z',
  revealedCount: 5,
  sessionId: 'replay-1',
});
const active = startValidationTrial(pending, provenance, { startedAt: 120 });

assert.equal(active.status, 'active');
assert.equal(active.replaySessionId, 'replay-1');
assert.equal(active.replayCursorTime, '2026-07-15T13:34:00.000Z');
assert.equal(active.replayVisibleThroughTime, active.replayCursorTime);
assert.equal(active.replayCursorIndex, 4);
assert.equal(active.replayRevealedCount, 5);
assert.equal(active.startedAt, 120);
assert.equal(Object.isFrozen(active), true);

assert.throws(() => createBlindTrialReplayProvenance({
  cursorIndex: 4,
  cursorTime: '2026-07-15T13:34:00Z',
  revealedCount: 6,
  sessionId: 'replay-1',
}), /revealedCount/);
assert.throws(() => createBlindTrialReplayProvenance({
  cursorIndex: 4,
  cursorTime: '2026-07-15T13:34:00Z',
  revealedCount: 5,
  sessionId: 'replay-1',
  visibleThroughTime: '2026-07-15T13:35:00Z',
}), /visible-through/);
assert.throws(() => startValidationTrial(active, provenance, { startedAt: 130 }), /must be pending/);

console.log('v6 blind trial provenance step464 smoke passed');
