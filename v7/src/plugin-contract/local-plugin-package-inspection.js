import {
  createLocalPluginPackageCandidatePlan,
  readLocalPluginPackageCandidatePlan,
} from './local-plugin-package-plan.js';
import {
  defineLocalPluginPackageManifest,
  readLocalPluginPackageManifest,
} from './local-plugin-package-manifest.js';
import { failPluginContract } from './plugin-contract-error.js';
import {
  encodeLocalPluginArchive,
  LOCAL_PLUGIN_ARCHIVE,
  normalizeLocalPluginArchiveEntries,
  parseLocalPluginArchive,
} from './local-plugin-package-archive.js';
import {
  canonicalLocalPluginPackageJson,
  digestLocalPluginPackageValue,
  sha256LocalPluginPackageBytes,
} from './local-plugin-package-digest.js';
import {
  LOCAL_PLUGIN_UNAVAILABLE_CLAIMS,
  localPluginPackageCompatibility,
  verifyLocalDeveloperEvidenceReceipt,
  verifyLocalPackageCandidateReceipt,
} from './local-plugin-package-receipts.js';

const PROFILE = 'local-declarative-package-v1';
const REQUIRED_PATHS = Object.freeze([
  'content-index.json',
  'provenance/source-disclosure.json',
  'receipts/developer-kit.json',
  'receipts/package-candidate.json',
  'v7-package.json',
]);
const NESTED_ARCHIVE = /\.(?:7z|gz|rar|tar|tgz|v7dk\.tar|v7plugin|zip)$/iu;
const AUTHORING_SOURCE = /^[a-z][a-z0-9.-]{0,159}$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const UTF8_FATAL = new TextDecoder('utf-8', { fatal: true });

function fail(code, message, logicalPath) {
  const suffix = logicalPath === undefined ? '' : ` (${logicalPath})`;
  failPluginContract(code, `${message}${suffix}`);
}

function same(left, right) {
  return canonicalLocalPluginPackageJson(left) === canonicalLocalPluginPackageJson(right);
}

function bytesEqual(left, right) {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function exactFields(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...fields].sort().join(',');
}

function requireRelease(release) {
  const identities = [
    'catalogDigest', 'operationDigest', 'schemaDigest', 'sdkDigest',
    'simulatorDigest', 'toolchainDigest',
  ];
  if (!release || typeof release !== 'object' || !release.compiler || !release.conformance
    || !release.toolchain || release.toolchain.hostApiVersion !== '1.0.0'
    || release.toolchain.sdkVersion !== '1.0.0'
    || identities.some((key) => !DIGEST.test(release[key]))) {
    fail('V7DK_INTERNAL_TOOLCHAIN', 'Current local package release identity is unavailable.');
  }
  return release;
}

function parseCanonicalJson(map, logicalPath) {
  const bytes = map.get(logicalPath);
  if (!bytes) fail('V7DK_PACKAGE_LAYOUT_INVALID', 'Required package metadata is missing.', logicalPath);
  try {
    const text = UTF8_FATAL.decode(bytes);
    const value = JSON.parse(text);
    const expected = new TextEncoder().encode(`${canonicalLocalPluginPackageJson(value)}\n`);
    if (!bytesEqual(bytes, expected)) throw new TypeError('non-canonical');
    return value;
  } catch {
    fail('V7DK_PACKAGE_FORMAT_MISMATCH', 'Package metadata is malformed or non-canonical.', logicalPath);
  }
}

function hasMagic(bytes) {
  const starts = (magic) => magic.every((byte, index) => bytes[index] === byte);
  return starts([0x50, 0x4b, 0x03, 0x04])
    || starts([0x50, 0x4b, 0x05, 0x06]) || starts([0x50, 0x4b, 0x07, 0x08])
    || starts([0x1f, 0x8b]) || starts([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])
    || starts([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])
    || [0x75, 0x73, 0x74, 0x61, 0x72].every((byte, index) => bytes[257 + index] === byte);
}

