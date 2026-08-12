import fs from 'node:fs';
import path from 'node:path';
import {
  defineLocalPluginPackageManifest,
  finalizeLocalPluginPackageManifest,
  readLocalPluginPackageManifest,
} from '../../../src/plugin-contract/public.js';
import { compareText, digestValue, sha256Bytes } from '../domain/canonical-json.js';
import { LOCAL_ARCHIVE, LOCAL_CONTRACT_PROFILE } from '../domain/contract.js';
import { fail } from '../domain/diagnostic.js';
import {
  createLocalDeveloperEvidenceReceipt,
  createLocalPackageCandidateReceipt,
} from '../domain/local-package-receipt.js';
import { verifyReceipt } from '../domain/receipt.js';
import { inspectLocalPackageBytes, inspectLocalPackageEntries } from './local-package-inspection.js';
import {
  readOutputJson,
  replaceOwnedDirectory,
  writeOutputFile,
} from './output-io.js';
import { encodeTar, jsonEntry, MAX_TAR_BYTES } from './tar.js';
import { readLogicalPath } from './workspace-io.js';

export { inspectLocalPackageBytes, inspectLocalPackageEntries } from './local-package-inspection.js';

const AUTHORING_SOURCE = /^[a-z][a-z0-9.-]{0,159}$/u;

function regularBytes(root, logicalPath, phase = 'pack') {
  const target = path.resolve(root, ...logicalPath.split('/'));
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) {
    fail('candidate', 'V7DK_PACKAGE_PATH_INVALID', phase, 'Local package source path escapes its root.', { logicalPath });
  }
  let stats;
  try { stats = fs.lstatSync(target); } catch {
    fail('candidate', 'V7DK_STALE_OUTPUT', phase, 'Required local package source is missing.', { logicalPath });
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail('candidate', 'V7DK_PACKAGE_PATH_INVALID', phase, 'Local package sources must be regular files.', { logicalPath });
  }
  return fs.readFileSync(target);
}

function buildEntries(outputRoot) {
  const root = path.join(outputRoot, 'build');
  const entries = [];
  let rootStats;
  try { rootStats = fs.lstatSync(root); } catch {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'pack', 'Local package build directory is missing.');
  }
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    fail('candidate', 'V7DK_PACKAGE_PATH_INVALID', 'pack', 'Local package build root must be a real directory.');
  }
  function visit(directory, prefix = 'payload/build') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name))) {
      const logicalPath = `${prefix}/${entry.name}`;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target, logicalPath);
      else if (entry.isFile() && !entry.isSymbolicLink()
        && (logicalPath.endsWith('.js') || logicalPath.endsWith('.d.ts'))) {
        entries.push(Object.freeze({ bytes: fs.readFileSync(target), path: logicalPath }));
      } else {
        fail('candidate', 'V7DK_PACKAGE_LAYOUT_INVALID', 'pack', 'Build contains an undeclared package payload artifact.', {
          logicalPath,
        });
      }
    }
  }
  visit(root);
  if (entries.length < 1) fail('candidate', 'V7DK_STALE_OUTPUT', 'pack', 'Local package payload is missing.');
  return Object.freeze(entries);
}

function currentEvidence({ build, outputRoot, release, workspace }) {
  const receipts = {};
  for (const operation of ['build', 'test', 'preview']) {
    const receipt = readOutputJson(outputRoot, `receipts/${operation}.json`);
    if (!verifyReceipt(receipt) || receipt.operation !== operation
      || receipt.contractProfile !== LOCAL_CONTRACT_PROFILE
      || receipt.packageId !== workspace.manifest.packageId
      || receipt.packageVersion !== workspace.manifest.packageVersion
      || receipt.content.workspaceDigest !== workspace.content.workspaceDigest
      || receipt.identities.toolchain.digest !== release.toolchainDigest
      || receipt.content.buildDigest !== build.buildDigest) {
      fail('candidate', 'V7DK_PACKAGE_RECEIPT_STALE', 'pack', `${operation} receipt is forged, stale, or bound to different bytes.`);
    }
    if (operation !== 'build') {
      const state = readOutputJson(outputRoot, `state/${operation}-state.json`);
      if (!state || typeof state !== 'object' || Array.isArray(state)
        || Object.keys(state).sort().join(',')
          !== 'buildDigest,outputDigest,schemaVersion,toolchainDigest,workspaceDigest'
        || state.schemaVersion !== 1
        || state.workspaceDigest !== workspace.content.workspaceDigest
        || state.buildDigest !== build.buildDigest || state.toolchainDigest !== release.toolchainDigest
        || state.outputDigest !== receipt.content[`${operation}Digest`]) {
        fail('candidate', 'V7DK_PACKAGE_RECEIPT_STALE', 'pack', `${operation} state does not match its receipt.`);
      }
    }
    receipts[operation] = receipt;
  }
  return Object.freeze(receipts);
}

