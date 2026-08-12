import { exactRecord } from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';
import { readLocalPluginPackageCandidatePlan } from './local-plugin-package-plan.js';
import { comparePluginVersions, pluginVersion } from './semantic-version.js';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;

class LocalPluginPackageChangePreparationValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function currentGeneration(value, packageId) {
  if (value === null) return null;
  exactRecord(
    value,
    ['candidateDigest', 'generationId', 'packageId', 'packageVersion', 'settingsSchemaVersion'],
    'PLUGIN_LOCAL_PACKAGE_CHANGE_INVALID',
    'Current local package generation',
  );
  if (value.packageId !== packageId || !DIGEST.test(value.candidateDigest)
    || !DIGEST.test(value.generationId) || !Number.isSafeInteger(value.settingsSchemaVersion)
    || value.settingsSchemaVersion < 1) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_CHANGE_INVALID', 'Current local package generation is invalid.');
  }
  return Object.freeze({
    candidateDigest: value.candidateDigest,
    generationId: value.generationId,
    packageId: value.packageId,
    packageVersion: pluginVersion(value.packageVersion, 'Current package version'),
    settingsSchemaVersion: value.settingsSchemaVersion,
  });
}

function operationFor(candidate, current) {
  if (current === null) return 'install';
  if (candidate.candidateDigest === current.candidateDigest) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_ALREADY_INSTALLED', 'The exact candidate generation is already installed.');
  }
  const comparison = comparePluginVersions(candidate.packageVersion, current.packageVersion);
  if (comparison > 0) return 'upgrade';
  if (comparison < 0) return 'downgrade';
  return 'replacement';
}

/** Prepare one exact install/upgrade/downgrade/replacement impact without writing inventory. */
export function prepareLocalPluginPackageChange(candidateValue, {
  current = null,
  inventoryRevision,
} = {}) {
  const candidate = readLocalPluginPackageCandidatePlan(candidateValue);
  if (!Number.isSafeInteger(inventoryRevision) || inventoryRevision < 0
    || candidate.source.kind !== 'local-archive' || candidate.installCandidateEligible !== true) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_CHANGE_INVALID', 'Local package change input is invalid.');
  }
  const prior = currentGeneration(current, candidate.packageId);
  const operation = operationFor(candidate, prior);
  const migrationDirection = prior === null || prior.settingsSchemaVersion === candidate.persistence.schemaVersion
    ? 'none'
    : prior.settingsSchemaVersion < candidate.persistence.schemaVersion ? 'forward' : 'blocked-downgrade';
  const reviews = new Set(candidate.requiredReviews);
  reviews.add(`${operation}-local-package`);
  if (operation === 'replacement') reviews.add('same-version-source-substitution');
  if (operation === 'downgrade') reviews.add('explicit-downgrade');
  const confirmationId = [
    'local-package', `r${inventoryRevision}`, operation, candidate.packageId,
    candidate.packageVersion, candidate.candidateDigest,
  ].join(':');
  return new LocalPluginPackageChangePreparationValue(Object.freeze({
    baseRevision: inventoryRevision,
    candidateDigest: candidate.candidateDigest,
    confirmationId,
    migration: Object.freeze({
      direction: migrationDirection,
      fromSchemaVersion: prior?.settingsSchemaVersion ?? null,
      toSchemaVersion: candidate.persistence.schemaVersion,
    }),
    operation,
    packageId: candidate.packageId,
    packageVersion: candidate.packageVersion,
    priorGeneration: prior,
    requiredReviews: Object.freeze([...reviews].sort()),
    retention: candidate.persistence.retention,
    source: candidate.source,
    stateAfterCommit: 'installed-inactive',
  }));
}

/** Read one branded local-package change preparation for owner-side CAS and confirmation. */
export function readLocalPluginPackageChangePreparation(candidate) {
  if (!(candidate instanceof LocalPluginPackageChangePreparationValue)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_CHANGE_REQUIRED', 'A branded local package change preparation is required.');
  }
  return candidate.read();
}
