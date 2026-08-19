import { failValidation } from './validation-error.js';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SEMVER = /^\d+\.\d+\.\d+$/u;
const CONTRACT_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/u;
const encoder = new TextEncoder();
const SHA256_INITIAL = Object.freeze([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);
const SHA256_ROUND = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function invalid(message, operation = 'validate') {
  failValidation('VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT', message, { operation });
}

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!Number.isInteger(next) || next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

function normalizeString(value, path) {
  if (hasUnpairedSurrogate(value) || value.normalize('NFC') !== value
    || /[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value)) {
    invalid(`${path} contains non-canonical text.`);
  }
  return value;
}

function keyCompare(left, right) {
  const a = Array.from(left, (character) => character.codePointAt(0));
  const b = Array.from(right, (character) => character.codePointAt(0));
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

/** Clone one strict JSON value, rejecting executable, hostile, cyclic, or lossy input. */
export function strictPortableValue(value, path = '$', ancestors = new WeakSet()) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return normalizeString(value, path);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) invalid(`${path} must be finite.`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (!value || typeof value !== 'object' || ancestors.has(value)) {
    invalid(`${path} is not a strict JSON value.`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== 'string')) invalid(`${path} contains a symbol key.`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some((descriptor) => (
    typeof descriptor.get === 'function' || typeof descriptor.set === 'function'
  ))) invalid(`${path} contains an accessor.`);
  ancestors.add(value);
  let result;
  if (Array.isArray(value)) {
    if (ownKeys.some((key) => key !== 'length' && !/^(0|[1-9]\d*)$/u.test(key))) {
      invalid(`${path} contains a non-index Array field.`);
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) invalid(`${path} is sparse.`);
    }
    result = value.map((entry, index) => strictPortableValue(entry, `${path}[${index}]`, ancestors));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) invalid(`${path} is not a plain record.`);
    const keys = Object.keys(value);
    if (keys.length !== ownKeys.length) invalid(`${path} contains a non-enumerable field.`);
    for (const key in value) {
      if (!Object.hasOwn(value, key)) invalid(`${path} contains an inherited enumerable field.`);
    }
    result = Object.fromEntries(keys.sort(keyCompare).map((key) => [
      normalizeString(key, `${path} key`),
      strictPortableValue(value[key], `${path}.${key}`, ancestors),
    ]));
  }
  ancestors.delete(value);
  return deepFreeze(result);
}

