import { failCalculatedSeries } from './contract-error.js';
import { compareCalculatedSeriesVersions } from './definition.js';
import { CALCULATED_SERIES_LIMITS } from './limits.js';
import {
  assertByteCeiling,
  digest,
  enumValue,
  exactArray,
  exactRecord,
  opaqueId,
  portableValue,
  safeInteger,
  semver,
} from './portable-value.js';

const OPERATION_KINDS = Object.freeze([
  'map-enum-value', 'map-style-token', 'quarantine-retired-parameter',
  'rename-parameter', 'rename-plot-group-id', 'rename-plot-id', 'set-default-if-absent',
]);

class CalculatedSeriesMigrationPlanValue {
  #digestPayload;
  #wire;
  constructor(wire, digestPayload) {
    this.#digestPayload = digestPayload;
    this.#wire = wire;
    Object.freeze(this);
  }
  digestPayload() { return this.#digestPayload; }
  read() { return this.#wire; }
}

function normalizeProfile(value, label) {
  exactRecord(value, ['profileContractVersion', 'profileId'],
    'CALCULATED_SERIES_MIGRATION_INVALID', label);
  const profile = Object.freeze({
    profileContractVersion: semver(value.profileContractVersion, `${label} version`),
    profileId: opaqueId(value.profileId, `${label} id`),
  });
  if (profile.profileId !== 'analysis.calculated-series'
    || profile.profileContractVersion !== '1.0.0') {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_PROFILE_CHANGE', 'Migration Profile is unsupported.');
  }
  return profile;
}

function normalizeDefinitionRef(value, label) {
  exactRecord(value, [
    'contributionId', 'contributionVersion', 'definitionId', 'definitionVersion',
    'packageId', 'packageVersion', 'profile',
  ], 'CALCULATED_SERIES_MIGRATION_INVALID', label);
  return Object.freeze({
    contributionId: opaqueId(value.contributionId, `${label} contribution id`),
    contributionVersion: semver(value.contributionVersion, `${label} contribution version`),
    definitionId: opaqueId(value.definitionId, `${label} definition id`),
    definitionVersion: semver(value.definitionVersion, `${label} definition version`),
    packageId: opaqueId(value.packageId, `${label} package id`),
    packageVersion: semver(value.packageVersion, `${label} package version`),
    profile: normalizeProfile(value.profile, `${label} Profile`),
  });
}

function normalizeOperation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_OPERATION_UNSUPPORTED', 'Migration operation must be a record.');
  }
  const kind = enumValue(value.kind, OPERATION_KINDS, 'CALCULATED_SERIES_MIGRATION_OPERATION_UNSUPPORTED', 'Migration operation');
  const common = { kind };
  if (kind === 'rename-parameter') {
    exactRecord(value, ['fromParameterId', 'kind', 'toParameterId'], 'CALCULATED_SERIES_MIGRATION_INVALID', 'Rename-parameter operation');
    return Object.freeze({ ...common, fromParameterId: opaqueId(value.fromParameterId), toParameterId: opaqueId(value.toParameterId) });
  }
  if (kind === 'set-default-if-absent') {
    exactRecord(value, ['kind', 'parameterId', 'value'], 'CALCULATED_SERIES_MIGRATION_INVALID', 'Set-default operation');
    return Object.freeze({ ...common, parameterId: opaqueId(value.parameterId), value: portableValue(value.value) });
  }
  if (kind === 'quarantine-retired-parameter') {
    exactRecord(value, ['kind', 'parameterId', 'quarantineId'], 'CALCULATED_SERIES_MIGRATION_INVALID', 'Quarantine operation');
    return Object.freeze({ ...common, parameterId: opaqueId(value.parameterId), quarantineId: opaqueId(value.quarantineId) });
  }
  if (kind === 'map-enum-value') {
    exactRecord(value, ['fromValue', 'kind', 'parameterId', 'toValue'], 'CALCULATED_SERIES_MIGRATION_INVALID', 'Map-enum operation');
    return Object.freeze({
      ...common,
      fromValue: portableValue(value.fromValue),
      parameterId: opaqueId(value.parameterId),
      toValue: portableValue(value.toValue),
    });
  }
  if (kind === 'rename-plot-group-id') {
    exactRecord(value, ['fromPlotGroupId', 'kind', 'toPlotGroupId'], 'CALCULATED_SERIES_MIGRATION_INVALID', 'Rename-Plot-Group operation');
    return Object.freeze({ ...common, fromPlotGroupId: opaqueId(value.fromPlotGroupId), toPlotGroupId: opaqueId(value.toPlotGroupId) });
  }
  if (kind === 'rename-plot-id') {
    exactRecord(value, ['fromPlotId', 'kind', 'plotGroupId', 'toPlotId'], 'CALCULATED_SERIES_MIGRATION_INVALID', 'Rename-Plot operation');
    return Object.freeze({
      ...common,
      fromPlotId: opaqueId(value.fromPlotId),
      plotGroupId: opaqueId(value.plotGroupId),
      toPlotId: opaqueId(value.toPlotId),
    });
  }
  exactRecord(value, ['fromToken', 'kind', 'targetId', 'toToken'], 'CALCULATED_SERIES_MIGRATION_INVALID', 'Map-style-token operation');
  return Object.freeze({
    ...common,
    fromToken: portableValue(value.fromToken),
    targetId: opaqueId(value.targetId),
    toToken: portableValue(value.toToken),
  });
}

