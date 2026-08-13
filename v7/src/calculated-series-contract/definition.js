import {
  defineContributionProfileRef,
  readContributionProfileRef,
  resolveContributionProfile,
} from '../contribution-profile-contract/public.js';
import { failCalculatedSeries } from './contract-error.js';
import { CALCULATED_SERIES_LIMITS } from './limits.js';
import { definePlotGroup } from './plot-definition.js';
import {
  assertByteCeiling,
  assertRawByteCeiling,
  boundedText,
  digest,
  enumValue,
  exactArray,
  exactRecord,
  opaqueId,
  safeInteger,
  semver,
  uniqueIds,
} from './portable-value.js';

const PROFILE_ID = 'analysis.calculated-series';
const PROFILE_VERSION = '1.0.0';

class CalculatedSeriesDefinitionValue {
  #wire;
  constructor(wire) { this.#wire = wire; Object.freeze(this); }
  read() { return this.#wire; }
}

function normalizeIdentity(value) {
  exactRecord(value, [
    'contributionId', 'contributionVersion', 'definitionId', 'definitionVersion',
    'packageId', 'packageVersion',
  ], 'CALCULATED_SERIES_DEFINITION_INVALID', 'Definition identity');
  return Object.freeze({
    contributionId: opaqueId(value.contributionId, 'Contribution id'),
    contributionVersion: semver(value.contributionVersion, 'Contribution version'),
    definitionId: opaqueId(value.definitionId, 'Definition id'),
    definitionVersion: semver(value.definitionVersion, 'Definition version'),
    packageId: opaqueId(value.packageId, 'Package id'),
    packageVersion: semver(value.packageVersion, 'Package version'),
  });
}

function normalizeProfile(value, profileRegistry) {
  const ref = defineContributionProfileRef(value);
  const wire = readContributionProfileRef(ref);
  if (wire.profileId !== PROFILE_ID || wire.profileContractVersion !== PROFILE_VERSION) {
    failCalculatedSeries('CALCULATED_SERIES_PROFILE_INCOMPATIBLE', 'Definition must use the exact calculated-series Profile.');
  }
  try {
    resolveContributionProfile(profileRegistry, ref);
  } catch (error) {
    failCalculatedSeries('CALCULATED_SERIES_PROFILE_UNRESOLVED', error.message);
  }
  return wire;
}

function normalizeParameterContract(value) {
  exactRecord(value, ['schemaDigest', 'schemaId', 'schemaVersion'],
    'CALCULATED_SERIES_DEFINITION_INVALID', 'Parameter contract');
  return Object.freeze({
    schemaDigest: digest(value.schemaDigest, 'Parameter schema digest'),
    schemaId: boundedText(value.schemaId, 'Parameter schema id'),
    schemaVersion: safeInteger(value.schemaVersion, 'Parameter schema version', { minimum: 1 }),
  });
}

function normalizeExecutionSemantics(value) {
  exactRecord(value, ['deterministic', 'incrementalMode', 'noFuture'],
    'CALCULATED_SERIES_DEFINITION_INVALID', 'Execution semantics');
  if (value.deterministic !== true || value.noFuture !== true) {
    failCalculatedSeries('CALCULATED_SERIES_DEFINITION_INVALID', 'V1 execution must be deterministic and no-future.');
  }
  return Object.freeze({
    deterministic: true,
    incrementalMode: enumValue(value.incrementalMode, ['none', 'append-tail-replace'], 'CALCULATED_SERIES_DEFINITION_INVALID', 'Incremental mode'),
    noFuture: true,
  });
}

function normalizeInputRequirement(value) {
  exactRecord(value, ['additionalContexts', 'insufficientWarmup', 'source', 'warmupBars'],
    'CALCULATED_SERIES_INPUT_INVALID', 'Input requirement');
  exactArray(
    value.additionalContexts,
    { maximum: 0 },
    'CALCULATED_SERIES_INPUT_CONTEXT_UNSUPPORTED',
    'Additional input contexts',
  );
  if (value.source !== 'current-workspace-pane-bars') {
    failCalculatedSeries('CALCULATED_SERIES_INPUT_CONTEXT_UNSUPPORTED', 'V1 supports current-pane Bars only.');
  }
  return Object.freeze({
    additionalContexts: Object.freeze([]),
    insufficientWarmup: enumValue(value.insufficientWarmup, ['whitespace', 'unavailable'], 'CALCULATED_SERIES_INPUT_INVALID', 'Insufficient-warmup policy'),
    source: 'current-workspace-pane-bars',
    warmupBars: safeInteger(value.warmupBars, 'Warmup Bars', { maximum: 100_000 }),
  });
}

function normalizeResources(value) {
  exactRecord(value, [
    'maximumIncrementalStateBytes', 'maximumInputBars', 'maximumOutputBytes',
    'maximumOutputPoints',
  ], 'CALCULATED_SERIES_RESOURCE_DECLARATION_INVALID', 'Resource declaration');
  const normalized = Object.freeze({
    maximumIncrementalStateBytes: safeInteger(value.maximumIncrementalStateBytes, 'Maximum incremental-state bytes', { maximum: CALCULATED_SERIES_LIMITS.maximumResultBytes }),
    maximumInputBars: safeInteger(value.maximumInputBars, 'Maximum input Bars', { minimum: 1, maximum: 100_000 }),
    maximumOutputBytes: safeInteger(value.maximumOutputBytes, 'Maximum output bytes', { minimum: 1, maximum: CALCULATED_SERIES_LIMITS.maximumResultBytes }),
    maximumOutputPoints: safeInteger(value.maximumOutputPoints, 'Maximum output points', { minimum: 1, maximum: CALCULATED_SERIES_LIMITS.maximumTotalOutputPoints }),
  });
  return normalized;
}

function normalizeMigrationRef(value) {
  exactRecord(value, ['fromDefinitionVersion', 'migrationId', 'planDigest', 'toDefinitionVersion'],
    'CALCULATED_SERIES_MIGRATION_REF_INVALID', 'Migration reference');
  const from = semver(value.fromDefinitionVersion, 'Migration source version');
  const to = semver(value.toDefinitionVersion, 'Migration destination version');
  if (compareVersions(from, to) >= 0) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_DOWNGRADE', 'Migration reference must move forward.');
  }
  return Object.freeze({
    fromDefinitionVersion: from,
    migrationId: opaqueId(value.migrationId, 'Migration id'),
    planDigest: digest(value.planDigest, 'Migration plan digest'),
    toDefinitionVersion: to,
  });
}

function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function validateMigrationRefs(refs, definitionVersion) {
  const ids = uniqueIds(refs, 'migrationId', 'Migration reference');
  if (ids.some((ref) => ref.toDefinitionVersion !== definitionVersion)
    || new Set(ids.map(({ fromDefinitionVersion }) => fromDefinitionVersion)).size !== ids.length) {
    failCalculatedSeries('CALCULATED_SERIES_MIGRATION_GAP', 'Migration references must target this definition version.');
  }
  return Object.freeze(ids.sort((left, right) => compareVersions(
    left.fromDefinitionVersion,
    right.fromDefinitionVersion,
  )));
}

function normalizeDefinition(value, profileRegistry) {
  exactRecord(value, [
    'executionSemantics', 'identity', 'inputRequirement', 'migrationRefs',
    'parameterContract', 'plotGroups', 'profile', 'resourceDeclaration', 'schemaVersion',
  ], 'CALCULATED_SERIES_DEFINITION_INVALID', 'Calculated-series definition');
  assertRawByteCeiling(
    value,
    CALCULATED_SERIES_LIMITS.maximumDefinitionBytes,
    'Definition',
  );
  if (value.schemaVersion !== 1) {
    failCalculatedSeries('CALCULATED_SERIES_DEFINITION_INVALID', 'Definition version or collection bounds are invalid.');
  }
  exactArray(
    value.plotGroups,
    { minimum: 1, maximum: CALCULATED_SERIES_LIMITS.maximumPlotGroupsPerDefinition },
    'CALCULATED_SERIES_DEFINITION_INVALID',
    'Definition Plot Groups',
  );
  exactArray(
    value.migrationRefs,
    { maximum: CALCULATED_SERIES_LIMITS.maximumMigrationOperations },
    'CALCULATED_SERIES_DEFINITION_INVALID',
    'Definition migration references',
  );
  const identity = normalizeIdentity(value.identity);
  const plotGroups = uniqueIds(value.plotGroups.map(definePlotGroup), 'plotGroupId', 'Plot Group');
  if (plotGroups.reduce((count, group) => count + group.plots.length, 0)
    > CALCULATED_SERIES_LIMITS.maximumPlotsPerDefinition) {
    failCalculatedSeries('CALCULATED_SERIES_RESOURCE_LIMIT', 'Definition has too many Plots.');
  }
  const wire = Object.freeze({
    executionSemantics: normalizeExecutionSemantics(value.executionSemantics),
    identity,
    inputRequirement: normalizeInputRequirement(value.inputRequirement),
    migrationRefs: validateMigrationRefs(value.migrationRefs.map(normalizeMigrationRef), identity.definitionVersion),
    parameterContract: normalizeParameterContract(value.parameterContract),
    plotGroups: Object.freeze(plotGroups),
    profile: normalizeProfile(value.profile, profileRegistry),
    resourceDeclaration: normalizeResources(value.resourceDeclaration),
    schemaVersion: 1,
  });
  if (wire.inputRequirement.warmupBars > wire.resourceDeclaration.maximumInputBars) {
    failCalculatedSeries('CALCULATED_SERIES_RESOURCE_LIMIT', 'Warmup Bars exceed declared input Bars.');
  }
  return assertByteCeiling(wire, CALCULATED_SERIES_LIMITS.maximumDefinitionBytes, 'Definition');
}

/** Define one immutable calculated-series definition against an explicit pinned Profile registry. */
export function defineCalculatedSeriesDefinition(value = {}, { profileRegistry } = {}) {
  return new CalculatedSeriesDefinitionValue(normalizeDefinition(value, profileRegistry));
}

/** Read one branded calculated-series definition as its canonical portable wire record. */
export function readCalculatedSeriesDefinition(candidate) {
  if (!(candidate instanceof CalculatedSeriesDefinitionValue)) {
    failCalculatedSeries('CALCULATED_SERIES_DEFINITION_REQUIRED', 'A branded calculated-series definition is required.');
  }
  return candidate.read();
}

/** Return an exact immutable reference for a branded calculated-series definition. */
export function calculatedSeriesDefinitionRef(definition) {
  const value = readCalculatedSeriesDefinition(definition);
  return Object.freeze({ ...value.identity, profile: value.profile });
}

/** Compare semantic versions for forward-only contract validation. */
export function compareCalculatedSeriesVersions(left, right) {
  return compareVersions(semver(left), semver(right));
}
