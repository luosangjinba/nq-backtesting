import { canonicalJson, compareText, digestValue, sha256Bytes } from '../domain/canonical-json.js';
import { LIMITS } from '../domain/contract.js';
import { fail } from '../domain/diagnostic.js';
import { verifyReceipt } from '../domain/receipt.js';

const BLOCK = 512;
export const MAX_TAR_BYTES = LIMITS.archiveUnpackedBytes
  + (LIMITS.archiveEntries * BLOCK * 2) + (BLOCK * 2);

function putString(buffer, offset, length, value) {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length > length) fail('candidate', 'V7DK_BUNDLE_INVALID', 'pack', 'Tar header text exceeds ustar limits.');
  bytes.copy(buffer, offset);
}

function putOctal(buffer, offset, length, value, checksum = false) {
  const digits = value.toString(8);
  const suffix = checksum ? '\0 ' : '\0';
  const width = length - suffix.length;
  if (digits.length > width) fail('candidate', 'V7DK_RESOURCE_LIMIT', 'pack', 'Tar numeric header exceeds ustar limits.');
  putString(buffer, offset, length, `${digits.padStart(width, '0')}${suffix}`);
}

function splitName(logicalPath) {
  const bytes = Buffer.byteLength(logicalPath);
  if (bytes <= 100) return { name: logicalPath, prefix: '' };
  const separators = [...logicalPath.matchAll(/\//gu)].map(({ index }) => index).reverse();
  for (const index of separators) {
    const prefix = logicalPath.slice(0, index);
    const name = logicalPath.slice(index + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) return { name, prefix };
  }
  fail('candidate', 'V7DK_BUNDLE_INVALID', 'pack', 'Tar path exceeds deterministic ustar limits.', { logicalPath });
}

function validateArchivePath(logicalPath, phase = 'pack') {
  if (typeof logicalPath !== 'string' || logicalPath.length === 0 || logicalPath.includes('\0')
    || logicalPath.includes('\\') || logicalPath.startsWith('/') || logicalPath.includes('//')
    || logicalPath.normalize('NFC') !== logicalPath
    || Buffer.from(logicalPath, 'utf8').toString('utf8') !== logicalPath
    || logicalPath.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', phase, 'Archive entry path is unsafe.', { logicalPath });
  }
}

function hasPathPrefixCollision(paths, logicalPath) {
  return paths.some((candidate) => (
    candidate.startsWith(`${logicalPath}/`) || logicalPath.startsWith(`${candidate}/`)
  ));
}

function headerFor(logicalPath, size) {
  validateArchivePath(logicalPath);
  const { name, prefix } = splitName(logicalPath);
  const header = Buffer.alloc(BLOCK);
  putString(header, 0, 100, name);
  putOctal(header, 100, 8, 0o644);
  putOctal(header, 108, 8, 0);
  putOctal(header, 116, 8, 0);
  putOctal(header, 124, 12, size);
  putOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  putString(header, 156, 1, '0');
  putString(header, 257, 6, 'ustar\0');
  putString(header, 263, 2, '00');
  putString(header, 345, 155, prefix);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  putOctal(header, 148, 8, checksum, true);
  return header;
}

/** Encode normalized regular files as deterministic uncompressed ustar bytes. */
export function encodeTar(entries) {
  if (!Array.isArray(entries) || entries.length > LIMITS.archiveEntries) {
    fail('candidate', 'V7DK_RESOURCE_LIMIT', 'pack', 'Archive entry count exceeds P1a limits.');
  }
  const sorted = [...entries].sort((a, b) => compareText(a.path, b.path));
  sorted.forEach(({ path: logicalPath }) => validateArchivePath(logicalPath));
  const sortedPaths = sorted.map(({ path: logicalPath }) => logicalPath);
  if (new Set(sortedPaths).size !== sorted.length
    || sortedPaths.some((logicalPath, index) => hasPathPrefixCollision(sortedPaths.slice(0, index), logicalPath))) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'pack', 'Archive entry paths must be unique and prefix-safe.');
  }
  let unpacked = 0;
  const blocks = [];
  for (const entry of sorted) {
    const bytes = Buffer.isBuffer(entry.bytes) ? entry.bytes : Buffer.from(entry.bytes);
    if (bytes.length > LIMITS.archiveEntryBytes) {
      fail('candidate', 'V7DK_RESOURCE_LIMIT', 'pack', 'Archive entry exceeds the per-file byte limit.', {
        logicalPath: entry.path,
      });
    }
    unpacked += bytes.length;
    blocks.push(headerFor(entry.path, bytes.length), bytes);
    const padding = (BLOCK - (bytes.length % BLOCK)) % BLOCK;
    if (padding > 0) blocks.push(Buffer.alloc(padding));
  }
  if (unpacked > LIMITS.archiveUnpackedBytes) {
    fail('candidate', 'V7DK_RESOURCE_LIMIT', 'pack', 'Archive unpacked bytes exceed P1a limits.');
  }
  blocks.push(Buffer.alloc(BLOCK * 2));
  return Buffer.concat(blocks);
}

