import fs from 'node:fs';
import path from 'node:path';
import { canonicalJson, compareText, digestValue, sha256Bytes } from '../domain/canonical-json.js';
import { fail } from '../domain/diagnostic.js';
import { verifyReceipt } from '../domain/receipt.js';
import { bundleIndex, encodeTar, inspectTar, jsonEntry } from './tar.js';
import { readLogicalPath, readOutputJson, writeOutputFile } from './workspace-io.js';

function regularBytes(root, logicalPath) {
  const target = path.resolve(root, ...logicalPath.split('/'));
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'pack', 'Bundle source path escapes its root.', { logicalPath });
  }
  let stats;
  try { stats = fs.lstatSync(target); } catch {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'pack', 'Required bundle source file is missing.', { logicalPath });
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'pack', 'Bundle sources must be regular files.', { logicalPath });
  }
  return fs.readFileSync(target);
}

function requireStage({ buildDigest, outputRoot, release, stage, workspace }) {
  const state = readOutputJson(outputRoot, `state/${stage}-state.json`);
  if (state.schemaVersion !== 1 || state.workspaceDigest !== workspace.content.workspaceDigest
    || state.toolchainDigest !== release.toolchainDigest || state.buildDigest !== buildDigest
    || typeof state.outputDigest !== 'string') {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'pack', `${stage} output is stale for this workspace and build.`);
  }
  const receipt = readOutputJson(outputRoot, `receipts/${stage}.json`);
  if (!verifyReceipt(receipt) || receipt.content.workspaceDigest !== workspace.content.workspaceDigest
    || receipt.content.buildDigest !== buildDigest || receipt.content[`${stage}Digest`] !== state.outputDigest) {
    fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'pack', `${stage} receipt is forged or stale.`);
  }
  return Object.freeze({ receipt, state });
}

function collectFiles(root, logicalRoot, allowedSuffixes) {
  const result = [];
  const targetRoot = path.join(root, logicalRoot);
  function visit(directory, prefix = logicalRoot) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name))) {
      const logicalPath = `${prefix}/${entry.name}`;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target, logicalPath);
      else if (entry.isFile() && allowedSuffixes.some((suffix) => logicalPath.endsWith(suffix))) {
        result.push(Object.freeze({ bytes: fs.readFileSync(target), path: logicalPath }));
      } else {
        fail('candidate', 'V7DK_BUNDLE_INVALID', 'pack', 'Output contains an undeclared bundle artifact.', {
          logicalPath,
        });
      }
    }
  }
  visit(targetRoot);
  return result;
}

export function packBundle({ build, compatibility, outputRoot, release, workspace }) {
  const buildReceipt = readOutputJson(outputRoot, 'receipts/build.json');
  if (!verifyReceipt(buildReceipt) || buildReceipt.content.workspaceDigest !== workspace.content.workspaceDigest
    || buildReceipt.content.buildDigest !== build.buildDigest) {
    fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'pack', 'Build receipt is forged or stale.');
  }
  const tested = requireStage({ buildDigest: build.buildDigest, outputRoot, release, stage: 'test', workspace });
  const previewed = requireStage({ buildDigest: build.buildDigest, outputRoot, release, stage: 'preview', workspace });
  for (const required of ['LICENSE', 'provenance.json']) {
    if (!workspace.fileIndex.some(({ logicalPath }) => logicalPath === required)) {
      fail('candidate', 'V7DK_WORKSPACE_INVALID', 'pack', 'Pack requires source license and provenance disclosure.', {
        logicalPath: required,
      });
    }
  }
  const workspaceEntries = workspace.fileIndex.map(({ logicalPath }) => Object.freeze({
    bytes: regularBytes(workspace.root, logicalPath),
    path: logicalPath,
  }));
  const buildEntries = collectFiles(outputRoot, 'build', ['.js', '.d.ts']);
  const resultEntries = [
    Object.freeze({ bytes: regularBytes(outputRoot, 'results/test.json'), path: 'results/test.json' }),
    Object.freeze({ bytes: regularBytes(outputRoot, 'previews/preview.json'), path: 'previews/preview.json' }),
    jsonEntry('receipts/build.json', buildReceipt),
    jsonEntry('receipts/test.json', tested.receipt),
    jsonEntry('receipts/preview.json', previewed.receipt),
    jsonEntry('reports/compatibility.json', compatibility),
  ];
  const baseEntries = [...workspaceEntries, ...buildEntries, ...resultEntries];
  const metadata = Object.freeze({
    activated: false,
    buildPaths: Object.freeze(buildEntries.map(({ path: logicalPath }) => logicalPath).sort()),
    bundleKind: 'p1a-developer-evidence',
    compatibilityPath: 'reports/compatibility.json',
    contractProfile: workspace.document.contractProfile,
    declaredPaths: Object.freeze([...baseEntries.map(({ path: logicalPath }) => logicalPath), 'v7dk.bundle.json'].sort()),
    developerKitVersion: '1.0.0',
    installable: false,
    packageId: workspace.manifest.packageId,
    packageVersion: workspace.manifest.packageVersion,
    productionExecutionAuthorized: false,
    receiptPaths: Object.freeze(['receipts/build.json', 'receipts/preview.json', 'receipts/test.json']),
    schemaVersion: 1,
    workspacePaths: Object.freeze(workspaceEntries.map(({ path: logicalPath }) => logicalPath).sort()),
  });
  const entries = [...baseEntries, jsonEntry('v7dk.bundle.json', metadata)];
  const index = bundleIndex(entries);
  const bytes = encodeTar([...entries, jsonEntry('v7dk.index.json', index)]);
  const inspected = inspectTar(bytes);
  const bundlePath = `bundles/${workspace.manifest.packageId}-${workspace.manifest.packageVersion}.v7dk.tar`;
  const artifact = writeOutputFile(outputRoot, bundlePath, bytes);
  return Object.freeze({
    artifact,
    bundleDigest: `sha256:${sha256Bytes(bytes)}`,
    bundlePath,
    contentDigest: digestValue(index.files),
    inspected,
  });
}

export function inspectBundleAt(root, logicalPath, release) {
  const safePath = readLogicalPath(logicalPath, 'Bundle path');
  if (!safePath.endsWith('.v7dk.tar')) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'P1a bundles must use the .v7dk.tar suffix.', {
      logicalPath: safePath,
    });
  }
  const target = path.resolve(root, ...safePath.split('/'));
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle path escapes its explicit root.');
  }
  let stats;
  try { stats = fs.lstatSync(target); } catch {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle file is missing.', { logicalPath: safePath });
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle target must be a regular file.', { logicalPath: safePath });
  }
  const inspected = inspectTar(fs.readFileSync(target));
  if (release && inspected.receiptToolchainDigests.some((digest) => digest !== release.toolchainDigest)) {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'inspect', 'Bundle receipts target a different Developer Kit release.');
  }
  return inspected;
}