export function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function exactRecord(value, fields, label = 'Record') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be a record.`);
  const actual = Object.keys(value).sort(keyCompare);
  const expected = [...fields].sort(keyCompare);
  if (actual.length !== expected.length || actual.some((field, index) => field !== expected[index])) {
    invalid(`${label} fields are invalid.`);
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(strictPortableValue(value));
}

export function utf8Bytes(value) {
  return encoder.encode(typeof value === 'string' ? value : canonicalJson(value)).byteLength;
}

export function parseCanonicalJson(raw, { maximumBytes, label = 'Stored value' } = {}) {
  if (typeof raw !== 'string' || raw.length === 0
    || (maximumBytes !== undefined && utf8Bytes(raw) > maximumBytes)) {
    invalid(`${label} bytes are missing or exceed their ceiling.`, 'hydrate');
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch {
    invalid(`${label} JSON is malformed.`, 'hydrate');
  }
  const value = strictPortableValue(parsed);
  if (canonicalJson(value) !== raw) invalid(`${label} JSON is not canonical.`, 'hydrate');
  return value;
}

function cryptoPort(value) {
  if (typeof value?.subtle?.digest !== 'function') {
    invalid('Validation Campaign requires Web Crypto SHA-256.', 'digest');
  }
  return value;
}

export async function sha256Canonical(value, crypto = globalThis.crypto) {
  const bytes = encoder.encode(canonicalJson(value));
  const digest = await cryptoPort(crypto).subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function rotateRight(value, count) {
  return (value >>> count) | (value << (32 - count));
}

/** Synchronous SHA-256 for the one public API that is explicitly synchronous. */
export function sha256CanonicalSync(value) {
  const source = encoder.encode(canonicalJson(value));
  const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 0x80;
  const view = new DataView(bytes.buffer);
  const bitLength = source.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  const hash = [...SHA256_INITIAL];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + (index * 4));
    }
    for (let index = 16; index < 64; index += 1) {
      const before15 = words[index - 15];
      const before2 = words[index - 2];
      const sigma0 = rotateRight(before15, 7) ^ rotateRight(before15, 18) ^ (before15 >>> 3);
      const sigma1 = rotateRight(before2, 17) ^ rotateRight(before2, 19) ^ (before2 >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temporary1 = (h + sum1 + choose + SHA256_ROUND[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return `sha256:${hash.map((word) => word.toString(16).padStart(8, '0')).join('')}`;
}

export async function withContentDigest(value, crypto = globalThis.crypto, field = 'contentDigest') {
  const portable = strictPortableValue(value);
  if (Object.hasOwn(portable, field)) invalid(`Digest input must omit ${field}.`, 'digest');
  const digest = await sha256Canonical(portable, crypto);
  return strictPortableValue({ ...portable, [field]: digest });
}

export function withContentDigestSync(value, field = 'contentDigest') {
  const portable = strictPortableValue(value);
  if (Object.hasOwn(portable, field)) invalid(`Digest input must omit ${field}.`, 'digest');
  return strictPortableValue({ ...portable, [field]: sha256CanonicalSync(portable) });
}

export async function verifyContentDigest(value, crypto = globalThis.crypto, field = 'contentDigest') {
  if (!value || !DIGEST.test(value[field] ?? '')) invalid(`${field} is invalid.`, 'hydrate');
  const { [field]: claimed, ...payload } = value;
  const actual = await sha256Canonical(payload, crypto);
  if (actual !== claimed) invalid(`${field} does not match its canonical payload.`, 'hydrate');
  return strictPortableValue(value);
}

export function requireDigest(value, label = 'Digest') {
  if (typeof value !== 'string' || !DIGEST.test(value)) invalid(`${label} is invalid.`);
  return value;
}

export function requireUuid(value, label = 'Record id') {
  if (typeof value !== 'string' || !UUID_V4.test(value)) invalid(`${label} must be a lowercase UUIDv4.`);
  return value;
}

export function requireSemver(value, label = 'Version') {
  if (typeof value !== 'string' || !SEMVER.test(value)) invalid(`${label} is invalid.`);
  return value;
}

export function requireContractId(value, label = 'Contract id') {
  if (typeof value !== 'string' || !CONTRACT_ID.test(value)) invalid(`${label} is invalid.`);
  return value;
}

export function requireOpaqueId(value, label = 'Identity') {
  if (typeof value !== 'string' || !OPAQUE_ID.test(value)) invalid(`${label} is invalid.`);
  return value;
}

export function requireEpoch(value, label = 'Epoch') {
  if (!Number.isSafeInteger(value) || value < 0) invalid(`${label} must be a non-negative safe integer.`);
  return value;
}

export function requireRevision(value, label = 'Revision', { minimum = 1 } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum) invalid(`${label} is invalid.`);
  return value;
}

export function requireEnum(value, allowed, label = 'Value') {
  if (!allowed.includes(value)) invalid(`${label} is invalid.`);
  return value;
}

export function requireFinite(value, label = 'Number') {
  if (!Number.isFinite(value)) invalid(`${label} must be finite.`);
  return Object.is(value, -0) ? 0 : value;
}

export function requireBoundedText(value, label, { codePoints, bytes, allowEmpty = false } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    invalid(`${label} is not valid text.`);
  }
  if ((codePoints !== undefined && Array.from(value).length > codePoints)
    || (bytes !== undefined && utf8Bytes(value) > bytes)) {
    failValidation('VALIDATION_CAMPAIGN_RESOURCE_LIMIT', `${label} exceeds its text ceiling.`, {
      operation: 'resource-check',
    });
  }
  return normalizeString(value, label);
}
