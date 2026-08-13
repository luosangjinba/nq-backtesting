import {
  inspectLocalPluginPackageEntries,
  LOCAL_PLUGIN_ARCHIVE_LIMITS,
} from '../../../src/plugin-contract/public.js';

const PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)[\p{L}\p{N}._/-]{1,240}$/u;

export class UnpackedCandidateInspectionError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'UnpackedCandidateInspectionError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new UnpackedCandidateInspectionError(code, message);
}

function requireName(name, prefix) {
  const logicalPath = prefix ? `${prefix}/${name}` : name;
  if (typeof name !== 'string' || name.length === 0 || name.includes('/')
    || name.includes('\\') || name === '.' || name === '..'
    || logicalPath.normalize('NFC') !== logicalPath || !PATH.test(logicalPath)) {
    fail('V7DK_PACKAGE_PATH_INVALID', 'Prepared candidate contains an unsafe path.');
  }
  return logicalPath;
}

function requireDirectoryHandle(handle) {
  if (!handle || handle.kind !== 'directory' || handle.isSymbolicLink === true
    || typeof handle.values !== 'function') {
    fail(
      'V7DK_UNPACKED_DIRECTORY_INVALID',
      'Unpacked inspection requires one non-symbolic prepared candidate directory.',
    );
  }
  return handle;
}

function requireFileHandle(handle, logicalPath) {
  if (handle.isSymbolicLink === true || handle.kind !== 'file'
    || typeof handle.getFile !== 'function') {
    fail(
      'V7DK_PACKAGE_PATH_INVALID',
      `Prepared candidate contains a link or special entry (${logicalPath}).`,
    );
  }
}

function requireCurrent(isCurrent) {
  if (!isCurrent()) {
    fail('V7DK_OPERATION_CANCELLED', 'Unpacked candidate inspection was cancelled.');
  }
}

async function regularFileSnapshot(handle, logicalPath, isCurrent) {
  requireFileHandle(handle, logicalPath);
  const file = await handle.getFile();
  requireCurrent(isCurrent);
  if (!file || typeof file.arrayBuffer !== 'function' || !Number.isSafeInteger(file.size)
    || file.size < 0 || file.size > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntryBytes) {
    fail('V7DK_RESOURCE_LIMIT', `Prepared candidate file exceeds its byte bound (${logicalPath}).`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  requireCurrent(isCurrent);
  return Object.freeze({ bytes, path: logicalPath });
}

async function visitDirectory(handle, prefix, entries, isCurrent) {
  requireDirectoryHandle(handle);
  const children = [];
  for await (const child of handle.values()) {
    requireCurrent(isCurrent);
    children.push(child);
    if (children.length + entries.length > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntries * 2) {
      fail('V7DK_RESOURCE_LIMIT', 'Prepared candidate directory exceeds its bounded entry count.');
    }
  }
  children.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  for (const child of children) {
    const logicalPath = requireName(child.name, prefix);
    if (child.isSymbolicLink === true || !['directory', 'file'].includes(child.kind)) {
      fail(
        'V7DK_PACKAGE_PATH_INVALID',
        `Prepared candidate contains a link or special entry (${logicalPath}).`,
      );
    }
    if (child.kind === 'directory') await visitDirectory(child, logicalPath, entries, isCurrent);
    else entries.push(await regularFileSnapshot(child, logicalPath, isCurrent));
  }
}

function sameSnapshots(left, right) {
  return left.length === right.length && left.every((entry, index) => (
    entry.path === right[index].path && entry.bytes.length === right[index].bytes.length
    && entry.bytes.every((byte, byteIndex) => byte === right[index].bytes[byteIndex])
  ));
}

async function readOnce(handle, isCurrent) {
  const entries = [];
  await visitDirectory(requireDirectoryHandle(handle), '', entries, isCurrent);
  const total = entries.reduce((sum, { bytes }) => sum + bytes.length, 0);
  if (entries.length > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntries
    || total > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveUnpackedBytes) {
    fail('V7DK_RESOURCE_LIMIT', 'Prepared candidate directory exceeds its bounded snapshot limits.');
  }
  return Object.freeze(entries);
}

/** Double-snapshot one prepared directory without retaining its handle or creating a product generation. */
export async function snapshotUnpackedCandidateDirectory(handle, {
  isCurrent = () => true,
} = {}) {
  const first = await readOnce(handle, isCurrent);
  const second = await readOnce(handle, isCurrent);
  if (!sameSnapshots(first, second)) {
    fail(
      'V7DK_UNPACKED_SNAPSHOT_STALE',
      'Prepared candidate changed while it was being snapshotted. Try again explicitly.',
    );
  }
  return second;
}

/** Inspect one explicitly supplied unpacked candidate entirely in memory for Developer Kit evidence. */
export async function inspectUnpackedCandidateDirectory(handle, {
  cryptoPort = globalThis.crypto,
  isCurrent = () => true,
  release,
} = {}) {
  const entries = await snapshotUnpackedCandidateDirectory(handle, { isCurrent });
  const inspected = await inspectLocalPluginPackageEntries(entries, { cryptoPort, release });
  requireCurrent(isCurrent);
  return Object.freeze({ ...inspected, directoryName: handle.name });
}