function readString(header, offset, length) {
  const end = header.indexOf(0, offset);
  const stop = end >= offset && end < offset + length ? end : offset + length;
  return header.subarray(offset, stop).toString('utf8');
}

function readCanonicalUtf8(header, offset, length) {
  const field = header.subarray(offset, offset + length);
  const zero = field.indexOf(0);
  const raw = zero === -1 ? field : field.subarray(0, zero);
  if (zero !== -1 && !field.subarray(zero).every((byte) => byte === 0)) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Tar text field has non-normal trailing bytes.');
  }
  const value = raw.toString('utf8');
  if (!Buffer.from(value, 'utf8').equals(raw)) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Tar path is not canonical UTF-8.');
  }
  return value;
}

function readOctal(header, offset, length) {
  const text = header.subarray(offset, offset + length).toString('ascii').replace(/[\0 ]+$/u, '');
  if (!/^[0-7]+$/u.test(text)) fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Tar numeric field is malformed.');
  return Number.parseInt(text, 8);
}

function checksumOf(header) {
  const copy = Buffer.from(header);
  copy.fill(0x20, 148, 156);
  let sum = 0;
  for (const byte of copy) sum += byte;
  return sum;
}

/** Parse only normalized ustar regular files; never extract to disk. */
export function parseTar(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < BLOCK * 2 || bytes.length > MAX_TAR_BYTES
    || bytes.length % BLOCK !== 0) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle is not block-aligned ustar.');
  }
  const entries = [];
  const paths = new Set();
  const normalizedPaths = new Set();
  let offset = 0;
  let unpacked = 0;
  let zeroBlocks = 0;
  let previousPath = null;
  while (offset < bytes.length) {
    const header = bytes.subarray(offset, offset + BLOCK);
    if (header.every((byte) => byte === 0)) {
      zeroBlocks += 1;
      offset += BLOCK;
      if (zeroBlocks === 2) break;
      continue;
    }
    if (zeroBlocks > 0) fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Non-zero data follows a tar terminator.');
    if (readString(header, 257, 6) !== 'ustar' || readString(header, 263, 2) !== '00') {
      fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle uses an unsupported tar dialect.');
    }
    const recordedChecksum = readOctal(header, 148, 8);
    if (recordedChecksum !== checksumOf(header)) {
      fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'inspect', 'Tar header checksum does not match.');
    }
    const name = readCanonicalUtf8(header, 0, 100);
    const prefix = readCanonicalUtf8(header, 345, 155);
    const logicalPath = prefix ? `${prefix}/${name}` : name;
    validateArchivePath(logicalPath, 'inspect');
    const normalizedPath = logicalPath.normalize('NFC');
    if (paths.has(logicalPath) || normalizedPaths.has(normalizedPath)
      || hasPathPrefixCollision([...paths], logicalPath)) {
      fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle contains a duplicate or prefix-colliding path.', { logicalPath });
    }
    if (previousPath !== null && compareText(previousPath, logicalPath) >= 0) {
      fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle entries are not in canonical lexical order.', {
        logicalPath,
      });
    }
    previousPath = logicalPath;
    paths.add(logicalPath);
    normalizedPaths.add(normalizedPath);
    const type = readString(header, 156, 1);
    const mode = readOctal(header, 100, 8);
    const uid = readOctal(header, 108, 8);
    const gid = readOctal(header, 116, 8);
    const size = readOctal(header, 124, 12);
    const mtime = readOctal(header, 136, 12);
    if (type !== '0' || mode !== 0o644 || uid !== 0 || gid !== 0 || mtime !== 0
      || readString(header, 157, 100) !== '' || readString(header, 265, 32) !== ''
      || readString(header, 297, 32) !== '' || readString(header, 329, 8) !== ''
      || readString(header, 337, 8) !== '') {
      fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle contains a link, device, or non-normalized metadata.', {
        logicalPath,
      });
    }
    if (!header.equals(headerFor(logicalPath, size))) {
      fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle tar header is not in canonical ustar form.', {
        logicalPath,
      });
    }
    if (size > LIMITS.archiveEntryBytes || entries.length + 1 > LIMITS.archiveEntries) {
      fail('candidate', 'V7DK_RESOURCE_LIMIT', 'inspect', 'Bundle entry count or size exceeds P1a limits.');
    }
    const dataStart = offset + BLOCK;
    const dataEnd = dataStart + size;
    if (dataEnd > bytes.length) fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle entry is truncated.');
    const data = Buffer.from(bytes.subarray(dataStart, dataEnd));
    unpacked += size;
    if (unpacked > LIMITS.archiveUnpackedBytes) {
      fail('candidate', 'V7DK_RESOURCE_LIMIT', 'inspect', 'Bundle unpacked bytes exceed P1a limits.');
    }
    entries.push(Object.freeze({ bytes: data, path: logicalPath }));
    const nextOffset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
    if (!bytes.subarray(dataEnd, nextOffset).every((byte) => byte === 0)) {
      fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle entry padding is not normalized.', {
        logicalPath,
      });
    }
    offset = nextOffset;
  }
  if (zeroBlocks !== 2 || offset !== bytes.length) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle terminator or trailing bytes are invalid.');
  }
  return Object.freeze(entries);
}

