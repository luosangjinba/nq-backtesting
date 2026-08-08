import {
  annotationProjectionSignature,
  readAnnotationProjection,
} from './annotation-projection.js';
import { failProjection } from './projection-error.js';

function candidateRecord(projection) {
  return Object.freeze({
    projection,
    signature: annotationProjectionSignature(projection),
    snapshot: readAnnotationProjection(projection),
  });
}

/** Build a deterministic attach/update/retain/detach plan without creating primitives. */
export function planAnnotationProjection(currentRecords, projections) {
  if (!Array.isArray(projections)) {
    failProjection('ANNOTATION_PROJECTION_LIST_INVALID', 'Projections must be one array.');
  }
  const candidates = [...projections].map(candidateRecord).sort((left, right) => (
    left.snapshot.projectionId.localeCompare(right.snapshot.projectionId)
  ));
  const candidateIds = new Set();
  const operations = [];
  for (const candidate of candidates) {
    const { projectionId, revision } = candidate.snapshot;
    if (candidateIds.has(projectionId)) {
      failProjection('ANNOTATION_PROJECTION_ID_DUPLICATE', `Duplicate projection ${projectionId}.`);
    }
    candidateIds.add(projectionId);
    const current = currentRecords.get(projectionId);
    if (!current) operations.push(Object.freeze({ candidate, kind: 'attach' }));
    else if (current.projectionRevision > revision) {
      failProjection('ANNOTATION_PROJECTION_REVISION_STALE', `Projection ${projectionId} is stale.`);
    } else if (current.projectionRevision === revision) {
      if (current.signature !== candidate.signature) {
        failProjection(
          'ANNOTATION_PROJECTION_REVISION_COLLISION',
          `Projection ${projectionId} reused one revision with different content.`,
        );
      }
      operations.push(Object.freeze({ candidate, current, kind: 'retain' }));
    } else operations.push(Object.freeze({ candidate, current, kind: 'update' }));
  }
  for (const current of [...currentRecords.values()].sort((left, right) => (
    left.projectionId.localeCompare(right.projectionId)
  ))) {
    if (!candidateIds.has(current.projectionId)) {
      operations.push(Object.freeze({ current, kind: 'detach' }));
    }
  }
  return Object.freeze({ candidates: Object.freeze(candidates), operations: Object.freeze(operations) });
}
