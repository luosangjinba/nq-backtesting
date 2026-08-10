import { failSemanticPackage } from './semantic-package-error.js';
import { exactRecord, portableValue } from './portable-value.js';
import { readSemanticTypeDefinition } from './semantic-type-definition.js';

const PACKAGE_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const CAPABILITY = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const VERSION = /^\d+\.\d+\.\d+$/;

class SemanticPackageManifestValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function capabilityList(values, label) {
  if (!Array.isArray(values) || values.some((value) => (
    typeof value !== 'string' || !CAPABILITY.test(value)
  )) || new Set(values).size !== values.length) {
    failSemanticPackage('SEMANTIC_PACKAGE_CAPABILITIES_INVALID', `${label} are invalid.`);
  }
  return Object.freeze([...values].sort());
}

/** Define one trusted-build package manifest for host-owned lifecycle. */
export function defineSemanticPackage(value = {}) {
  exactRecord(
    value,
    [
      'activate', 'geometryDependencies', 'hostContractVersion', 'packageId',
      'packageVersion', 'requiredCapabilities', 'semanticTypes', 'toolDescriptors',
    ],
    'SEMANTIC_PACKAGE_MANIFEST_INVALID',
    'Semantic package manifest',
  );
  if (typeof value.packageId !== 'string' || !PACKAGE_ID.test(value.packageId)
    || typeof value.packageVersion !== 'string' || !VERSION.test(value.packageVersion)
    || typeof value.hostContractVersion !== 'string' || !VERSION.test(value.hostContractVersion)
    || typeof value.activate !== 'function' || !Array.isArray(value.semanticTypes)
    || value.semanticTypes.length === 0) {
    failSemanticPackage('SEMANTIC_PACKAGE_MANIFEST_INVALID', 'Semantic package manifest is invalid.');
  }
  const semanticTypes = Object.freeze(value.semanticTypes.map(readSemanticTypeDefinition));
  const keys = semanticTypes.map(({ typeId, version }) => `${typeId}@${version}`);
  if (new Set(keys).size !== keys.length) {
    failSemanticPackage('SEMANTIC_PACKAGE_TYPE_DUPLICATE', 'Package Semantic type ids must be unique.');
  }
  return new SemanticPackageManifestValue(Object.freeze({
    activate: value.activate,
    geometryDependencies: capabilityList(value.geometryDependencies, 'Geometry dependencies'),
    hostContractVersion: value.hostContractVersion,
    packageId: value.packageId,
    packageVersion: value.packageVersion,
    requiredCapabilities: capabilityList(value.requiredCapabilities, 'Required capabilities'),
    semanticTypes,
    toolDescriptors: portableValue(value.toolDescriptors, 'toolDescriptors'),
  }));
}

export function readSemanticPackageManifest(candidate) {
  if (!(candidate instanceof SemanticPackageManifestValue)) {
    failSemanticPackage(
      'SEMANTIC_PACKAGE_MANIFEST_REQUIRED',
      'A branded Semantic package manifest is required.',
    );
  }
  return candidate.read();
}