function validateDirection(plan) {
  if (plan.fromProfile.profileId !== plan.toProfile.profileId
    || plan.fromProfile.profileContractVersion !== plan.toProfile.profileContractVersion
    || plan.fromDefinitionRef.profile.profileId !== plan.fromProfile.profileId
    || plan.toDefinitionRef.profile.profileId !== plan.toProfile.profileId
    || plan.fromDefinitionRef.profile.profileContractVersion
      !== plan.fromProfile.profileContractVersion
    || plan.toDefinitionRef.profile.profileContractVersion
      !== plan.toProfile.profileContractVersion) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_PROFILE_CHANGE', 'Migration cannot change Profile truth.');
  }
  const definitionDirection = compareCalculatedSeriesVersions(
    plan.fromDefinitionRef.definitionVersion,
    plan.toDefinitionRef.definitionVersion,
  );
  if (definitionDirection > 0 || plan.toDocumentSchemaVersion < plan.fromDocumentSchemaVersion
    || (definitionDirection === 0
      && plan.toDocumentSchemaVersion === plan.fromDocumentSchemaVersion)) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_DOWNGRADE', 'Migration must move strictly forward.');
  }
  const stable = ['packageId', 'contributionId', 'definitionId'];
  if (stable.some((field) => plan.fromDefinitionRef[field] !== plan.toDefinitionRef[field])) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_AMBIGUOUS', 'Migration cannot infer a different stable definition identity.');
  }
  if (compareCalculatedSeriesVersions(plan.fromDefinitionRef.packageVersion,
    plan.toDefinitionRef.packageVersion) > 0
    || compareCalculatedSeriesVersions(plan.fromDefinitionRef.contributionVersion,
      plan.toDefinitionRef.contributionVersion) > 0) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_DOWNGRADE', 'Package or Contribution generation cannot downgrade.');
  }
}

