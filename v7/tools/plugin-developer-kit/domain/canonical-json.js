import { createHash } from 'node:crypto';

export function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalize(value, seen, location) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`Non-finite JSON number at ${location}.`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError(`Cyclic JSON value at ${location}.`);
    seen.add(value);
    const result = value.map((entry, index) => normalize(entry, seen, `${location}/${index}`));
    seen.delete(value);
    return result;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) throw new TypeError(`Cyclic JSON value at ${location}.`);
    if (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null) {
      throw new TypeError(`Non-portable JSON object at ${location}.`);
    }
    seen.add(value);
    const result = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) throw new TypeError(`Undefined JSON value at ${location}/${key}.`);
      result[key] = normalize(value[key], seen, `${location}/${key}`);
    }
    seen.delete(value);
    return result;
  }
  throw new TypeError(`Non-portable JSON value at ${location}.`);
}

/** Normalize one portable value with lexical object-key ordering. */
export function canonicalValue(value) {
  return normalize(value, new WeakSet(), '');
}

/** Encode canonical UTF-8 JSON without insignificant whitespace. */
export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function sha256Bytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return createHash('sha256').update(bytes).digest('hex');
}

export function digestBytes(value) {
  return `sha256:${sha256Bytes(value)}`;
}

export function digestValue(value) {
  return digestBytes(canonicalJson(value));
}

export function canonicalClone(value) {
  return JSON.parse(canonicalJson(value));
}
