import { AnnotationSemanticPackageError } from '../annotation-semantic-registry/public.js';

const EVENT_FIELDS = Object.freeze([
  'editedAtEpochMs', 'editorId', 'lowerPrice', 'observedAtReplayCutoffEpochMs',
  'sourceArtifactRevision', 'upperPrice',
]);
const PARAMETER_FIELDS = Object.freeze([
  'baselineValue', 'effectiveSource', 'effectiveValue', 'overrideProvenance',
]);
const MAX_OVERRIDE_EVENTS = 64;

function reject(code, message) {
  throw new AnnotationSemanticPackageError(code, message);
}

function exact(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    reject(code, `${label} fields are invalid.`);
  }
}

function price(value, code, label) {
  if (!Number.isFinite(value)) reject(code, `${label} is invalid.`);
  return Object.is(value, -0) ? 0 : value;
}

function bounds(value, formation, code) {
  const lowerPrice = price(value.lowerPrice, code, 'FVG effective lower price');
  const upperPrice = price(value.upperPrice, code, 'FVG effective upper price');
  if (lowerPrice < formation.lowerPrice || upperPrice > formation.upperPrice
    || lowerPrice >= upperPrice) {
    reject(code, 'FVG effective bounds must form one inner zone inside the strict baseline.');
  }
  return Object.freeze({ lowerPrice, upperPrice });
}

function readEvents(provenance, artifact, formation) {
  if (provenance === null) return Object.freeze([]);
  exact(
    provenance,
    ['events'],
    'SEMANTIC_ARTIFACT_INVALID',
    'FVG override provenance',
  );
  if (!Array.isArray(provenance.events) || provenance.events.length < 1
    || provenance.events.length > MAX_OVERRIDE_EVENTS) {
    reject('SEMANTIC_ARTIFACT_INVALID', 'FVG override event history is invalid.');
  }
  let prior = null;
  const events = provenance.events.map((event) => {
    exact(event, EVENT_FIELDS, 'SEMANTIC_ARTIFACT_INVALID', 'FVG override event');
    if (typeof event.editorId !== 'string' || event.editorId.length < 1 || event.editorId.length > 64
      || !Number.isSafeInteger(event.editedAtEpochMs)
      || event.editedAtEpochMs < artifact.provenance.createdAtEpochMs
      || !Number.isSafeInteger(event.observedAtReplayCutoffEpochMs)
      || event.observedAtReplayCutoffEpochMs
        !== artifact.provenance.observedAtReplayCutoffEpochMs
      || !Number.isSafeInteger(event.sourceArtifactRevision)
      || event.sourceArtifactRevision < 1
      || event.sourceArtifactRevision >= artifact.revision) {
      reject('SEMANTIC_ARTIFACT_INVALID', 'FVG override event identity or chronology is invalid.');
    }
    const normalized = bounds(event, formation, 'SEMANTIC_ARTIFACT_INVALID');
    if (prior !== null && (event.sourceArtifactRevision <= prior.sourceArtifactRevision
      || event.editedAtEpochMs < prior.editedAtEpochMs
      || (normalized.lowerPrice === prior.lowerPrice
        && normalized.upperPrice === prior.upperPrice))) {
      reject('SEMANTIC_ARTIFACT_INVALID', 'FVG override event history is not append-only.');
    }
    prior = Object.freeze({ ...event, ...normalized });
    return prior;
  });
  return Object.freeze(events);
}

function parameter(value, expectedBaseline, expectedEffective, expectedSource, provenance, label) {
  exact(value, PARAMETER_FIELDS, 'SEMANTIC_ARTIFACT_INVALID', label);
  if (value.baselineValue !== expectedBaseline || value.effectiveValue !== expectedEffective
    || value.effectiveSource !== expectedSource
    || JSON.stringify(value.overrideProvenance) !== JSON.stringify(provenance)) {
    reject('SEMANTIC_ARTIFACT_INVALID', `${label} is inconsistent with FVG override history.`);
  }
}

function effectiveState(formation, events) {
  const latest = events.at(-1) ?? null;
  const lowerPrice = latest?.lowerPrice ?? formation.lowerPrice;
  const upperPrice = latest?.upperPrice ?? formation.upperPrice;
  const midpointPrice = lowerPrice + ((upperPrice - lowerPrice) / 2);
  const overridden = lowerPrice !== formation.lowerPrice || upperPrice !== formation.upperPrice;
  return Object.freeze({
    effectiveSource: overridden ? 'override' : 'derived',
    lowerPrice,
    midpointPrice,
    upperPrice,
  });
}