/** Define a forward-only declarative calculated-series migration plan. */
export function defineCalculatedSeriesMigrationPlan(value = {}) {
  exactRecord(value, [
    'expectedFixtureDigests', 'expectedPlanDigest', 'fromDefinitionRef',
    'fromDocumentSchemaVersion', 'fromProfile', 'migrationId', 'operations',
    'schemaVersion', 'toDefinitionRef', 'toDocumentSchemaVersion', 'toProfile',
  ], 'CALCULATED_SERIES_MIGRATION_INVALID', 'Migration plan');
  if (value.schemaVersion !== 1) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_INVALID', 'Migration plan version or collections are invalid.');
  }
  exactArray(
    value.operations,
    { maximum: CALCULATED_SERIES_LIMITS.maximumMigrationOperations },
    'CALCULATED_SERIES_MIGRATION_INVALID',
    'Migration operations',
  );
  exactArray(
    value.expectedFixtureDigests,
    { minimum: 1, maximum: CALCULATED_SERIES_LIMITS.maximumPortableCollectionEntries },
    'CALCULATED_SERIES_MIGRATION_INVALID',
    'Expected migration fixture digests',
  );
  const payload = Object.freeze({
    expectedFixtureDigests: Object.freeze(value.expectedFixtureDigests.map((entry) => digest(entry, 'Expected fixture digest')).sort()),
    fromDefinitionRef: normalizeDefinitionRef(value.fromDefinitionRef, 'Source definition'),
    fromDocumentSchemaVersion: safeInteger(value.fromDocumentSchemaVersion, 'Source document schema', { minimum: 1 }),
    fromProfile: normalizeProfile(value.fromProfile, 'Source Profile'),
    migrationId: opaqueId(value.migrationId, 'Migration id'),
    operations: Object.freeze(value.operations.map(normalizeOperation)),
    schemaVersion: 1,
    toDefinitionRef: normalizeDefinitionRef(value.toDefinitionRef, 'Destination definition'),
    toDocumentSchemaVersion: safeInteger(value.toDocumentSchemaVersion, 'Destination document schema', { minimum: 1 }),
    toProfile: normalizeProfile(value.toProfile, 'Destination Profile'),
  });
  if (new Set(payload.expectedFixtureDigests).size !== payload.expectedFixtureDigests.length) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_AMBIGUOUS', 'Expected fixture digests must be unique.');
  }
  validateDirection(payload);
  const wire = Object.freeze({ ...payload, expectedPlanDigest: digest(value.expectedPlanDigest, 'Expected plan digest') });
  assertByteCeiling(wire, CALCULATED_SERIES_LIMITS.maximumMigrationBytes, 'Migration plan');
  return new CalculatedSeriesMigrationPlanValue(wire, payload);
}

/** Read a branded migration plan as exact immutable portable evidence. */
export function readCalculatedSeriesMigrationPlan(candidate) {
  if (!(candidate instanceof CalculatedSeriesMigrationPlanValue)) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_REQUIRED', 'A branded calculated-series migration plan is required.');
  }
  return candidate.read();
}

function migrationNodeKey(definitionRef, documentSchemaVersion) {
  return `${JSON.stringify(definitionRef)}@document-${documentSchemaVersion}`;
}

/** Validate one complete unambiguous acyclic migration chain between exact endpoints. */
export function validateCalculatedSeriesMigrationChain(
  plans,
  {
    fromDefinitionRef,
    fromDocumentSchemaVersion,
    toDefinitionRef,
    toDocumentSchemaVersion,
  } = {},
) {
  exactArray(
    plans,
    { minimum: 1, maximum: CALCULATED_SERIES_LIMITS.maximumPortableCollectionEntries },
    'CALCULATED_SERIES_MIGRATION_GAP',
    'Migration chain',
  );
  const fromRef = normalizeDefinitionRef(fromDefinitionRef, 'Chain source definition');
  const toRef = normalizeDefinitionRef(toDefinitionRef, 'Chain destination definition');
  const fromDocument = safeInteger(fromDocumentSchemaVersion, 'Chain source document schema', { minimum: 1 });
  const toDocument = safeInteger(toDocumentSchemaVersion, 'Chain destination document schema', { minimum: 1 });
  const wires = plans.map(readCalculatedSeriesMigrationPlan);
  const bySource = new Map();
  for (const plan of wires) {
    const key = migrationNodeKey(plan.fromDefinitionRef, plan.fromDocumentSchemaVersion);
    if (bySource.has(key)) {
      failCalculatedSeries('CALCULATED_SERIES_MIGRATION_AMBIGUOUS', 'Migration chain has multiple outgoing plans.');
    }
    bySource.set(key, plan);
  }
  const targetKey = migrationNodeKey(toRef, toDocument);
  let cursorKey = migrationNodeKey(fromRef, fromDocument);
  const seen = new Set();
  const migrationIds = [];
  while (cursorKey !== targetKey) {
    if (seen.has(cursorKey)) failCalculatedSeries('CALCULATED_SERIES_MIGRATION_CYCLE', 'Migration chain contains a cycle.');
    seen.add(cursorKey);
    const plan = bySource.get(cursorKey);
    if (!plan) failCalculatedSeries('CALCULATED_SERIES_MIGRATION_GAP', 'Migration chain has a missing transition.');
    migrationIds.push(plan.migrationId);
    cursorKey = migrationNodeKey(plan.toDefinitionRef, plan.toDocumentSchemaVersion);
  }
  if (migrationIds.length !== wires.length) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_AMBIGUOUS', 'Migration chain contains disconnected or surplus plans.');
  }
  return Object.freeze({ migrationIds: Object.freeze(migrationIds), status: 'complete' });
}

