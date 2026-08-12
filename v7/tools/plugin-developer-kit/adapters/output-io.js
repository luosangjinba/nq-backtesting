import fs from 'node:fs';
import path from 'node:path';
import { canonicalJson, sha256Bytes } from '../domain/canonical-json.js';
import { fail } from '../domain/diagnostic.js';
import { LOGICAL } from './layout.js';
import { readLogicalPath } from './workspace-io.js';

function outputMarker(releaseDigest) {
  return { kind: 'v7-plugin-developer-kit-output', releaseDigest, schemaVersion: 1 };
}

export function prepareOutputRoot(outputRoot, releaseDigest) {
  const root = path.resolve(outputRoot);
  let stats;
  try { stats = fs.lstatSync(root); } catch {
    try {
      fs.mkdirSync(root, { recursive: true, mode: 0o755 });
      stats = fs.lstatSync(root);
    } catch {
      fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Output root cannot be created safely.');
    }
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Output root must be a real directory.');
  }
  const markerPath = path.join(root, LOGICAL.outputMarker);
  const entries = fs.readdirSync(root);
  if (entries.length > 0) {
    let marker;
    try {
      const markerStats = fs.lstatSync(markerPath);
      if (!markerStats.isFile() || markerStats.isSymbolicLink()) throw new TypeError('unsafe marker');
      marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    } catch {
      fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Non-empty output root is not owned by this Developer Kit.');
    }
    if (canonicalJson(marker) !== canonicalJson(outputMarker(releaseDigest))) {
      fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Output ownership marker does not match this release.');
    }
  } else {
    fs.writeFileSync(markerPath, `${canonicalJson(outputMarker(releaseDigest))}\n`, { flag: 'wx', mode: 0o644 });
  }
  return root;
}

function outputParent(outputRoot, logicalPath, { create }) {
  const root = path.resolve(outputRoot);
  const segments = logicalPath.split('/');
  segments.pop();
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    let stats;
    try { stats = fs.lstatSync(current); } catch {
      if (!create) {
        fail('candidate', 'V7DK_STALE_OUTPUT', 'output', 'Required output directory is missing.', { logicalPath });
      }
      try {
        fs.mkdirSync(current, { mode: 0o755 });
        stats = fs.lstatSync(current);
      } catch {
        fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Output directory cannot be created safely.', {
          logicalPath,
        });
      }
    }
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Output paths cannot traverse a symlink or special file.', {
        logicalPath,
      });
    }
  }
  return path.join(root, ...logicalPath.split('/'));
}

export function requireOutputRegularFile(outputRoot, logicalPath) {
  const safePath = readLogicalPath(logicalPath, 'Output file');
  const target = outputParent(outputRoot, safePath, { create: false });
  let stats;
  try { stats = fs.lstatSync(target); } catch {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'output', 'Required Developer Kit output is missing.', { logicalPath: safePath });
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Developer Kit output must be a regular file.', {
      logicalPath: safePath,
    });
  }
  return target;
}

export function replaceOwnedDirectory(outputRoot, logicalDirectory) {
  const logicalPath = readLogicalPath(logicalDirectory, 'Output directory');
  const target = outputParent(outputRoot, `${logicalPath}/placeholder`, { create: true });
  const directory = path.dirname(target);
  if (fs.existsSync(directory)) {
    const stats = fs.lstatSync(directory);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Owned output directory is not a real directory.', {
        logicalPath,
      });
    }
    fs.rmSync(directory, { force: true, recursive: true });
  }
  fs.mkdirSync(directory, { mode: 0o755 });
  return directory;
}

export function writeOutputFile(outputRoot, logicalPath, bytes) {
  const safePath = readLogicalPath(logicalPath, 'Output file');
  const target = outputParent(outputRoot, safePath, { create: true });
  if (fs.existsSync(target)) {
    const stats = fs.lstatSync(target);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Output target must be a regular file.', {
        logicalPath: safePath,
      });
    }
  }
  let descriptor;
  try {
    descriptor = fs.openSync(
      target,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW,
      0o644,
    );
    fs.writeFileSync(descriptor, bytes);
  } catch {
    fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Output file could not be written without following links.', {
      logicalPath: safePath,
    });
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  return Object.freeze({ logicalPath, sha256: sha256Bytes(bytes), size: Buffer.byteLength(bytes) });
}

export function writeOutputJson(outputRoot, logicalPath, value) {
  return writeOutputFile(outputRoot, logicalPath, `${canonicalJson(value)}\n`);
}

export function readOutputJson(outputRoot, logicalPath) {
  const target = requireOutputRegularFile(outputRoot, logicalPath);
  try { return JSON.parse(fs.readFileSync(target, 'utf8')); } catch {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'output', 'Required Developer Kit output is missing or malformed.', {
      logicalPath,
    });
  }
}

export function outputFileIdentity(outputRoot, logicalPath) {
  const target = requireOutputRegularFile(outputRoot, logicalPath);
  const bytes = fs.readFileSync(target);
  return Object.freeze({ logicalPath, sha256: sha256Bytes(bytes), size: bytes.length });
}
