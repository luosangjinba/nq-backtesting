import { failContributionProfile } from './profile-error.js';

const CONTRACT_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RANGE = /^\^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function profileDataPropertyKeys(value, label) {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== 'string')) {
    failContributionProfile('CONTRIBUTION_PROFILE_VALUE_INVALID', `${label} contains Symbol keys.`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || (key !== 'length' && !descriptor.enumerable)) {
      failContributionProfile(
        'CONTRIBUTION_PROFILE_VALUE_INVALID',
        `${label} must contain enumerable data properties only.`,
      );
    }
  }
  return keys;
}

export function exactProfileRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    failContributionProfile(code, `${label} fields are invalid.`);
  }
  const keys = profileDataPropertyKeys(value, label);
  if (keys.sort().join(',') !== [...fields].sort().join(',')) {
    failContributionProfile(code, `${label} fields are invalid.`);
  }
  return value;
}

export function exactProfileArray(
  value,
  label,
  maximum,
  code = 'CONTRIBUTION_PROFILE_VALUE_INVALID',
) {
  if (!Array.isArray(value) || value.length > maximum) {
    failContributionProfile(code, `${label} is invalid.`);
  }
  const keys = profileDataPropertyKeys(value, label).filter((key) => key !== 'length');
  if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
    failContributionProfile(code, `${label} must be dense.`);
  }
  return value;
}

export function profileText(value, label, max = 320) {
  if (typeof value !== 'string' || value.length < 1 || value.length > max) {
    failContributionProfile('CONTRIBUTION_PROFILE_VALUE_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function profileId(value, label = 'Profile id') {
  if (typeof value !== 'string' || value.length > 128 || !CONTRACT_ID.test(value)) {
    failContributionProfile('CONTRIBUTION_PROFILE_ID_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function profileVersion(value, label = 'Profile contract version') {
  if (typeof value !== 'string' || !VERSION.test(value)) {
    failContributionProfile('CONTRIBUTION_PROFILE_VERSION_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function profileRange(value) {
  if (typeof value !== 'string' || !RANGE.test(value)) {
    failContributionProfile(
      'CONTRIBUTION_PROFILE_COMPATIBILITY_RANGE_INVALID',
      'Profile compatibility range is invalid.',
    );
  }
  return value;
}

export function profileStringList(value, label, { max = 64 } = {}) {
  exactProfileArray(value, label, max);
  const normalized = value.map((entry) => profileId(entry, `${label} entry`)).sort();
  if (new Set(normalized).size !== normalized.length) {
    failContributionProfile('CONTRIBUTION_PROFILE_VALUE_DUPLICATE', `${label} contains duplicates.`);
  }
  return Object.freeze(normalized);
}

export function versionMatchesRange(version, range) {
  const versionParts = profileVersion(version).split('.').map(Number);
  const rangeParts = profileRange(range).slice(1).split('.').map(Number);
  if (versionParts[0] !== rangeParts[0]) return false;
  if (rangeParts[0] === 0 && versionParts[1] !== rangeParts[1]) return false;
  if (rangeParts[0] === 0 && rangeParts[1] === 0) {
    return versionParts[2] === rangeParts[2];
  }
  return versionParts[1] > rangeParts[1]
    || (versionParts[1] === rangeParts[1] && versionParts[2] >= rangeParts[2]);
}
