import { exactRecord } from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';
import {
  LOCAL_PLUGIN_CONTRACT_PROFILE,
  readLocalPluginPackageManifest,
} from './local-plugin-package-manifest.js';
import { pluginVersion, pluginVersionSatisfies } from './semantic-version.js';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const SOURCE_TRUST = Object.freeze({
  'developer-unpacked': 'developer-local',
  'local-archive': 'unverified-local',
});

class LocalPluginPackageCandidatePlanValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function digest(value, label) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_PLAN_INVALID', `${label} is invalid.`);
  }
  return value;
}

function normalizeInput(value) {
  exactRecord(
    value,
    ['candidateDigest', 'contentDigest', 'hostApiVersion', 'manifestDigest', 'source'],
    'PLUGIN_LOCAL_PACKAGE_PLAN_INVALID',
    'Local package candidate input',
  );
  exactRecord(
    value.source,
    ['digest', 'kind'],
    'PLUGIN_LOCAL_PACKAGE_PLAN_INVALID',
    'Local package candidate source',
  );
  if (!Object.hasOwn(SOURCE_TRUST, value.source.kind)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_PLAN_INVALID', 'Local package source kind is invalid.');
  }
  return Object.freeze({
    candidateDigest: digest(value.candidateDigest, 'Candidate digest'),
    contentDigest: digest(value.contentDigest, 'Content digest'),
    hostApiVersion: pluginVersion(value.hostApiVersion, 'Host API version'),
    manifestDigest: digest(value.manifestDigest, 'Manifest digest'),
    source: Object.freeze({
      digest: digest(value.source.digest, 'Source digest'),
      kind: value.source.kind,
    }),
  });
}

/** Plan one non-executing local candidate without creating storage, lifecycle, or module authority. */
export function createLocalPluginPackageCandidatePlan(manifestCandidate, input = {}) {
  const manifest = readLocalPluginPackageManifest(manifestCandidate);
  const normalized = normalizeInput(input);
  if (manifest.conformance.requiredReceiptDigests.length !== 3) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_RECEIPT_REQUIRED', 'Candidate planning requires exact build, test, and preview receipts.');
  }
  if (!pluginVersionSatisfies(normalized.hostApiVersion, manifest.hostApiRange)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_HOST_INCOMPATIBLE', 'Local package is incompatible with the host API.');
  }
  const value = Object.freeze({
    activated: false,
    automaticUpdate: false,
    candidateDigest: normalized.candidateDigest,
    compatibility: Object.freeze({
      hostApiVersion: normalized.hostApiVersion,
      profile: LOCAL_PLUGIN_CONTRACT_PROFILE,
      status: 'compatible',
    }),
    contentDigest: normalized.contentDigest,
    dependencyImpact: Object.freeze({ extends: Object.freeze([]), provides: Object.freeze([]), requires: Object.freeze([]) }),
    installCandidateEligible: true,
    installed: false,
    manifestDigest: normalized.manifestDigest,
    packageId: manifest.packageId,
    packageVersion: manifest.packageVersion,
    permissions: Object.freeze([]),
    persistence: manifest.persistence,
    productionExecutionAuthorized: false,
    publisher: Object.freeze({ ...manifest.publisher, verification: 'self-asserted' }),
    publisherTrusted: false,
    requiredReviews: Object.freeze([
      'local-source-unverified',
      'package-remains-inactive',
      'preserve-package-data-on-uninstall',
    ]),
    settings: manifest.settings,
    source: Object.freeze({
      automaticUpdate: false,
      digest: normalized.source.digest,
      kind: normalized.source.kind,
      publisherVerification: 'self-asserted',
      signature: 'not-applicable',
      trust: SOURCE_TRUST[normalized.source.kind],
    }),
    state: 'candidate',
    unavailableClaims: Object.freeze([
      'activation', 'custom-surface', 'drawing', 'indicator', 'network',
      'semantic-type', 'tool', 'worker', 'workflow',
    ]),
  });
  return new LocalPluginPackageCandidatePlanValue(value);
}

/** Read one branded inactive local candidate plan as a deeply frozen portable value. */
export function readLocalPluginPackageCandidatePlan(candidate) {
  if (!(candidate instanceof LocalPluginPackageCandidatePlanValue)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_PLAN_REQUIRED', 'A branded local package candidate plan is required.');
  }
  return candidate.read();
}
