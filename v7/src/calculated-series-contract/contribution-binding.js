import {
  defineContributionProfileRef,
  readContributionProfileRef,
  resolveContributionProfile,
} from '../contribution-profile-contract/public.js';
import { failCalculatedSeries } from './contract-error.js';
import {
  calculatedSeriesDefinitionRef,
  readCalculatedSeriesDefinition,
} from './definition.js';
import { exactRecord, opaqueId, semver } from './portable-value.js';

class CalculatedSeriesContributionBindingValue {
  #wire;
  constructor(wire) { this.#wire = wire; Object.freeze(this); }
  read() { return this.#wire; }
}

function assertIdentity(binding, definitionRef) {
  const fields = [
    'packageId', 'packageVersion', 'contributionId', 'contributionVersion',
    'definitionId', 'definitionVersion',
  ];
  if (fields.some((field) => binding[field] !== definitionRef[field])) {
    failCalculatedSeries('CALCULATED_SERIES_BINDING_FOREIGN_IDENTITY', 'Binding and definition identities differ.');
  }
  if (binding.profile.profileId !== definitionRef.profile.profileId
    || binding.profile.profileContractVersion !== definitionRef.profile.profileContractVersion) {
    failCalculatedSeries(
      'CALCULATED_SERIES_BINDING_FOREIGN_PROFILE',
      'Binding and definition Contribution Profiles differ.',
    );
  }
}

/** Bind an exact trusted indicator identity to one exact calculated-series definition. */
export function defineCalculatedSeriesContributionBinding(
  value = {},
  { definition, profileRegistry } = {},
) {
  exactRecord(value, [
    'contributionId', 'contributionVersion', 'declaredKind', 'definitionId',
    'definitionVersion', 'packageId', 'packageVersion', 'profile', 'schemaVersion',
  ], 'CALCULATED_SERIES_BINDING_INVALID', 'Contribution binding');
  if (value.schemaVersion !== 1 || value.declaredKind !== 'indicator') {
    failCalculatedSeries('CALCULATED_SERIES_BINDING_INVALID', 'V1 binding requires declaredKind indicator.');
  }
  readCalculatedSeriesDefinition(definition);
  const profileRef = defineContributionProfileRef(value.profile);
  try {
    resolveContributionProfile(profileRegistry, profileRef);
  } catch (error) {
    failCalculatedSeries('CALCULATED_SERIES_PROFILE_UNRESOLVED', error.message);
  }
  const profile = readContributionProfileRef(profileRef);
  const wire = Object.freeze({
    contributionId: opaqueId(value.contributionId, 'Contribution id'),
    contributionVersion: semver(value.contributionVersion, 'Contribution version'),
    declaredKind: 'indicator',
    definitionId: opaqueId(value.definitionId, 'Definition id'),
    definitionVersion: semver(value.definitionVersion, 'Definition version'),
    packageId: opaqueId(value.packageId, 'Package id'),
    packageVersion: semver(value.packageVersion, 'Package version'),
    profile,
    schemaVersion: 1,
  });
  assertIdentity(wire, calculatedSeriesDefinitionRef(definition));
  return new CalculatedSeriesContributionBindingValue(wire);
}

/** Read a branded exact contribution binding; manifest kind alone is rejected. */
export function readCalculatedSeriesContributionBinding(candidate) {
  if (!(candidate instanceof CalculatedSeriesContributionBindingValue)) {
    failCalculatedSeries('CALCULATED_SERIES_BINDING_REQUIRED', 'A branded calculated-series binding is required.');
  }
  return candidate.read();
}