function requireProperty(object, property, presence, code) {
  const present = Object.hasOwn(object, property);
  if (present !== presence) failCalculatedSeries(code, 'Migration operation precondition failed.');
}

function applyParameterOperation(instance, operation) {
  const parameters = instance.parameterOverrides;
  if (operation.kind === 'rename-parameter') {
    requireProperty(parameters, operation.fromParameterId, true, 'CALCULATED_SERIES_MIGRATION_PRECONDITION');
    requireProperty(parameters, operation.toParameterId, false, 'CALCULATED_SERIES_MIGRATION_AMBIGUOUS');
    parameters[operation.toParameterId] = parameters[operation.fromParameterId];
    delete parameters[operation.fromParameterId];
  } else if (operation.kind === 'set-default-if-absent') {
    if (!Object.hasOwn(parameters, operation.parameterId)) parameters[operation.parameterId] = operation.value;
  } else if (operation.kind === 'quarantine-retired-parameter') {
    requireProperty(parameters, operation.parameterId, true, 'CALCULATED_SERIES_MIGRATION_PRECONDITION');
    parameters.quarantine ??= {};
    if (!parameters.quarantine || typeof parameters.quarantine !== 'object'
      || Array.isArray(parameters.quarantine)) {
      failCalculatedSeries('CALCULATED_SERIES_MIGRATION_AMBIGUOUS', 'Parameter quarantine must be a record.');
    }
    requireProperty(parameters.quarantine, operation.quarantineId, false, 'CALCULATED_SERIES_MIGRATION_AMBIGUOUS');
    parameters.quarantine[operation.quarantineId] = parameters[operation.parameterId];
    delete parameters[operation.parameterId];
  } else {
    requireProperty(parameters, operation.parameterId, true, 'CALCULATED_SERIES_MIGRATION_PRECONDITION');
    if (JSON.stringify(parameters[operation.parameterId]) !== JSON.stringify(operation.fromValue)) {
      failCalculatedSeries('CALCULATED_SERIES_MIGRATION_PRECONDITION', 'Enum mapping source value differs.');
    }
    parameters[operation.parameterId] = operation.toValue;
  }
}

function applyIdentityOperation(instance, operation) {
  if (operation.kind === 'rename-plot-group-id') {
    const placements = instance.plotGroupPlacements.filter(({ plotGroupId }) => plotGroupId === operation.fromPlotGroupId);
    if (placements.length !== 1 || instance.plotGroupPlacements.some(({ plotGroupId }) => plotGroupId === operation.toPlotGroupId)) {
      failCalculatedSeries('CALCULATED_SERIES_MIGRATION_AMBIGUOUS', 'Plot Group rename is missing or ambiguous.');
    }
    placements[0].plotGroupId = operation.toPlotGroupId;
    instance.styleOverrides.filter(({ plotGroupId }) => plotGroupId === operation.fromPlotGroupId)
      .forEach((style) => { style.plotGroupId = operation.toPlotGroupId; });
  } else {
    const matches = instance.styleOverrides.filter(({ plotGroupId, targetId }) => (
      plotGroupId === operation.plotGroupId && targetId === operation.fromPlotId
    ));
    if (matches.length > 1 || instance.styleOverrides.some(({ plotGroupId, targetId }) => (
      plotGroupId === operation.plotGroupId && targetId === operation.toPlotId
    ))) failCalculatedSeries('CALCULATED_SERIES_MIGRATION_AMBIGUOUS', 'Plot rename is ambiguous.');
    if (matches.length === 1) matches[0].targetId = operation.toPlotId;
  }
}