function parseJsonEntry(map, logicalPath) {
  try { return JSON.parse(map.get(logicalPath).toString('utf8')); } catch {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle metadata is missing or malformed.', {
      logicalPath,
    });
  }
}

/** Verify bundle index, declarations, receipts, and explicit P1a denials without importing code. */
export function inspectTar(bytes) {
  const entries = parseTar(bytes);
  const map = new Map(entries.map((entry) => [entry.path, entry.bytes]));
  const index = parseJsonEntry(map, 'v7dk.index.json');
  const bundle = parseJsonEntry(map, 'v7dk.bundle.json');
  if (index.schemaVersion !== 1 || index.bundleKind !== 'p1a-developer-evidence'
    || index.installable !== false || index.activated !== false
    || index.productionExecutionAuthorized !== false || !Array.isArray(index.files)
    || bundle.schemaVersion !== 1 || bundle.bundleKind !== 'p1a-developer-evidence'
    || bundle.installable !== false || bundle.activated !== false
    || bundle.productionExecutionAuthorized !== false || !Array.isArray(bundle.declaredPaths)) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle metadata does not preserve P1a denials.');
  }
  const actualPaths = entries.map(({ path }) => path).filter((logicalPath) => logicalPath !== 'v7dk.index.json').sort();
  if (JSON.stringify([...bundle.declaredPaths].sort()) !== JSON.stringify(actualPaths)) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle contains an undeclared or missing file.');
  }
  const indexedPaths = index.files.map(({ path }) => path);
  if (new Set(indexedPaths).size !== indexedPaths.length
    || JSON.stringify([...indexedPaths].sort()) !== JSON.stringify(actualPaths)) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle content index paths are invalid.');
  }
  for (const record of index.files) {
    const data = map.get(record.path);
    if (!data || record.size !== data.length || record.sha256 !== sha256Bytes(data)) {
      fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'inspect', 'Bundle content index detects a changed byte.', {
        logicalPath: record.path,
      });
    }
  }
  const indexByPath = new Map(index.files.map((record) => [record.path, record]));
  const indexedDigest = (paths) => digestValue([...paths].sort().map((logicalPath) => {
    const record = indexByPath.get(logicalPath);
    if (!record) fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'inspect', 'Receipt content path is absent from the index.', {
      logicalPath,
    });
    return { logicalPath, sha256: record.sha256, size: record.size };
  }));
  if (!Array.isArray(bundle.workspacePaths) || !Array.isArray(bundle.buildPaths)
    || new Set(bundle.workspacePaths).size !== bundle.workspacePaths.length
    || new Set(bundle.buildPaths).size !== bundle.buildPaths.length) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle workspace or build declarations are invalid.');
  }
  const workspace = parseJsonEntry(map, 'v7-plugin-kit.json');
  const workspaceDigest = indexedDigest(bundle.workspacePaths);
  const sourceDigest = indexedDigest(bundle.workspacePaths.filter((logicalPath) => (
    logicalPath.startsWith(`${workspace.sourceRoot}/`)
  )));
  const fixtureDigest = indexedDigest(bundle.workspacePaths.filter((logicalPath) => logicalPath.startsWith('fixtures/')));
  const expectedDigest = indexedDigest(bundle.workspacePaths.filter((logicalPath) => logicalPath.startsWith('expected/')));
  const manifestDigest = indexedDigest([workspace.manifestPath]);
  const buildDigest = indexedDigest(bundle.buildPaths);
  const testDigest = digestValue(parseJsonEntry(map, 'results/test.json'));
  const previewDigest = digestValue(parseJsonEntry(map, 'previews/preview.json'));
  const receipts = [];
  for (const logicalPath of bundle.receiptPaths ?? []) {
    const receipt = parseJsonEntry(map, logicalPath);
    if (!verifyReceipt(receipt)) {
      fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'inspect', 'Bundle contains a forged or authorization-increasing receipt.', {
        logicalPath,
      });
    }
    const expectedOperation = pathOperation(logicalPath);
    if (receipt.operation !== expectedOperation || receipt.packageId !== bundle.packageId
      || receipt.packageVersion !== bundle.packageVersion
      || receipt.content.workspaceDigest !== workspaceDigest
      || receipt.content.sourceDigest !== sourceDigest
      || receipt.content.fixtureDigest !== fixtureDigest
      || receipt.content.expectedDigest !== expectedDigest
      || receipt.content.manifestDigest !== manifestDigest
      || receipt.content.buildDigest !== buildDigest
      || expectedOperation === 'test' && receipt.content.testDigest !== testDigest
      || expectedOperation === 'preview' && receipt.content.previewDigest !== previewDigest) {
      fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'inspect', 'Bundle receipt is stale or does not bind the indexed content.', {
        logicalPath,
      });
    }
    receipts.push(receipt);
  }
  const compatibility = parseJsonEntry(map, bundle.compatibilityPath);
  if (compatibility.developerBundleOnly !== true || compatibility.laterCandidateEligible !== false) {
    fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle compatibility report increases P1a authority.');
  }
  return Object.freeze({
    bundle,
    bundleSha256: sha256Bytes(bytes),
    entries: Object.freeze(index.files),
    index,
    installable: false,
    productionExecutionAuthorized: false,
    receiptToolchainDigests: Object.freeze(receipts.map(({ identities }) => identities.toolchain?.digest)),
  });
}

function pathOperation(logicalPath) {
  const match = /^receipts\/(build|test|preview)\.json$/u.exec(logicalPath);
  if (!match) fail('candidate', 'V7DK_BUNDLE_INVALID', 'inspect', 'Bundle declares an unknown receipt path.', {
    logicalPath,
  });
  return match[1];
}

export function bundleIndex(entries) {
  return Object.freeze({
    activated: false,
    bundleKind: 'p1a-developer-evidence',
    contractProfile: 'trusted-built-in-core-v1',
    developerKitVersion: '1.0.0',
    files: Object.freeze([...entries].sort((a, b) => compareText(a.path, b.path)).map(({ path, bytes }) => ({
      path,
      sha256: sha256Bytes(bytes),
      size: bytes.length,
    }))),
    installable: false,
    limits: LIMITS,
    productionExecutionAuthorized: false,
    schemaVersion: 1,
  });
}

export function jsonEntry(logicalPath, value) {
  return Object.freeze({ bytes: Buffer.from(`${canonicalJson(value)}\n`), path: logicalPath });
}
