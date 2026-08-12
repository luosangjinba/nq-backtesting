import { failPluginContract } from './plugin-contract-error.js';

function normalized(value, seen, location) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      failPluginContract('V7DK_PACKAGE_FORMAT_MISMATCH', `Non-finite JSON number at ${location}.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) {
    failPluginContract('V7DK_PACKAGE_FORMAT_MISMATCH', `Non-portable JSON value at ${location}.`);
  }
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    result = value.map((entry, index) => normalized(entry, seen, `${location}/${index}`));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      failPluginContract('V7DK_PACKAGE_FORMAT_MISMATCH', `Non-portable JSON object at ${location}.`);
    }
    result = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) {
        failPluginContract('V7DK_PACKAGE_FORMAT_MISMATCH', `Undefined JSON value at ${location}/${key}.`);
      }
      result[key] = normalized(value[key], seen, `${location}/${key}`);
    }
  }
  seen.delete(value);
  return result;
}

function requireCrypto(value) {
  if (typeof value?.subtle?.digest !== 'function') {
    failPluginContract('V7DK_INTERNAL_TOOLCHAIN', 'Local package inspection requires Web Crypto SHA-256.');
  }
  return value;
}

/** Encode one portable value using the Developer Kit's canonical JSON ordering. */
export function canonicalLocalPluginPackageJson(value) {
  return JSON.stringify(normalized(value, new WeakSet(), ''));
}

/** Return one lowercase SHA-256 hex digest for immutable bytes. */
export async function sha256LocalPluginPackageBytes(bytes, cryptoPort = globalThis.crypto) {
  if (!(bytes instanceof Uint8Array)) {
    failPluginContract('V7DK_PACKAGE_LAYOUT_INVALID', 'Local package content must be a byte snapshot.');
  }
  const output = await requireCrypto(cryptoPort).subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(output)]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Bind one canonical portable value to a browser-compatible SHA-256 identity. */
export async function digestLocalPluginPackageValue(value, cryptoPort = globalThis.crypto) {
  const bytes = new TextEncoder().encode(canonicalLocalPluginPackageJson(value));
  return `sha256:${await sha256LocalPluginPackageBytes(bytes, cryptoPort)}`;
}
