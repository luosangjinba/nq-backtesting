import {
  readCalculatedSeriesContributionBinding,
  readCalculatedSeriesDefinition,
} from '../calculated-series-contract/public.js';
import { readBuiltInPluginManifest } from '../plugin-contract/public.js';
import { failCalculatedSeriesRuntime } from './runtime-error.js';

function key(reference) {
  return [reference?.packageId, reference?.packageVersion, reference?.contributionId,
    reference?.contributionVersion, reference?.definitionId, reference?.definitionVersion,
    reference?.profile?.profileId, reference?.profile?.profileContractVersion].join('@');
}

function bindingMatchesDefinition(binding, definition) {
  return binding.schemaVersion === 1 && binding.declaredKind === 'indicator'
    && ['packageId', 'packageVersion', 'contributionId', 'contributionVersion',
      'definitionId', 'definitionVersion'].every((field) => (
      binding[field] === definition.identity[field]
    ))
    && binding.profile.profileId === definition.profile.profileId
    && binding.profile.profileContractVersion === definition.profile.profileContractVersion;
}

function admit(entry) {
  if (!entry || typeof entry !== 'object' || typeof entry.read !== 'function') {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_REGISTRATION_INVALID',
      'Trusted registration requires an explicit package reader.',
    );
  }
  let record;
  try { record = entry.read(entry.registration); } catch (cause) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_REGISTRATION_REJECTED',
      'Trusted package registration could not be verified.',
      { cause },
    );
  }
  const definition = readCalculatedSeriesDefinition(record.definition);
  const binding = readCalculatedSeriesContributionBinding(record.binding);
  const manifest = readBuiltInPluginManifest(record.manifest);
  const reference = Object.freeze({ ...definition.identity, profile: definition.profile });
  if (record.schemaVersion !== 1 || typeof record.formula !== 'function'
    || typeof record.normalizeSettings !== 'function'
    || !Array.isArray(record.legendLabelFields)
    || record.legendLabelFields.some((fieldId) => typeof fieldId !== 'string')
    || !Number.isSafeInteger(record.instanceLimitPerPane)
    || record.instanceLimitPerPane < 1 || record.instanceLimitPerPane > 32
    || typeof record.visibilityFieldId !== 'string'
    || !bindingMatchesDefinition(binding, definition)
    || JSON.stringify(record.reference) !== JSON.stringify(reference)
    || manifest.packageId !== reference.packageId
    || manifest.packageVersion !== reference.packageVersion
    || manifest.contributions.length !== 1
    || manifest.contributions[0].id !== reference.contributionId
    || manifest.contributions[0].version !== reference.contributionVersion) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_REGISTRATION_MISMATCH',
      'Manifest, Contribution, Profile binding, and Definition identity differ.',
    );
  }
  return Object.freeze({
    ...record,
    executionRegistration: record,
    key: key(reference),
    parameterSchema: manifest.contributions[0].parameters,
    reference,
  });
}

/** Admit a closed immutable registration set without scanning packages or manifests. */
export function createTrustedCalculatedSeriesCatalog(entries = []) {
  if (!Array.isArray(entries)) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_REGISTRATION_INVALID',
      'Trusted registrations must be an array.',
    );
  }
  const registrations = Object.freeze(entries.map(admit)
    .sort((left, right) => left.key.localeCompare(right.key)));
  if (new Set(registrations.map(({ key: identity }) => identity)).size !== registrations.length) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_REGISTRATION_DUPLICATE',
      'Trusted Definition registration identity is duplicated.',
    );
  }
  const byKey = new Map(registrations.map((registration) => [registration.key, registration]));
  return Object.freeze({
    definitions: Object.freeze(registrations.map(({ definition }) => definition)),
    list: () => registrations,
    resolve(reference) { return byKey.get(key(reference)) ?? null; },
  });
}

export function calculatedSeriesRegistrationKey(reference) { return key(reference); }
