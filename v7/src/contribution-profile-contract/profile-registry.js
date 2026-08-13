import {
  CALCULATED_SERIES_PROFILE_DESCRIPTOR,
  CALCULATED_SERIES_PROFILE_REF,
} from './calculated-series-profile.js';
import {
  defineContributionProfileDescriptor,
  readContributionProfileDescriptor,
} from './profile-descriptor.js';
import { defineContributionProfileRef, readContributionProfileRef } from './profile-ref.js';
import { failContributionProfile } from './profile-error.js';
import {
  exactProfileArray,
  exactProfileRecord,
  versionMatchesRange,
} from './profile-value.js';

export const CONTRIBUTION_PROFILE_LIMITS = Object.freeze({
  maximumCanonicalBytes: 256 * 1024,
  maximumDescriptors: 64,
});

class ContributionProfileRegistryValue {
  #descriptors;
  #wire;
  constructor(descriptors, wire) {
    this.#descriptors = descriptors;
    this.#wire = wire;
    Object.freeze(this);
  }
  descriptors() { return this.#descriptors; }
  read() { return this.#wire; }
}

function canonicalBytes(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function normalizeRegistry(value, authority) {
  exactProfileRecord(
    value,
    ['descriptors', 'schemaVersion'],
    'CONTRIBUTION_PROFILE_REGISTRY_INVALID',
    'Contribution Profile registry',
  );
  if (authority !== 'host-pinned') {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_REGISTRY_AUTHORITY_FORBIDDEN',
      'Only pinned host artifacts may construct a Contribution Profile registry.',
    );
  }
  if (value.schemaVersion !== 1) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_REGISTRY_INVALID',
      'Contribution Profile registry version is invalid.',
    );
  }
  exactProfileArray(
    value.descriptors,
    'Contribution Profile descriptors',
    CONTRIBUTION_PROFILE_LIMITS.maximumDescriptors,
    'CONTRIBUTION_PROFILE_REGISTRY_INVALID',
  );
  const descriptors = value.descriptors.map((candidate) => {
    try {
      readContributionProfileDescriptor(candidate);
      return candidate;
    } catch {
      return defineContributionProfileDescriptor(candidate);
    }
  }).sort((left, right) => {
    const leftValue = readContributionProfileDescriptor(left);
    const rightValue = readContributionProfileDescriptor(right);
    return `${leftValue.profileId}@${leftValue.profileContractVersion}`
      .localeCompare(`${rightValue.profileId}@${rightValue.profileContractVersion}`);
  });
  const wires = Object.freeze(descriptors.map(readContributionProfileDescriptor));
  const keys = wires.map(({ profileContractVersion, profileId }) => (
    `${profileId}@${profileContractVersion}`
  ));
  if (new Set(keys).size !== keys.length) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_DESCRIPTOR_DUPLICATE',
      'Contribution Profile descriptor identities must be unique.',
    );
  }
  const wire = Object.freeze({ descriptors: wires, schemaVersion: 1 });
  if (canonicalBytes(wire) > CONTRIBUTION_PROFILE_LIMITS.maximumCanonicalBytes) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_RESOURCE_LIMIT',
      'Contribution Profile registry exceeds its canonical byte ceiling.',
    );
  }
  return { descriptors: Object.freeze(descriptors), wire };
}

/** Create one immutable Profile registry from pinned host descriptors only. */
export function createContributionProfileRegistry(value = {}, { authority } = {}) {
  const normalized = normalizeRegistry(value, authority);
  return new ContributionProfileRegistryValue(normalized.descriptors, normalized.wire);
}

/** Create the first pinned host registry containing the calculated-series descriptor. */
export function createInitialContributionProfileRegistry() {
  return createContributionProfileRegistry({
    descriptors: [CALCULATED_SERIES_PROFILE_DESCRIPTOR],
    schemaVersion: 1,
  }, { authority: 'host-pinned' });
}

/** Read one branded Profile registry as a canonical immutable wire value. */
export function readContributionProfileRegistry(candidate) {
  if (!(candidate instanceof ContributionProfileRegistryValue)) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_REGISTRY_REQUIRED',
      'A branded Contribution Profile registry is required.',
    );
  }
  return candidate.read();
}

/** Resolve one exact active/deprecated host Profile descriptor or fail closed. */
export function resolveContributionProfile(registry, reference) {
  if (!(registry instanceof ContributionProfileRegistryValue)) {
    readContributionProfileRegistry(registry);
  }
  const ref = readContributionProfileRef(reference);
  const descriptor = registry.descriptors().find((candidate) => {
    const value = readContributionProfileDescriptor(candidate);
    return value.profileId === ref.profileId
      && value.profileContractVersion === ref.profileContractVersion;
  });
  if (!descriptor) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_UNKNOWN',
      'The exact Contribution Profile descriptor is not registered by the host.',
    );
  }
  const value = readContributionProfileDescriptor(descriptor);
  if (value.lifecycleStatus === 'retired') {
    failContributionProfile('CONTRIBUTION_PROFILE_RETIRED', 'The Contribution Profile is retired.');
  }
  if (value.lifecycleStatus === 'deprecated') {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_DEPRECATED_POLICY_REQUIRED',
      'The Contribution Profile is deprecated and no host migration policy was supplied.',
    );
  }
  if (!versionMatchesRange(ref.profileContractVersion, value.compatibilityRange)) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_INCOMPATIBLE',
      'The Contribution Profile reference is outside the descriptor compatibility range.',
    );
  }
  return descriptor;
}

/** Return a deterministic compatibility result without selecting execution authority. */
export function assessContributionProfileCompatibility(descriptorCandidate, referenceCandidate) {
  const descriptor = readContributionProfileDescriptor(descriptorCandidate);
  const reference = readContributionProfileRef(referenceCandidate);
  const conflicts = [];
  if (descriptor.profileId !== reference.profileId) conflicts.push('profileId');
  if (!versionMatchesRange(reference.profileContractVersion, descriptor.compatibilityRange)) {
    conflicts.push('profileContractVersion');
  }
  if (descriptor.lifecycleStatus !== 'active') conflicts.push('lifecycleStatus');
  return Object.freeze({
    code: conflicts.length === 0
      ? 'CONTRIBUTION_PROFILE_COMPATIBLE'
      : 'CONTRIBUTION_PROFILE_INCOMPATIBLE',
    compatible: conflicts.length === 0,
    conflicts: Object.freeze(conflicts),
  });
}

/** Return the exact accepted calculated-series Profile reference as a branded value. */
export function calculatedSeriesProfileRef() {
  return defineContributionProfileRef(CALCULATED_SERIES_PROFILE_REF);
}