function validateIndexShape(index) {
  const fields = [
    'archiveFormatVersion', 'contentDigest', 'files', 'packageId',
    'packageVersion', 'payloadDigest', 'schemaVersion',
  ];
  if (!exactFields(index, fields) || index.schemaVersion !== 1
    || index.archiveFormatVersion !== LOCAL_PLUGIN_ARCHIVE.version
    || !Array.isArray(index.files) || index.files.length < 5
    || index.files.some((record) => !exactFields(record, ['path', 'sha256', 'size'])
      || typeof record.path !== 'string' || !/^[0-9a-f]{64}$/u.test(record.sha256)
      || !Number.isSafeInteger(record.size) || record.size < 0)) {
    fail('V7DK_PACKAGE_INDEX_INVALID', 'Local package content index is invalid.');
  }
}

async function validateIndexedEntries(entries, index, map, cryptoPort) {
  validateIndexShape(index);
  const indexedPaths = index.files.map(({ path }) => path);
  if (new Set(indexedPaths).size !== indexedPaths.length
    || !same(indexedPaths, [...indexedPaths].sort())
    || !indexedPaths.some((logicalPath) => logicalPath.startsWith('payload/build/'))) {
    fail('V7DK_PACKAGE_INDEX_INVALID', 'Content index paths must be unique, sorted, and include build payload.');
  }
  const expectedPaths = [...indexedPaths, 'content-index.json', 'receipts/package-candidate.json'].sort();
  const actualPaths = entries.map(({ path }) => path).sort();
  if (!same(expectedPaths, actualPaths)
    || REQUIRED_PATHS.some((logicalPath) => !actualPaths.includes(logicalPath))) {
    fail('V7DK_PACKAGE_LAYOUT_INVALID', 'Package contains an undeclared or missing entry.');
  }
  for (const record of index.files) {
    const bytes = map.get(record.path);
    if (!bytes || record.size !== bytes.length
      || record.sha256 !== await sha256LocalPluginPackageBytes(bytes, cryptoPort)) {
      fail('V7DK_INTEGRITY_MISMATCH', 'Package content index detects changed bytes.', record.path);
    }
  }
  const contentDigest = await digestLocalPluginPackageValue(index.files, cryptoPort);
  const payloadDigest = await digestLocalPluginPackageValue(
    index.files.filter(({ path }) => path.startsWith('payload/')),
    cryptoPort,
  );
  if (index.contentDigest !== contentDigest || index.payloadDigest !== payloadDigest) {
    fail('V7DK_INTEGRITY_MISMATCH', 'Package content or payload digest is stale.');
  }
  if (indexedPaths.some((logicalPath) => logicalPath.startsWith('payload/')
    && (NESTED_ARCHIVE.test(logicalPath) || hasMagic(map.get(logicalPath))))) {
    fail('V7DK_PACKAGE_LAYOUT_INVALID', 'Nested archive payloads are unavailable in this profile.');
  }
}

