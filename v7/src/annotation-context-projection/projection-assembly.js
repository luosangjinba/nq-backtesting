import { failContextProjection } from './context-projection-error.js';
import { readAnnotationProjectionFrame } from './projection-frame.js';
import { readAnnotationProjectionSubject } from './projection-subject.js';

export function requireContextProjectionGeometryContract(value) {
  if (!value || typeof value.projectDrawingGeometryAnchors !== 'function'
    || typeof value.readDrawingGeometry !== 'function') {
    failContextProjection(
      'CONTEXT_PROJECTION_GEOMETRY_PORT_INVALID',
      'Context projection requires the public Geometry projection port.',
    );
  }
  return value;
}

export function requireContextProjectionFactory(value) {
  if (typeof value !== 'function') {
    failContextProjection(
      'CONTEXT_PROJECTION_FACTORY_INVALID',
      'Context projection requires a Chart projection factory.',
    );
  }
  return value;
}

function paneProjectionId(projectionId, paneId) {
  const value = `${projectionId}:${paneId}`;
  if (value.length > 128) {
    failContextProjection('CONTEXT_PROJECTION_ID_TOO_LONG', 'Pane projection id is too long.');
  }
  return value;
}

function projectSubject({ createProjection, frame, geometry, pane, policyRegistry, subject }) {
  if (subject.observedAtReplayCutoffEpochMs > frame.replayCutoffEpochMs) return null;
  const mappings = [];
  const projected = geometry.projectDrawingGeometryAnchors(subject.geometry, (anchor) => {
    const result = policyRegistry.project(subject.policy, Object.freeze({
      anchor,
      pane,
      replayCutoffEpochMs: frame.replayCutoffEpochMs,
      sourceBars: subject.sourceBars,
    }));
    if (result === null) return null;
    mappings.push(result.mapping);
    return result.anchor;
  });
  if (projected === null) return null;
  const input = {
    entityId: subject.entityId,
    geometry: geometry.readDrawingGeometry(projected),
    projectionId: paneProjectionId(subject.projectionId, pane.paneId),
    revision: frame.reconciliationRevision,
  };
  if (subject.presentation !== null) input.presentation = subject.presentation;
  return Object.freeze({
    projection: createProjection(input),
    provenance: Object.freeze({
      canonicalEntityRevision: subject.revision,
      mappings: Object.freeze(mappings),
      observedAtReplayCutoffEpochMs: subject.observedAtReplayCutoffEpochMs,
      sourceProjectionId: subject.projectionId,
      targetPaneId: pane.paneId,
      targetTimeframeId: pane.timeframeId,
    }),
  });
}

/** Derive deterministic per-Pane projection sets without touching a Chart. */
export function deriveAnnotationPaneProjectionSets({
  createProjection,
  frame,
  geometryContract,
  policyRegistry,
  subjects,
} = {}) {
  const value = readAnnotationProjectionFrame(frame);
  const geometry = requireContextProjectionGeometryContract(geometryContract);
  const factory = requireContextProjectionFactory(createProjection);
  if (!policyRegistry || typeof policyRegistry.project !== 'function'
    || !Array.isArray(subjects)) {
    failContextProjection('CONTEXT_PROJECTION_INPUT_INVALID', 'Projection assembly input is invalid.');
  }
  const candidates = subjects.map(readAnnotationProjectionSubject)
    .sort((left, right) => left.projectionId.localeCompare(right.projectionId));
  if (new Set(candidates.map(({ projectionId }) => projectionId)).size !== candidates.length) {
    failContextProjection('CONTEXT_PROJECTION_SUBJECT_DUPLICATE', 'Subject projection ids must be unique.');
  }
  return Object.freeze(value.panes.map((pane) => {
    const entries = candidates.map((subject) => projectSubject({
      createProjection: factory,
      frame: value,
      geometry,
      pane,
      policyRegistry,
      subject,
    })).filter(Boolean);
    return Object.freeze({
      annotationRevision: value.annotationRevision,
      paneId: pane.paneId,
      projections: Object.freeze(entries.map(({ projection }) => projection)),
      provenance: Object.freeze(entries.map(({ provenance }) => provenance)),
      reconciliationRevision: value.reconciliationRevision,
      replayCutoffEpochMs: value.replayCutoffEpochMs,
      sessionId: value.sessionId,
      timeframeId: pane.timeframeId,
    });
  }));
}
