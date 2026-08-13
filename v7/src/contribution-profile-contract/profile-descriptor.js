import { failContributionProfile } from './profile-error.js';
import {
  exactProfileRecord,
  exactProfileArray,
  profileId,
  profileRange,
  profileStringList,
  profileText,
  profileVersion,
} from './profile-value.js';

const FIELDS = Object.freeze([
  'compatibilityRange', 'conformanceSuiteId', 'definitionSchemaId',
  'inputContractIds', 'invalidationContract', 'lifecycleStatus',
  'migrationContract', 'outputContractIds', 'ownerContract',
  'permittedCapabilityRanges', 'persistenceContract', 'profileContractVersion',
  'profileId', 'provenanceContract', 'resourceClassContract', 'schemaVersion',
  'truthModel',
]);
const LIFECYCLE = new Set(['active', 'deprecated', 'retired']);

class ContributionProfileDescriptorValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function capabilityRange(value) {
  exactProfileRecord(
    value,
    ['id', 'range'],
    'CONTRIBUTION_PROFILE_DESCRIPTOR_INVALID',
    'Permitted capability range',
  );
  return Object.freeze({ id: profileId(value.id, 'Capability id'), range: profileRange(value.range) });
}

function capabilityRanges(value) {
  exactProfileArray(
    value,
    'Permitted capability ranges',
    64,
    'CONTRIBUTION_PROFILE_DESCRIPTOR_INVALID',
  );
  const normalized = value.map(capabilityRange)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (new Set(normalized.map(({ id }) => id)).size !== normalized.length) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_DESCRIPTOR_INVALID',
      'Permitted capability ids must be unique.',
    );
  }
  return Object.freeze(normalized);
}

function normalizeDescriptor(value) {
  exactProfileRecord(
    value,
    FIELDS,
    'CONTRIBUTION_PROFILE_DESCRIPTOR_INVALID',
    'Contribution Profile descriptor',
  );
  if (value.schemaVersion !== 1 || !LIFECYCLE.has(value.lifecycleStatus)) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_DESCRIPTOR_INVALID',
      'Contribution Profile descriptor version or lifecycle is invalid.',
    );
  }
  return Object.freeze({
    compatibilityRange: profileRange(value.compatibilityRange),
    conformanceSuiteId: profileId(value.conformanceSuiteId, 'Conformance suite id'),
    definitionSchemaId: profileText(value.definitionSchemaId, 'Definition schema id'),
    inputContractIds: profileStringList(value.inputContractIds, 'Input contract ids'),
    invalidationContract: profileId(value.invalidationContract, 'Invalidation contract'),
    lifecycleStatus: value.lifecycleStatus,
    migrationContract: profileId(value.migrationContract, 'Migration contract'),
    outputContractIds: profileStringList(value.outputContractIds, 'Output contract ids'),
    ownerContract: profileId(value.ownerContract, 'Owner contract'),
    permittedCapabilityRanges: capabilityRanges(value.permittedCapabilityRanges),
    persistenceContract: profileId(value.persistenceContract, 'Persistence contract'),
    profileContractVersion: profileVersion(value.profileContractVersion),
    profileId: profileId(value.profileId),
    provenanceContract: profileId(value.provenanceContract, 'Provenance contract'),
    resourceClassContract: profileId(value.resourceClassContract, 'Resource class contract'),
    schemaVersion: 1,
    truthModel: profileId(value.truthModel, 'Truth model'),
  });
}

/** Define one closed host-governed Contribution Profile descriptor. */
export function defineContributionProfileDescriptor(value = {}) {
  return new ContributionProfileDescriptorValue(normalizeDescriptor(value));
}

/** Read one branded Profile descriptor as a canonical immutable wire value. */
export function readContributionProfileDescriptor(candidate) {
  if (!(candidate instanceof ContributionProfileDescriptorValue)) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_DESCRIPTOR_REQUIRED',
      'A branded Contribution Profile descriptor is required.',
    );
  }
  return candidate.read();
}
