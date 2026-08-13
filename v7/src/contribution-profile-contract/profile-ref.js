import { exactProfileRecord, profileId, profileVersion } from './profile-value.js';
import { failContributionProfile } from './profile-error.js';

class ContributionProfileRefValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function normalizeRef(value) {
  exactProfileRecord(
    value,
    ['profileContractVersion', 'profileId'],
    'CONTRIBUTION_PROFILE_REF_INVALID',
    'Contribution Profile reference',
  );
  return Object.freeze({
    profileContractVersion: profileVersion(value.profileContractVersion),
    profileId: profileId(value.profileId),
  });
}

/** Define one exact namespaced and versioned Contribution Profile reference. */
export function defineContributionProfileRef(value = {}) {
  return new ContributionProfileRefValue(normalizeRef(value));
}

/** Read one branded Contribution Profile reference as an immutable portable record. */
export function readContributionProfileRef(candidate) {
  if (!(candidate instanceof ContributionProfileRefValue)) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_REF_REQUIRED',
      'A branded Contribution Profile reference is required.',
    );
  }
  return candidate.read();
}

/** Compare two branded Profile references without accepting structural lookalikes. */
export function contributionProfileRefsEqual(left, right) {
  const leftValue = readContributionProfileRef(left);
  const rightValue = readContributionProfileRef(right);
  return leftValue.profileId === rightValue.profileId
    && leftValue.profileContractVersion === rightValue.profileContractVersion;
}
