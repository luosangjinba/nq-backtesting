export const VALIDATION_ARTIFACT_SCHEMA_VERSION = 1;

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function requiredText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${fieldName} must be a non-empty string.`);
  return normalized;
}

function optionalText(value, fieldName) {
  if (value === null || value === undefined || value === '') return null;
  return requiredText(value, fieldName);
}

function positiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function timestamp(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${fieldName} must be a finite non-negative timestamp.`);
  }
  return normalized;
}

function normalizeRules(rules) {
  if (!Array.isArray(rules) || !rules.length) {
    throw new Error('Playbook version rules must be a non-empty array.');
  }
  const ids = new Set();
  return rules.map((rule, index) => {
    const id = requiredText(rule?.id, `Playbook rule ${index + 1} id`);
    if (ids.has(id)) throw new Error(`Duplicate playbook rule id: ${id}`);
    ids.add(id);
    return {
      id,
      statement: requiredText(rule?.statement, `Playbook rule ${id} statement`),
    };
  });
}

function artifact(record) {
  return deepFreeze(cloneJson(record));
}

export function cloneValidationArtifact(record) {
  return artifact(record);
}

export function createPlaybookVersion({
  createdAt,
  id,
  name,
  playbookId,
  rules,
  version,
} = {}) {
  return artifact({
    artifactType: 'playbookVersion',
    createdAt: timestamp(createdAt, 'Playbook version createdAt'),
    id: requiredText(id, 'Playbook version id'),
    name: requiredText(name, 'Playbook version name'),
    playbookId: requiredText(playbookId, 'Playbook id'),
    rules: normalizeRules(rules),
    schemaVersion: VALIDATION_ARTIFACT_SCHEMA_VERSION,
    version: positiveInteger(version, 'Playbook version'),
  });
}

export function createValidationCampaign({
  createdAt,
  hypothesis,
  id,
  name,
  playbookVersionId,
  status = 'draft',
  updatedAt = createdAt,
} = {}) {
  if (status !== 'draft') {
    throw new Error('A validation campaign must be created in draft status.');
  }
  return artifact({
    artifactType: 'validationCampaign',
    createdAt: timestamp(createdAt, 'Validation campaign createdAt'),
    hypothesis: requiredText(hypothesis, 'Validation campaign hypothesis'),
    id: requiredText(id, 'Validation campaign id'),
    name: requiredText(name, 'Validation campaign name'),
    playbookVersionId: requiredText(playbookVersionId, 'Validation campaign playbookVersionId'),
    schemaVersion: VALIDATION_ARTIFACT_SCHEMA_VERSION,
    status,
    updatedAt: timestamp(updatedAt, 'Validation campaign updatedAt'),
  });
}

export function createValidationTrial({
  campaignId,
  createdAt,
  id,
  replaySessionId = null,
  status = 'pending',
  updatedAt = createdAt,
} = {}) {
  if (status !== 'pending') {
    throw new Error('A validation trial must be created in pending status.');
  }
  return artifact({
    artifactType: 'trial',
    campaignId: requiredText(campaignId, 'Validation trial campaignId'),
    createdAt: timestamp(createdAt, 'Validation trial createdAt'),
    id: requiredText(id, 'Validation trial id'),
    invalidationReason: null,
    replaySessionId: optionalText(replaySessionId, 'Validation trial replaySessionId'),
    schemaVersion: VALIDATION_ARTIFACT_SCHEMA_VERSION,
    status,
    updatedAt: timestamp(updatedAt, 'Validation trial updatedAt'),
  });
}