async function evidenceMatchesIndex(developerEvidence, index, cryptoPort) {
  const buildRecords = await Promise.all(index.files
    .filter(({ path }) => path.startsWith('payload/build/'))
    .map(async ({ path, sha256, size }) => ({
      logicalPath: path.replace(/^payload\//u, ''), sha256, size,
    })));
  const buildDigest = await digestLocalPluginPackageValue(buildRecords, cryptoPort);
  const workspaceFields = [
    'expectedDigest', 'fixtureDigest', 'manifestDigest', 'sourceDigest', 'workspaceDigest',
  ];
  return Object.values(developerEvidence.receipts ?? {}).every((receipt) => (
    workspaceFields.every((field) => receipt.content?.[field] === developerEvidence.workspace?.[field])
    && receipt.content?.buildDigest === buildDigest
  ));
}

async function requireReceiptBindings({
  candidateReceipt, developerEvidence, index, manifest, release, cryptoPort,
}) {
  const evidenceValid = await verifyLocalDeveloperEvidenceReceipt(
    developerEvidence, release, cryptoPort,
  );
  const candidateValid = await verifyLocalPackageCandidateReceipt(
    candidateReceipt, release, cryptoPort,
  );
  const evidenceBound = await evidenceMatchesIndex(developerEvidence, index, cryptoPort);
  const manifestDigest = await digestLocalPluginPackageValue(manifest, cryptoPort);
  const indexDigest = await digestLocalPluginPackageValue(index, cryptoPort);
  const receiptDigests = Object.values(developerEvidence.receipts).map(({ digest }) => digest).sort();
  if (!evidenceValid || !candidateValid || !evidenceBound
    || manifest.packageId !== index.packageId || manifest.packageVersion !== index.packageVersion
    || candidateReceipt.packageId !== manifest.packageId
    || candidateReceipt.packageVersion !== manifest.packageVersion
    || candidateReceipt.identities.manifest !== manifestDigest
    || candidateReceipt.identities.contentIndex !== indexDigest
    || candidateReceipt.identities.payload !== index.payloadDigest
    || developerEvidence.packageId !== manifest.packageId
    || developerEvidence.packageVersion !== manifest.packageVersion
    || !same(candidateReceipt.identities.workspace, developerEvidence.workspace)
    || !same(candidateReceipt.developerReceiptDigests, receiptDigests)
    || !same(manifest.conformance.requiredReceiptDigests, receiptDigests)
    || manifest.conformance.toolchainDigest !== release.toolchainDigest) {
    fail('V7DK_PACKAGE_RECEIPT_STALE', 'Package receipts are forged, stale, or bound to different content.');
  }
}

function requireDecisionBindings(candidateReceipt, manifest, release) {
  if (!same(candidateReceipt.settings, manifest.settings)
    || !same(candidateReceipt.migrations, manifest.persistence.migrations)
    || candidateReceipt.permissions.length !== 0
    || !same(candidateReceipt.unavailableClaims, LOCAL_PLUGIN_UNAVAILABLE_CLAIMS)
    || !same(candidateReceipt.compatibility, localPluginPackageCompatibility(release))) {
    fail('V7DK_PACKAGE_RECEIPT_STALE', 'Candidate receipt decisions do not match the validated package.');
  }
}

function requireDisclosure(map, manifest, index) {
  if (!map.has(manifest.license.noticePath)
    || index.files.filter(({ path }) => !path.startsWith('payload/')).some(({ path }) => (
      ![
        'v7-package.json', 'provenance/source-disclosure.json',
        'receipts/developer-kit.json', manifest.license.noticePath,
      ].includes(path)
    ))) {
    fail('V7DK_PACKAGE_LAYOUT_INVALID', 'Package notice or metadata layout is invalid.');
  }
  const disclosure = parseCanonicalJson(map, 'provenance/source-disclosure.json');
  const fields = [
    'absolutePathsIncluded', 'authoringSource', 'credentialsIncluded', 'license',
    'networkDerived', 'packageId', 'payloadExecutionAuthorized',
    'publisherVerification', 'schemaVersion', 'sourceIncluded',
  ];
  if (!exactFields(disclosure, fields) || disclosure.schemaVersion !== 1
    || disclosure.packageId !== manifest.packageId
    || disclosure.license !== manifest.license.expression
    || disclosure.credentialsIncluded !== false || disclosure.sourceIncluded !== false
    || disclosure.absolutePathsIncluded !== false || disclosure.payloadExecutionAuthorized !== false
    || disclosure.publisherVerification !== 'self-asserted'
    || typeof disclosure.networkDerived !== 'boolean'
    || !AUTHORING_SOURCE.test(disclosure.authoringSource)) {
    fail('V7DK_PACKAGE_PROVENANCE_INVALID', 'Package source disclosure increases authority or mismatches the manifest.');
  }
}

async function snapshotDigest(entries, cryptoPort) {
  const records = await Promise.all([...entries].sort((left, right) => (
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  )).map(async ({ bytes, path }) => ({
    path,
    sha256: await sha256LocalPluginPackageBytes(bytes, cryptoPort),
    size: bytes.length,
  })));
  return digestLocalPluginPackageValue(records, cryptoPort);
}

function brandedCandidate(manifest, candidateReceipt, index, release, digest, sourceKind) {
  try {
    return createLocalPluginPackageCandidatePlan(manifest, {
      candidateDigest: candidateReceipt.digest,
      contentDigest: index.contentDigest,
      hostApiVersion: release.toolchain.hostApiVersion,
      manifestDigest: candidateReceipt.identities.manifest,
      source: { digest, kind: sourceKind },
    });
  } catch (cause) {
    fail(
      cause?.code === 'PLUGIN_LOCAL_PACKAGE_HOST_INCOMPATIBLE'
        ? 'V7DK_HOST_INCOMPATIBLE' : 'V7DK_PACKAGE_RECEIPT_STALE',
      'Local package cannot form a compatible inactive candidate.',
    );
  }
}

/** Inspect one exact prepared candidate snapshot without retaining handles or evaluating payload. */
export async function inspectLocalPluginPackageEntries(entries, {
  cryptoPort = globalThis.crypto,
  release,
  sourceKind = 'developer-unpacked',
} = {}) {
  const currentRelease = requireRelease(release);
  if (sourceKind !== 'developer-unpacked') {
    fail('V7DK_PACKAGE_FORMAT_MISMATCH', 'Entry inspection requires a prepared Developer Mode candidate.');
  }
  const values = normalizeLocalPluginArchiveEntries(entries);
  const map = new Map(values.map(({ bytes, path }) => [path, bytes]));
  if (map.has('v7dk.bundle.json') || map.has('v7dk.index.json')) {
    fail('V7DK_PACKAGE_FORMAT_MISMATCH', 'A P1a evidence bundle is not a local package candidate.');
  }
  const index = parseCanonicalJson(map, 'content-index.json');
  await validateIndexedEntries(values, index, map, cryptoPort);
  const manifestWire = parseCanonicalJson(map, 'v7-package.json');
  let manifest;
  try {
    manifest = defineLocalPluginPackageManifest(manifestWire);
    if (!same(manifestWire, readLocalPluginPackageManifest(manifest))) throw new TypeError('non-canonical');
  } catch (cause) {
    fail('V7DK_MANIFEST_INVALID', `Package Manifest V2 is invalid${cause?.code ? `: ${cause.code}` : ''}.`);
  }
  const manifestValue = readLocalPluginPackageManifest(manifest);
  const developerEvidence = parseCanonicalJson(map, 'receipts/developer-kit.json');
  const candidateReceipt = parseCanonicalJson(map, 'receipts/package-candidate.json');
  await requireReceiptBindings({
    candidateReceipt, cryptoPort, developerEvidence, index,
    manifest: manifestValue, release: currentRelease,
  });
  requireDecisionBindings(candidateReceipt, manifestValue, currentRelease);
  requireDisclosure(map, manifestValue, index);
  const digest = await snapshotDigest(values, cryptoPort);
  const candidate = brandedCandidate(
    manifest, candidateReceipt, index, currentRelease, digest, sourceKind,
  );
  return Object.freeze({
    candidate,
    entries: Object.freeze(values),
    manifest,
    summary: Object.freeze({
      entryCount: values.length,
      manifest: manifestValue,
      packageCandidate: readLocalPluginPackageCandidatePlan(candidate),
      snapshotDigest: digest,
    }),
  });
}

/** Inspect one bounded `.v7plugin` byte snapshot and produce branded store inputs. */
export async function inspectLocalPluginPackageArchive(bytes, {
  cryptoPort = globalThis.crypto,
  release,
} = {}) {
  const archiveBytes = new Uint8Array(bytes);
  const entries = parseLocalPluginArchive(archiveBytes);
  const unpacked = await inspectLocalPluginPackageEntries(entries, {
    cryptoPort, release, sourceKind: 'developer-unpacked',
  });
  const archiveDigest = `sha256:${await sha256LocalPluginPackageBytes(archiveBytes, cryptoPort)}`;
  const candidate = brandedCandidate(
    unpacked.manifest,
    parseCanonicalJson(new Map(entries.map(({ bytes: data, path }) => [path, data])), 'receipts/package-candidate.json'),
    parseCanonicalJson(new Map(entries.map(({ bytes: data, path }) => [path, data])), 'content-index.json'),
    requireRelease(release),
    archiveDigest,
    'local-archive',
  );
  return Object.freeze({
    archiveBytes,
    candidate,
    manifest: unpacked.manifest,
    summary: Object.freeze({
      ...unpacked.summary,
      archiveDigest,
      mediaType: LOCAL_PLUGIN_ARCHIVE.mediaType,
      packageCandidate: readLocalPluginPackageCandidatePlan(candidate),
    }),
  });
}

/** Encode one already-inspected prepared candidate as deterministic `.v7plugin` bytes. */
export function packLocalPluginPackageEntries(entries) {
  return encodeLocalPluginArchive(entries);
}
