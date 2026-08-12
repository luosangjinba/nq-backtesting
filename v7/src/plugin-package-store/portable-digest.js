import { failPluginPackageStore } from './store-error.js';

function normalized(value, seen, depth) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Portable value contains a non-finite number.');
    return Object.is(value, -0) ? 0 : value;
  }
  if (!value || typeof value !== 'object' || depth > 12 || seen.has(value)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Portable value is cyclic or exceeds its depth bound.');
  }
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    if (value.length > 4_096) failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Portable array exceeds its bound.');
    result = value.map((entry) => normalized(entry, seen, depth + 1));
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null) {
      failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Portable value contains a non-plain record.');
    }
    const keys = Object.keys(value).sort();
    if (keys.length > 4_096) failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Portable record exceeds its bound.');
    result = Object.fromEntries(keys.map((key) => {
      if (value[key] === undefined) failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Portable value contains undefined.');
      return [key, normalized(value[key], seen, depth + 1)];
    }));
  }
  seen.delete(value);
  return Object.freeze(result);
}

export function canonicalPackageStoreValue(value) {
  return normalized(value, new WeakSet(), 0);
}

export function canonicalPackageStoreJson(value) {
  return JSON.stringify(canonicalPackageStoreValue(value));
}

function cryptoDigestPort(cryptoPort) {
  if (typeof cryptoPort?.subtle?.digest !== 'function') {
    failPluginPackageStore('V7DK_STORAGE_CRYPTO_UNAVAILABLE', 'Package storage requires Web Crypto SHA-256.');
  }
  return cryptoPort;
}

/** Digest bytes through the injected browser-compatible Web Crypto port. */
export async function digestPackageStoreBytes(bytes, cryptoPort = globalThis.crypto) {
  if (!(bytes instanceof Uint8Array)) {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'Package bytes must be an immutable byte snapshot.');
  }
  const digest = await cryptoDigestPort(cryptoPort).subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

/** Digest one canonical portable value without including host paths or ambient state. */
export function digestPackageStoreValue(value, cryptoPort = globalThis.crypto) {
  return digestPackageStoreBytes(new TextEncoder().encode(canonicalPackageStoreJson(value)), cryptoPort);
}
