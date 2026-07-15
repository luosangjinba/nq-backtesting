import { cloneValidationArtifact } from './validation-artifacts.js';

export const VALIDATION_CAMPAIGN_TRANSITIONS = Object.freeze({
  active: Object.freeze(['completed']),
  archived: Object.freeze([]),
  completed: Object.freeze(['archived']),
  draft: Object.freeze(['active']),
});

export const VALIDATION_TRIAL_TRANSITIONS = Object.freeze({
  active: Object.freeze(['completed', 'invalidated']),
  completed: Object.freeze([]),
  invalidated: Object.freeze([]),
  pending: Object.freeze(['active', 'invalidated']),
});

function transition({
  artifactType,
  invalidationReason = null,
  record,
  targetStatus,
  transitions,
  updatedAt,
} = {}) {
  if (record?.artifactType !== artifactType) {
    throw new Error(`Expected ${artifactType} artifact.`);
  }
  const allowed = transitions[record.status] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(`Invalid ${artifactType} transition: ${record.status} -> ${targetStatus}`);
  }
  const timestamp = Number(updatedAt);
  if (!Number.isFinite(timestamp) || timestamp < Number(record.updatedAt)) {
    throw new Error(`${artifactType} updatedAt must not precede the current revision.`);
  }
  const reason = targetStatus === 'invalidated'
    ? String(invalidationReason || '').trim()
    : null;
  if (targetStatus === 'invalidated' && !reason) {
    throw new Error('Invalidated validation trial requires an invalidation reason.');
  }
  return cloneValidationArtifact({
    ...record,
    invalidationReason: artifactType === 'trial' ? reason : undefined,
    status: targetStatus,
    updatedAt: timestamp,
  });
}

export function transitionValidationCampaign(record, targetStatus, { updatedAt } = {}) {
  return transition({
    artifactType: 'validationCampaign',
    record,
    targetStatus,
    transitions: VALIDATION_CAMPAIGN_TRANSITIONS,
    updatedAt,
  });
}

export function transitionValidationTrial(record, targetStatus, {
  invalidationReason = null,
  updatedAt,
} = {}) {
  return transition({
    artifactType: 'trial',
    invalidationReason,
    record,
    targetStatus,
    transitions: VALIDATION_TRIAL_TRANSITIONS,
    updatedAt,
  });
}