/** Validate immutable baselines plus append-only effective FVG override state. */
export function readFvgOverrideState(artifact, formation) {
  const values = artifact.attributes;
  const provenances = [
    values.lowerPrice?.overrideProvenance,
    values.midpointPrice?.overrideProvenance,
    values.upperPrice?.overrideProvenance,
  ];
  if (JSON.stringify(provenances[0]) !== JSON.stringify(provenances[1])
    || JSON.stringify(provenances[0]) !== JSON.stringify(provenances[2])) {
    reject('SEMANTIC_ARTIFACT_INVALID', 'FVG parameters must share one override history.');
  }
  const events = readEvents(provenances[0], artifact, formation);
  const state = effectiveState(formation, events);
  const provenance = events.length === 0 ? null : Object.freeze({ events });
  parameter(
    values.lowerPrice,
    formation.lowerPrice,
    state.lowerPrice,
    state.effectiveSource,
    provenance,
    'FVG lower price',
  );
  parameter(
    values.midpointPrice,
    formation.midpointPrice,
    state.midpointPrice,
    state.effectiveSource,
    provenance,
    'FVG midpoint price',
  );
  parameter(
    values.upperPrice,
    formation.upperPrice,
    state.upperPrice,
    state.effectiveSource,
    provenance,
    'FVG upper price',
  );
  return Object.freeze({ ...state, events, overrideProvenance: provenance });
}

function parameterValue(baselineValue, effectiveValue, effectiveSource, overrideProvenance) {
  return Object.freeze({ baselineValue, effectiveSource, effectiveValue, overrideProvenance });
}

/** Append one observation-cutoff-bound inner-zone edit or explicit baseline reset. */
export function reviseFvgOverride(artifact, formation, revision) {
  exact(
    revision.fields,
    ['lowerPrice', 'upperPrice'],
    'SEMANTIC_REVISION_REJECTED',
    'FVG override fields',
  );
  const current = readFvgOverrideState(artifact, formation);
  if (revision.replayCutoffEpochMs !== artifact.provenance.observedAtReplayCutoffEpochMs) {
    reject(
      'SEMANTIC_REVISION_REJECTED',
      'FVG overrides require the exact original observation Replay cutoff.',
    );
  }
  if (revision.editedAtEpochMs < artifact.provenance.createdAtEpochMs
    || current.events.length >= MAX_OVERRIDE_EVENTS
    || (current.events.length > 0
      && revision.editedAtEpochMs < current.events.at(-1).editedAtEpochMs)) {
    reject('SEMANTIC_REVISION_REJECTED', 'FVG override chronology or history bound is invalid.');
  }
  const next = bounds(revision.fields, formation, 'SEMANTIC_REVISION_REJECTED');
  if (next.lowerPrice === current.lowerPrice && next.upperPrice === current.upperPrice) {
    reject('SEMANTIC_REVISION_REJECTED', 'FVG override must change the current effective zone.');
  }
  const event = Object.freeze({
    editedAtEpochMs: revision.editedAtEpochMs,
    editorId: revision.editorId,
    lowerPrice: next.lowerPrice,
    observedAtReplayCutoffEpochMs: revision.replayCutoffEpochMs,
    sourceArtifactRevision: artifact.revision,
    upperPrice: next.upperPrice,
  });
  const events = Object.freeze([...current.events, event]);
  const overrideProvenance = Object.freeze({ events });
  const state = effectiveState(formation, events);
  return Object.freeze({
    direction: artifact.attributes.direction,
    formation: artifact.attributes.formation,
    lowerPrice: parameterValue(
      formation.lowerPrice,
      state.lowerPrice,
      state.effectiveSource,
      overrideProvenance,
    ),
    midpointPrice: parameterValue(
      formation.midpointPrice,
      state.midpointPrice,
      state.effectiveSource,
      overrideProvenance,
    ),
    upperPrice: parameterValue(
      formation.upperPrice,
      state.upperPrice,
      state.effectiveSource,
      overrideProvenance,
    ),
  });
}
