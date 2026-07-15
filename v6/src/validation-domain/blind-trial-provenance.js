import { cloneValidationArtifact } from './validation-artifacts.js';

function requiredText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${fieldName} must be a non-empty string.`);
  return normalized;
}

function nonNegativeInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }
  return normalized;
}

function positiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function canonicalIso(value, fieldName) {
  const normalized = requiredText(value, fieldName);
  const milliseconds = Date.parse(normalized);
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`${fieldName} must be a valid date/time.`);
  }
  return new Date(milliseconds).toISOString();
}

function timestamp(value, fieldName, minimum = 0) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < minimum) {
    throw new Error(`${fieldName} must be a finite timestamp not before ${minimum}.`);
  }
  return normalized;
}

export function createBlindTrialReplayProvenance({
  cursorIndex,
  cursorTime,
  revealedCount,
  sessionId,
  visibleThroughTime = cursorTime,
} = {}) {
  const normalizedCursorTime = canonicalIso(cursorTime, 'Blind trial replay cursorTime');
  const normalizedVisibleThrough = canonicalIso(
    visibleThroughTime,
    'Blind trial replay visibleThroughTime',
  );
  if (normalizedCursorTime !== normalizedVisibleThrough) {
    throw new Error('Blind trial visible-through boundary must equal the captured replay cursor.');
  }
  const normalizedCursorIndex = nonNegativeInteger(
    cursorIndex,
    'Blind trial replay cursorIndex',
  );
  const normalizedRevealedCount = positiveInteger(
    revealedCount,
    'Blind trial replay revealedCount',
  );
  if (normalizedRevealedCount !== normalizedCursorIndex + 1) {
    throw new Error('Blind trial replay revealedCount must equal cursorIndex + 1.');
  }
  return Object.freeze({
    cursorIndex: normalizedCursorIndex,
    cursorTime: normalizedCursorTime,
    revealedCount: normalizedRevealedCount,
    sessionId: requiredText(sessionId, 'Blind trial replay sessionId'),
    visibleThroughTime: normalizedVisibleThrough,
  });
}

export function startValidationTrial(record, provenance, { startedAt } = {}) {
  if (record?.artifactType !== 'trial') {
    throw new Error('Expected trial artifact.');
  }
  if (record.status !== 'pending') {
    throw new Error(`Blind trial must be pending before start; received ${record.status}.`);
  }
  if (record.replaySessionId && record.replaySessionId !== provenance?.sessionId) {
    throw new Error('Blind trial replay session does not match its reserved session.');
  }
  const snapshot = createBlindTrialReplayProvenance(provenance);
  const normalizedStartedAt = timestamp(
    startedAt,
    'Blind trial startedAt',
    Number(record.updatedAt),
  );
  return cloneValidationArtifact({
    ...record,
    replayCursorIndex: snapshot.cursorIndex,
    replayCursorTime: snapshot.cursorTime,
    replayRevealedCount: snapshot.revealedCount,
    replaySessionId: snapshot.sessionId,
    replayVisibleThroughTime: snapshot.visibleThroughTime,
    startedAt: normalizedStartedAt,
    status: 'active',
    updatedAt: normalizedStartedAt,
  });
}