function sourceDisclosure(workspace) {
  let provenance;
  try { provenance = JSON.parse(regularBytes(workspace.root, 'provenance.json').toString('utf8')); } catch {
    fail('candidate', 'V7DK_PACKAGE_PROVENANCE_INVALID', 'pack', 'Local package provenance is missing or malformed.');
  }
  const fields = ['credentialsIncluded', 'license', 'networkDerived', 'packageId', 'productionExecutionAuthorized', 'schemaVersion', 'source'];
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)
    || Object.keys(provenance).sort().join(',') !== fields.sort().join(',')
    || provenance.schemaVersion !== 1 || provenance.packageId !== workspace.manifest.packageId
    || provenance.license !== workspace.manifest.license.expression
    || provenance.credentialsIncluded !== false || provenance.productionExecutionAuthorized !== false
    || typeof provenance.networkDerived !== 'boolean' || typeof provenance.source !== 'string'
    || !AUTHORING_SOURCE.test(provenance.source)) {
    fail('candidate', 'V7DK_PACKAGE_PROVENANCE_INVALID', 'pack', 'Local package provenance cannot increase source or execution authority.');
  }
  return Object.freeze({
    absolutePathsIncluded: false,
    authoringSource: provenance.source,
    credentialsIncluded: false,
    license: provenance.license,
    networkDerived: provenance.networkDerived,
    packageId: provenance.packageId,
    payloadExecutionAuthorized: false,
    publisherVerification: 'self-asserted',
    schemaVersion: 1,
    sourceIncluded: false,
  });
}

function contentIndex(entries, manifest) {
  const files = Object.freeze([...entries].sort((a, b) => compareText(a.path, b.path)).map((entry) => ({
    path: entry.path,
    sha256: sha256Bytes(entry.bytes),
    size: entry.bytes.length,
  })));
  const payload = files.filter(({ path: logicalPath }) => logicalPath.startsWith('payload/'));
  return Object.freeze({
    archiveFormatVersion: LOCAL_ARCHIVE.version,
    contentDigest: digestValue(files),
    files,
    packageId: manifest.packageId,
    packageVersion: manifest.packageVersion,
    payloadDigest: digestValue(payload),
    schemaVersion: 1,
  });
}

function canonicalEntries({ build, compatibility, outputRoot, release, workspace }) {
  const receipts = currentEvidence({ build, outputRoot, release, workspace });
  const finalizedValue = finalizeLocalPluginPackageManifest(
    defineLocalPluginPackageManifest(workspace.manifest),
    Object.values(receipts).map(({ digest }) => digest),
  );
  const manifest = readLocalPluginPackageManifest(finalizedValue);
  const developerEvidence = createLocalDeveloperEvidenceReceipt({ receipts, release, workspace });
  const noticePath = manifest.license.noticePath;
  const base = [
    jsonEntry('v7-package.json', manifest),
    jsonEntry('provenance/source-disclosure.json', sourceDisclosure(workspace)),
    jsonEntry('receipts/developer-kit.json', developerEvidence),
    Object.freeze({ bytes: regularBytes(workspace.root, noticePath), path: noticePath }),
    ...buildEntries(outputRoot),
  ];
  const index = contentIndex(base, manifest);
  const candidateReceipt = createLocalPackageCandidateReceipt({
    compatibility, contentIndex: index, developerEvidence, manifest, release, workspace,
  });
  const entries = Object.freeze([
    ...base,
    jsonEntry('content-index.json', index),
    jsonEntry('receipts/package-candidate.json', candidateReceipt),
  ].sort((a, b) => compareText(a.path, b.path)));
  const inspected = inspectLocalPackageEntries(entries, release);
  return Object.freeze({ candidateReceipt, entries, index, inspected, manifest });
}