function replaceStyleToken(value, fromToken, toToken) {
  let replacements = 0;
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== 'object') return;
    for (const [key, entry] of Object.entries(candidate)) {
      if (JSON.stringify(entry) === JSON.stringify(fromToken)) {
        candidate[key] = toToken;
        replacements += 1;
      } else visit(entry);
    }
  };
  visit(value);
  if (replacements !== 1) failCalculatedSeries('CALCULATED_SERIES_MIGRATION_AMBIGUOUS', 'Style token mapping must match exactly once.');
}

function applyOperation(instance, operation) {
  if (['rename-parameter', 'set-default-if-absent', 'quarantine-retired-parameter', 'map-enum-value']
    .includes(operation.kind)) applyParameterOperation(instance, operation);
  else if (['rename-plot-group-id', 'rename-plot-id'].includes(operation.kind)) {
    applyIdentityOperation(instance, operation);
  } else {
    const targets = instance.styleOverrides.filter(({ targetId }) => targetId === operation.targetId);
    if (targets.length !== 1) failCalculatedSeries('CALCULATED_SERIES_MIGRATION_AMBIGUOUS', 'Style target must resolve exactly once.');
    replaceStyleToken(targets[0].style, operation.fromToken, operation.toToken);
  }
}

/** Simulate a digest-bound migration without mutating or persisting the original record. */
export async function simulateCalculatedSeriesMigration(
  planCandidate,
  original,
  { digestCanonical } = {},
) {
  const plan = readCalculatedSeriesMigrationPlan(planCandidate);
  if (typeof digestCanonical !== 'function') {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_DIGEST_PORT_REQUIRED', 'Migration simulation requires a pure digest port.');
  }
  const planDigest = await digestCanonical(planCandidate.digestPayload());
  if (planDigest !== plan.expectedPlanDigest) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_DIGEST_MISMATCH', 'Migration plan digest differs from its binding.');
  }
  const source = portableValue(original, 'Migration source instance');
  exactRecord(source, [
    'definitionRef', 'instanceId', 'instanceRevision', 'parameterOverrides',
    'plotGroupPlacements', 'styleOverrides', 'visibility',
  ], 'CALCULATED_SERIES_MIGRATION_PRECONDITION', 'Migration source instance');
  if (JSON.stringify(source.definitionRef) !== JSON.stringify(plan.fromDefinitionRef)
    || !source.parameterOverrides || typeof source.parameterOverrides !== 'object'
    || Array.isArray(source.parameterOverrides)
    || !Array.isArray(source.plotGroupPlacements) || !Array.isArray(source.styleOverrides)) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_PRECONDITION', 'Migration source identity or structure differs.');
  }
  const candidate = structuredClone(source);
  for (const operation of plan.operations) applyOperation(candidate, operation);
  candidate.definitionRef = structuredClone(plan.toDefinitionRef);
  const canonicalCandidate = portableValue(candidate);
  const candidateDigest = await digestCanonical(canonicalCandidate);
  if (!plan.expectedFixtureDigests.includes(candidateDigest)) {
    failCalculatedSeries(
      'CALCULATED_SERIES_MIGRATION_FIXTURE_DIGEST_MISMATCH',
      'Migrated fixture digest was not accepted.',
      candidateDigest,
    );
  }
  return Object.freeze({
    candidate: canonicalCandidate,
    candidateDigest,
    original: source,
    planDigest,
    status: 'simulated',
  });
}

export const CALCULATED_SERIES_MIGRATION_OPERATION_KINDS = OPERATION_KINDS;
