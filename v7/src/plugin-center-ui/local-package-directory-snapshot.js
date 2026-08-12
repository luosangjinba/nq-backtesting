import {
  LOCAL_PLUGIN_ARCHIVE_LIMITS,
} from '../plugin-contract/public.js';
import { failLocalPluginPackageBrowser } from './local-package-browser-error.js';

const PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)[\p{L}\p{N}._/-]{1,240}$/u;

function requireName(name, prefix) {
  const logicalPath = prefix ? `${prefix}/${name}` : name;
  if (typeof name !== 'string' || name.length === 0 || name.includes('/')
    || name.includes('\\') || name === '.' || name === '..'
    || logicalPath.normalize('NFC') !== logicalPath || !PATH.test(logicalPath)) {
    failLocalPluginPackageBrowser(
      'V7DK_PACKAGE_PATH_INVALID',
      'Prepared candidate contains an unsafe path.',
    );
  }
  return logicalPath;
}

function requireDirectoryHandle(handle) {
  if (!handle || handle.kind !== 'directory' || handle.isSymbolicLink === true
    || typeof handle.values !== 'function') {
    failLocalPluginPackageBrowser(
      'V7DK_DEVELOPER_DIRECTORY_INVALID',
      'Load unpacked requires one non-symbolic prepared candidate directory.',
    );
  }
  return handle;
}

function requireFileHandle(handle, logicalPath) {
  if (handle.isSymbolicLink === true || handle.kind !== 'file'
    || typeof handle.getFile !== 'function') {
    failLocalPluginPackageBrowser(
      'V7DK_PACKAGE_PATH_INVALID',
      `Prepared candidate contains a link or special entry (${logicalPath}).`,
    );
  }
}

function requireCurrent(isCurrent) {
  if (!isCurrent()) {
    failLocalPluginPackageBrowser(
      'V7DK_DEVELOPER_MODE_DISABLED',
      'Developer Mode changed while the candidate snapshot was being read.',
    );
  }
}

async function regularFileSnapshot(handle, logicalPath, isCurrent) {
  requireFileHandle(handle, logicalPath);
  const file = await handle.getFile();
  requireCurrent(isCurrent);
  if (!(file instanceof Blob) || file.size > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntryBytes) {
    failLocalPluginPackageBrowser(
      'V7DK_RESOURCE_LIMIT',
      `Prepared candidate file exceeds its byte bound (${logicalPath}).`,
    );
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
      failLocalPluginPackageBrowser(
        'V7DK_RESOURCE_LIMIT',
        'Prepared candidate directory exceeds its bounded entry count.',
      );
    }
  }
  children.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  for (const child of children) {
    const logicalPath = requireName(child.name, prefix);
    if (child.isSymbolicLink === true || !['directory', 'file'].includes(child.kind)) {
      failLocalPluginPackageBrowser(
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
    failLocalPluginPackageBrowser(
      'V7DK_RESOURCE_LIMIT',
      'Prepared candidate directory exceeds its bounded snapshot limits.',
    );
  }
  return Object.freeze(entries);
}

/** Snapshot a selected candidate twice; changed layouts or bytes fail before validation. */
export async function snapshotLocalPluginPackageDirectory(handle, {
  isCurrent = () => true,
} = {}) {
  const first = await readOnce(handle, isCurrent);
  const second = await readOnce(handle, isCurrent);
  if (!sameSnapshots(first, second)) {
    failLocalPluginPackageBrowser(
      'V7DK_DEVELOPER_SNAPSHOT_STALE',
      'Prepared candidate changed while it was being snapshotted. Try again explicitly.',
    );
  }
  return second;
}