function writeCandidateDirectory(outputRoot, packageName, entries) {
  const logicalRoot = `candidates/${packageName}`;
  replaceOwnedDirectory(outputRoot, logicalRoot);
  const artifacts = entries.map((entry) => writeOutputFile(outputRoot, `${logicalRoot}/${entry.path}`, entry.bytes));
  return Object.freeze({ artifacts: Object.freeze(artifacts), logicalRoot });
}

export function packLocalPackage({ build, compatibility, outputKind, outputRoot, release, workspace }) {
  const canonical = canonicalEntries({ build, compatibility, outputRoot, release, workspace });
  const packageName = `${canonical.manifest.packageId}-${canonical.manifest.packageVersion}`;
  if (outputKind === 'unpacked-local-candidate') {
    const written = writeCandidateDirectory(outputRoot, packageName, canonical.entries);
    return Object.freeze({
      artifact: Object.freeze({
        contentDigest: canonical.index.contentDigest,
        entryCount: canonical.entries.length,
        kind: 'unpacked-local-candidate',
        logicalPath: written.logicalRoot,
        packageCandidate: canonical.inspected.packageCandidate,
        snapshotDigest: canonical.inspected.snapshotDigest,
      }),
      candidateReceipt: canonical.candidateReceipt,
      contentDigest: canonical.index.contentDigest,
    });
  }
  const bytes = encodeTar(canonical.entries);
  const logicalPath = `packages/${packageName}${LOCAL_ARCHIVE.suffix}`;
  const artifact = writeOutputFile(outputRoot, logicalPath, bytes);
  const inspected = inspectLocalPackageBytes(bytes, release);
  return Object.freeze({
    artifact: Object.freeze({ ...artifact, kind: 'local-install-archive', mediaType: LOCAL_ARCHIVE.mediaType }),
    candidateReceipt: canonical.candidateReceipt,
    contentDigest: canonical.index.contentDigest,
    inspected,
  });
}

export function inspectLocalPackageAt(root, logicalPath, release) {
  const safePath = readLogicalPath(logicalPath, 'Local package path');
  if (!safePath.endsWith(LOCAL_ARCHIVE.suffix)) {
    fail('candidate', 'V7DK_PACKAGE_FORMAT_MISMATCH', 'inspect', 'Install archives must use the .v7plugin suffix.', {
      logicalPath: safePath,
    });
  }
  const resolvedRoot = path.resolve(root);
  let rootStats;
  try { rootStats = fs.lstatSync(resolvedRoot); } catch {
    fail('candidate', 'V7DK_PACKAGE_PATH_INVALID', 'inspect', 'Local package root is missing.');
  }
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    fail('candidate', 'V7DK_PACKAGE_PATH_INVALID', 'inspect', 'Local package root must be a real directory.');
  }
  let target = resolvedRoot;
  for (const segment of safePath.split('/')) {
    target = path.join(target, segment);
    let segmentStats;
    try { segmentStats = fs.lstatSync(target); } catch {
      fail('candidate', 'V7DK_PACKAGE_FORMAT_MISMATCH', 'inspect', 'Local package archive is missing.', { logicalPath: safePath });
    }
    if (segmentStats.isSymbolicLink()) {
      fail('candidate', 'V7DK_PACKAGE_PATH_INVALID', 'inspect', 'Local package path cannot traverse a symlink.', { logicalPath: safePath });
    }
  }
  let stats;
  try { stats = fs.lstatSync(target); } catch {
    fail('candidate', 'V7DK_PACKAGE_FORMAT_MISMATCH', 'inspect', 'Local package archive is missing.', { logicalPath: safePath });
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail('candidate', 'V7DK_PACKAGE_PATH_INVALID', 'inspect', 'Local package target must be a regular file.', { logicalPath: safePath });
  }
  if (stats.size > MAX_TAR_BYTES) {
    fail('candidate', 'V7DK_RESOURCE_LIMIT', 'inspect', 'Local package archive exceeds the bounded in-memory size.');
  }
  return inspectLocalPackageBytes(fs.readFileSync(target), release);
}
