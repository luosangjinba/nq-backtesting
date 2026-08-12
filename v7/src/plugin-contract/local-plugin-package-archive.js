import { failPluginContract } from './plugin-contract-error.js';

const BLOCK = 512;
const UTF8 = new TextEncoder();
const UTF8_FATAL = new TextDecoder('utf-8', { fatal: true });

export const LOCAL_PLUGIN_ARCHIVE = Object.freeze({
  format: 'ustar',
  mediaType: 'application/vnd.replay-lab.v7-plugin+tar',
  suffix: '.v7plugin',
  version: 1,
});

export const LOCAL_PLUGIN_ARCHIVE_LIMITS = Object.freeze({
  archiveEntries: 512,
  archiveEntryBytes: 2 * 1024 * 1024,
  archiveUnpackedBytes: 8 * 1024 * 1024,
});

export const MAX_LOCAL_PLUGIN_ARCHIVE_BYTES = LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveUnpackedBytes
  + (LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntries * BLOCK * 2) + (BLOCK * 2);

function fail(code, message, logicalPath) {
  const suffix = logicalPath === undefined ? '' : ` (${logicalPath})`;
  failPluginContract(code, `${message}${suffix}`);
}

function bytesEqual(left, right) {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function canonicalPath(logicalPath) {
  if (typeof logicalPath !== 'string' || logicalPath.length === 0 || logicalPath.includes('\0')
    || logicalPath.includes('\\') || logicalPath.startsWith('/') || logicalPath.includes('//')
    || logicalPath.normalize('NFC') !== logicalPath
    || logicalPath.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    fail('V7DK_BUNDLE_INVALID', 'Archive entry path is unsafe.', logicalPath);
  }
  const encoded = UTF8.encode(logicalPath);
  try {
    if (UTF8_FATAL.decode(encoded) !== logicalPath) throw new TypeError('non-canonical');
  } catch {
    fail('V7DK_BUNDLE_INVALID', 'Archive path is not canonical UTF-8.', logicalPath);
  }
  return encoded;
}

function writeBytes(target, offset, length, bytes) {
  if (bytes.length > length) fail('V7DK_BUNDLE_INVALID', 'Tar header text exceeds ustar limits.');
  target.set(bytes, offset);
}

function writeText(target, offset, length, value) {
  writeBytes(target, offset, length, UTF8.encode(value));
}

function writeOctal(target, offset, length, value, checksum = false) {
  const digits = value.toString(8);
  const suffix = checksum ? '\0 ' : '\0';
  const width = length - suffix.length;
  if (digits.length > width) fail('V7DK_RESOURCE_LIMIT', 'Tar numeric header exceeds ustar limits.');
  writeText(target, offset, length, `${digits.padStart(width, '0')}${suffix}`);
}

function splitPath(logicalPath) {
  const bytes = canonicalPath(logicalPath);
  if (bytes.length <= 100) return { name: logicalPath, prefix: '' };
  const separators = [...logicalPath.matchAll(/\//gu)].map(({ index }) => index).reverse();
  for (const index of separators) {
    const prefix = logicalPath.slice(0, index);
    const name = logicalPath.slice(index + 1);
    if (UTF8.encode(prefix).length <= 155 && UTF8.encode(name).length <= 100) {
      return { name, prefix };
    }
  }
  fail('V7DK_BUNDLE_INVALID', 'Tar path exceeds deterministic ustar limits.', logicalPath);
}

function headerFor(logicalPath, size) {
  const { name, prefix } = splitPath(logicalPath);
  const header = new Uint8Array(BLOCK);
  writeText(header, 0, 100, name);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  writeText(header, 156, 1, '0');
  writeText(header, 257, 6, 'ustar\0');
  writeText(header, 263, 2, '00');
  writeText(header, 345, 155, prefix);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeOctal(header, 148, 8, checksum, true);
  return header;
}

function prefixCollision(paths, logicalPath) {
  return paths.some((candidate) => (
    candidate.startsWith(`${logicalPath}/`) || logicalPath.startsWith(`${candidate}/`)
  ));
}

function concatenate(chunks) {
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

/** Normalize bounded regular-file entries for both unpacked inspection and archive encoding. */
export function normalizeLocalPluginArchiveEntries(entries) {
  if (!Array.isArray(entries) || entries.length > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntries) {
    fail('V7DK_RESOURCE_LIMIT', 'Archive entry count exceeds the local package limit.');
  }
  const values = entries.map((entry) => {
    if (!entry || typeof entry.path !== 'string' || !(entry.bytes instanceof Uint8Array)) {
      fail('V7DK_PACKAGE_LAYOUT_INVALID', 'Local package entries are malformed.');
    }
    canonicalPath(entry.path);
    return Object.freeze({ bytes: new Uint8Array(entry.bytes), path: entry.path });
  }).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const paths = values.map(({ path }) => path);
  if (new Set(paths).size !== paths.length
    || paths.some((logicalPath, index) => prefixCollision(paths.slice(0, index), logicalPath))) {
    fail('V7DK_BUNDLE_INVALID', 'Archive entry paths must be unique and prefix-safe.');
  }
  const unpacked = values.reduce((total, entry) => {
    if (entry.bytes.length > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntryBytes) {
      fail('V7DK_RESOURCE_LIMIT', 'Archive entry exceeds the per-file byte limit.', entry.path);
    }
    return total + entry.bytes.length;
  }, 0);
  if (unpacked > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveUnpackedBytes) {
    fail('V7DK_RESOURCE_LIMIT', 'Archive unpacked bytes exceed the local package limit.');
  }
  return values;
}

/** Encode exact regular-file candidate entries as deterministic uncompressed ustar. */
export function encodeLocalPluginArchive(entries) {
  const values = normalizeLocalPluginArchiveEntries(entries);
  const chunks = [];
  for (const entry of values) {
    chunks.push(headerFor(entry.path, entry.bytes.length), entry.bytes);
    const padding = (BLOCK - (entry.bytes.length % BLOCK)) % BLOCK;
    if (padding > 0) chunks.push(new Uint8Array(padding));
  }
  chunks.push(new Uint8Array(BLOCK * 2));
  return concatenate(chunks);
}

function readText(header, offset, length, { canonical = false } = {}) {
  const field = header.subarray(offset, offset + length);
  const zero = field.indexOf(0);
  const raw = zero === -1 ? field : field.subarray(0, zero);
  if (canonical && zero !== -1 && !field.subarray(zero).every((byte) => byte === 0)) {
    fail('V7DK_BUNDLE_INVALID', 'Tar text field has non-normal trailing bytes.');
  }
  try { return UTF8_FATAL.decode(raw); } catch {
    fail('V7DK_BUNDLE_INVALID', 'Tar text field is not canonical UTF-8.');
  }
}

function readOctal(header, offset, length) {
  const text = new TextDecoder('ascii').decode(header.subarray(offset, offset + length))
    .replace(/[\0 ]+$/u, '');
  if (!/^[0-7]+$/u.test(text)) fail('V7DK_BUNDLE_INVALID', 'Tar numeric field is malformed.');
  return Number.parseInt(text, 8);
}

function checksumOf(header) {
  const copy = new Uint8Array(header);
  copy.fill(0x20, 148, 156);
  return copy.reduce((sum, byte) => sum + byte, 0);
}

function readEntry(bytes, offset, priorPaths, previousPath) {
  const header = bytes.subarray(offset, offset + BLOCK);
  if (readText(header, 257, 6) !== 'ustar' || readText(header, 263, 2) !== '00') {
    fail('V7DK_BUNDLE_INVALID', 'Archive uses an unsupported tar dialect.');
  }
  if (readOctal(header, 148, 8) !== checksumOf(header)) {
    fail('V7DK_INTEGRITY_MISMATCH', 'Tar header checksum does not match.');
  }
  const name = readText(header, 0, 100, { canonical: true });
  const prefix = readText(header, 345, 155, { canonical: true });
  const logicalPath = prefix ? `${prefix}/${name}` : name;
  canonicalPath(logicalPath);
  if (priorPaths.has(logicalPath) || prefixCollision([...priorPaths], logicalPath)
    || (previousPath !== null && previousPath >= logicalPath)) {
    fail('V7DK_BUNDLE_INVALID', 'Archive paths are duplicated, colliding, or unsorted.', logicalPath);
  }
  const size = readOctal(header, 124, 12);
  const normalized = readText(header, 156, 1) === '0'
    && readOctal(header, 100, 8) === 0o644 && readOctal(header, 108, 8) === 0
    && readOctal(header, 116, 8) === 0 && readOctal(header, 136, 12) === 0
    && readText(header, 157, 100) === '' && readText(header, 265, 32) === ''
    && readText(header, 297, 32) === '' && readText(header, 329, 8) === ''
    && readText(header, 337, 8) === '' && bytesEqual(header, headerFor(logicalPath, size));
  if (!normalized) fail('V7DK_BUNDLE_INVALID', 'Archive contains non-normalized metadata.', logicalPath);
  return Object.freeze({ logicalPath, size });
}

/** Parse only normalized ustar regular files without extracting or evaluating payload. */
export function parseLocalPluginArchive(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < BLOCK * 2
    || bytes.length > MAX_LOCAL_PLUGIN_ARCHIVE_BYTES || bytes.length % BLOCK !== 0) {
    fail('V7DK_BUNDLE_INVALID', 'Archive is not bounded block-aligned ustar.');
  }
  const entries = [];
  const paths = new Set();
  let offset = 0;
  let unpacked = 0;
  let zeroBlocks = 0;
  let previousPath = null;
  while (offset < bytes.length) {
    const header = bytes.subarray(offset, offset + BLOCK);
    if (header.every((byte) => byte === 0)) {
      zeroBlocks += 1; offset += BLOCK;
      if (zeroBlocks === 2) break;
      continue;
    }
    if (zeroBlocks > 0) fail('V7DK_BUNDLE_INVALID', 'Non-zero data follows a tar terminator.');
    const { logicalPath, size } = readEntry(bytes, offset, paths, previousPath);
    if (size > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntryBytes
      || entries.length + 1 > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntries) {
      fail('V7DK_RESOURCE_LIMIT', 'Archive entry count or size exceeds its bound.', logicalPath);
    }
    const start = offset + BLOCK;
    const end = start + size;
    const next = start + Math.ceil(size / BLOCK) * BLOCK;
    if (end > bytes.length || !bytes.subarray(end, next).every((byte) => byte === 0)) {
      fail('V7DK_BUNDLE_INVALID', 'Archive entry is truncated or has non-zero padding.', logicalPath);
    }
    unpacked += size;
    if (unpacked > LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveUnpackedBytes) {
      fail('V7DK_RESOURCE_LIMIT', 'Archive unpacked bytes exceed the local package limit.');
    }
    entries.push(Object.freeze({ bytes: new Uint8Array(bytes.subarray(start, end)), path: logicalPath }));
    paths.add(logicalPath); previousPath = logicalPath; offset = next;
  }
  if (zeroBlocks !== 2 || offset !== bytes.length) {
    fail('V7DK_BUNDLE_INVALID', 'Archive terminator or trailing bytes are invalid.');
  }
  return Object.freeze(entries);
}
