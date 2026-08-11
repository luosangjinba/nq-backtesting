import {
  boundedText,
  contractId,
  exactRecord,
} from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';
import { normalizePluginParameterSchemaWire } from './plugin-parameter-schema.js';
import { pluginVersion, pluginVersionRange } from './semantic-version.js';

const CONTRIBUTION_KINDS = new Set([
  'drawing', 'indicator', 'semantic-type', 'tool', 'workflow',
]);

class BuiltInPluginManifestValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function normalizeProvidedCapability(value) {
  exactRecord(
    value,
    ['id', 'version'],
    'PLUGIN_MANIFEST_INVALID',
    'Provided capability',
  );
  return Object.freeze({
    id: contractId(value.id, 'Provided capability id'),
    version: pluginVersion(value.version, 'Provided capability version'),
  });
}

function normalizeCapabilityDependency(value, label) {
  exactRecord(value, ['id', 'range'], 'PLUGIN_MANIFEST_INVALID', label);
  return Object.freeze({
    id: contractId(value.id, `${label} id`),
    range: pluginVersionRange(value.range, `${label} range`),
  });
}

function uniqueById(values, label) {
  if (new Set(values.map(({ id }) => id)).size !== values.length) {
    failPluginContract('PLUGIN_MANIFEST_INVALID', `${label} ids must be unique.`);
  }
  return Object.freeze([...values].sort((left, right) => left.id.localeCompare(right.id)));
}

function normalizeCapabilities(value) {
  exactRecord(
    value,
    ['extends', 'provides', 'requires'],
    'PLUGIN_MANIFEST_INVALID',
    'Plugin capabilities',
  );
  for (const field of ['extends', 'provides', 'requires']) {
    if (!Array.isArray(value[field]) || value[field].length > 64) {
      failPluginContract('PLUGIN_MANIFEST_INVALID', `Plugin ${field} capabilities are invalid.`);
    }
  }
  return Object.freeze({
    extends: uniqueById(
      value.extends.map((entry) => normalizeCapabilityDependency(entry, 'Extended capability')),
      'Extended capability',
    ),
    provides: uniqueById(value.provides.map(normalizeProvidedCapability), 'Provided capability'),
    requires: uniqueById(
      value.requires.map((entry) => normalizeCapabilityDependency(entry, 'Required capability')),
      'Required capability',
    ),
  });
}

function normalizeContribution(value) {
  exactRecord(
    value,
    ['displayName', 'id', 'kind', 'parameters', 'version'],
    'PLUGIN_MANIFEST_INVALID',
    'Plugin contribution',
  );
  if (!CONTRIBUTION_KINDS.has(value.kind)) {
    failPluginContract('PLUGIN_MANIFEST_INVALID', 'Plugin contribution kind is invalid.');
  }
  return Object.freeze({
    displayName: boundedText(value.displayName, 'Contribution display name', { max: 96 }),
    id: contractId(value.id, 'Contribution id'),
    kind: value.kind,
    parameters: value.parameters === null
      ? null : normalizePluginParameterSchemaWire(value.parameters),
    version: pluginVersion(value.version, 'Contribution version'),
  });
}

function normalizeDistribution(value) {
  exactRecord(
    value,
    ['publisherId', 'source', 'tier', 'trust'],
    'PLUGIN_MANIFEST_INVALID',
    'Plugin distribution',
  );
  if (value.tier !== 'core' || value.source !== 'built-in' || value.trust !== 'first-party') {
    failPluginContract(
      'PLUGIN_DISTRIBUTION_UNAUTHORIZED',
      'P0a accepts only first-party built-in Core packages.',
    );
  }
  return Object.freeze({
    publisherId: contractId(value.publisherId, 'Publisher id'),
    source: 'built-in',
    tier: 'core',
    trust: 'first-party',
  });
}

function normalizeManifest(value) {
  exactRecord(
    value,
    [
      'capabilities', 'conformance', 'contributions', 'display', 'distribution',
      'hostApiRange', 'manifestVersion', 'module', 'packageId', 'packageVersion',
      'permissions',
    ],
    'PLUGIN_MANIFEST_INVALID',
    'Built-in plugin manifest',
  );
  if (value.manifestVersion !== 1 || !Array.isArray(value.contributions)
    || value.contributions.length < 1 || value.contributions.length > 64
    || !Array.isArray(value.permissions)) {
    failPluginContract('PLUGIN_MANIFEST_INVALID', 'Built-in plugin manifest is invalid.');
  }
  if (value.permissions.length !== 0) {
    failPluginContract('PLUGIN_PERMISSION_UNAUTHORIZED', 'P0a package permissions must be empty.');
  }
  exactRecord(value.module, ['id', 'version'], 'PLUGIN_MANIFEST_INVALID', 'Plugin module');
  exactRecord(value.display, ['description', 'name'], 'PLUGIN_MANIFEST_INVALID', 'Plugin display');
  exactRecord(value.conformance, ['harness'], 'PLUGIN_MANIFEST_INVALID', 'Plugin conformance');
  if (typeof value.conformance.harness !== 'string'
    || !/^tests\/[a-z0-9-]+-harness\.js$/.test(value.conformance.harness)) {
    failPluginContract('PLUGIN_MANIFEST_INVALID', 'Plugin conformance Harness is invalid.');
  }
  const capabilities = normalizeCapabilities(value.capabilities);
  const contributions = uniqueById(value.contributions.map(normalizeContribution), 'Contribution');
  const provided = new Map(capabilities.provides.map((entry) => [entry.id, entry.version]));
  if (contributions.some(({ id, version }) => provided.get(id) !== version)) {
    failPluginContract(
      'PLUGIN_MANIFEST_INVALID',
      'Every contribution must publish a matching versioned capability.',
    );
  }
  return Object.freeze({
    capabilities,
    conformance: Object.freeze({ harness: value.conformance.harness }),
    contributions,
    display: Object.freeze({
      description: boundedText(value.display.description, 'Plugin description', { max: 320 }),
      name: boundedText(value.display.name, 'Plugin name', { max: 96 }),
    }),
    distribution: normalizeDistribution(value.distribution),
    hostApiRange: pluginVersionRange(value.hostApiRange, 'Host API range'),
    manifestVersion: 1,
    module: Object.freeze({
      id: contractId(value.module.id, 'Plugin module id'),
      version: pluginVersion(value.module.version, 'Plugin module version'),
    }),
    packageId: contractId(value.packageId, 'Plugin package id'),
    packageVersion: pluginVersion(value.packageVersion, 'Plugin package version'),
    permissions: Object.freeze([]),
  });
}

/** Define one trusted-build Core Plugin manifest without loading or executing package code. */
export function defineBuiltInPluginManifest(value = {}) {
  return new BuiltInPluginManifestValue(normalizeManifest(value));
}

/** Read one branded built-in manifest as a deeply frozen portable record. */
export function readBuiltInPluginManifest(candidate) {
  if (!(candidate instanceof BuiltInPluginManifestValue)) {
    failPluginContract('PLUGIN_MANIFEST_REQUIRED', 'A branded built-in plugin manifest is required.');
  }
  return candidate.read();
}
