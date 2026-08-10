import { requireSessionId } from '../session-identity/public.js';
import { failContextProjection } from './context-projection-error.js';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CAPABILITY = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const MAX_PANES = 8;
const MAX_BUCKETS = 20_000;

class AnnotationProjectionFrameValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function epoch(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failContextProjection('PROJECTION_FRAME_EPOCH_INVALID', `${label} is invalid.`);
  }
  return value;
}

function bucket(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'endEpochMs,startEpochMs') {
    failContextProjection('PROJECTION_FRAME_BUCKET_INVALID', 'Accepted bucket fields are invalid.');
  }
  const startEpochMs = epoch(value.startEpochMs, 'Bucket start');
  const endEpochMs = epoch(value.endEpochMs, 'Bucket end');
  if (startEpochMs >= endEpochMs) {
    failContextProjection('PROJECTION_FRAME_BUCKET_INVALID', 'Accepted bucket range is invalid.');
  }
  return Object.freeze({ endEpochMs, startEpochMs });
}

function pane(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'acceptedBuckets,instrumentId,paneId,timeframeId'
    || typeof value.paneId !== 'string' || !ID.test(value.paneId)
    || typeof value.instrumentId !== 'string' || !CAPABILITY.test(value.instrumentId)
    || typeof value.timeframeId !== 'string' || !CAPABILITY.test(value.timeframeId)
    || !Array.isArray(value.acceptedBuckets) || value.acceptedBuckets.length > MAX_BUCKETS) {
    failContextProjection('PROJECTION_FRAME_PANE_INVALID', 'Projection Pane is invalid.');
  }
  const acceptedBuckets = Object.freeze(value.acceptedBuckets.map(bucket)
    .sort((left, right) => left.startEpochMs - right.startEpochMs));
  for (let index = 1; index < acceptedBuckets.length; index += 1) {
    if (acceptedBuckets[index - 1].endEpochMs > acceptedBuckets[index].startEpochMs) {
      failContextProjection('PROJECTION_FRAME_BUCKET_OVERLAP', 'Accepted buckets overlap.');
    }
  }
  return Object.freeze({
    acceptedBuckets,
    instrumentId: value.instrumentId,
    paneId: value.paneId,
    timeframeId: value.timeframeId,
  });
}

/** Create one exact immutable Session/Pane/Replay projection frame. */
export function createAnnotationProjectionFrame(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',')
      !== 'annotationRevision,panes,reconciliationRevision,replayCutoffEpochMs,sessionId'
    || !Number.isSafeInteger(value.annotationRevision) || value.annotationRevision < 0
    || !Number.isSafeInteger(value.reconciliationRevision) || value.reconciliationRevision < 1
    || !Array.isArray(value.panes) || value.panes.length === 0 || value.panes.length > MAX_PANES) {
    failContextProjection('PROJECTION_FRAME_INVALID', 'Projection frame is invalid.');
  }
  const panes = Object.freeze(value.panes.map(pane)
    .sort((left, right) => left.paneId.localeCompare(right.paneId)));
  if (new Set(panes.map(({ paneId }) => paneId)).size !== panes.length) {
    failContextProjection('PROJECTION_FRAME_PANE_DUPLICATE', 'Projection Pane ids must be unique.');
  }
  return new AnnotationProjectionFrameValue(Object.freeze({
    annotationRevision: value.annotationRevision,
    panes,
    reconciliationRevision: value.reconciliationRevision,
    replayCutoffEpochMs: epoch(value.replayCutoffEpochMs, 'Replay cutoff'),
    sessionId: requireSessionId(value.sessionId),
  }));
}

export function readAnnotationProjectionFrame(candidate) {
  if (!(candidate instanceof AnnotationProjectionFrameValue)) {
    failContextProjection('PROJECTION_FRAME_REQUIRED', 'A branded projection frame is required.');
  }
  return candidate.read();
}
