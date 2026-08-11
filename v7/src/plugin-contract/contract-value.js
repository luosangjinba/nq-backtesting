import { failPluginContract } from './plugin-contract-error.js';

const ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const FIELD_ID = /^[a-z][A-Za-z0-9.-]{0,63}$/;
const MAX_COLLECTION = 128;
const MAX_DEPTH = 8;

export function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failPluginContract(code, `${label} fields are invalid.`);
  }
  return value;
}

export function boundedText(value, label, { max = 160 } = {}) {
  if (typeof value !== 'string' || value.length < 1 || value.length > max) {
    failPluginContract('PLUGIN_VALUE_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function contractId(value, label) {
  if (typeof value !== 'string' || !ID.test(value) || value.length > 128) {
    failPluginContract('PLUGIN_ID_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function fieldId(value, label) {
  if (typeof value !== 'string' || !FIELD_ID.test(value)) {
    failPluginContract('PLUGIN_ID_INVALID', `${label} is invalid.`);
  }
  return value;
}

function portable(candidate, label, seen, depth) {
  if (candidate === null || typeof candidate === 'string' || typeof candidate === 'boolean') {
    return candidate;
  }
  if (typeof candidate === 'number') {
    if (!Number.isFinite(candidate)) {
      failPluginContract('PLUGIN_VALUE_INVALID', `${label} contains a non-finite number.`);
    }
    return Object.is(candidate, -0) ? 0 : candidate;
  }
  if (!candidate || typeof candidate !== 'object' || depth > MAX_DEPTH || seen.has(candidate)) {
    failPluginContract('PLUGIN_VALUE_INVALID', `${label} is not a bounded portable value.`);
  }
  seen.add(candidate);
  let value;
  if (Array.isArray(candidate)) {
    if (candidate.length > MAX_COLLECTION) {
      failPluginContract('PLUGIN_VALUE_INVALID', `${label} exceeds its collection bound.`);
    }
    value = Object.freeze(candidate.map((entry, index) => (
      portable(entry, `${label}[${index}]`, seen, depth + 1)
    )));
  } else {
    const keys = Object.keys(candidate).sort();
    if (keys.length > MAX_COLLECTION || Object.getPrototypeOf(candidate) !== Object.prototype) {
      failPluginContract('PLUGIN_VALUE_INVALID', `${label} is not a plain bounded record.`);
    }
    value = Object.freeze(Object.fromEntries(keys.map((key) => [
      key,
      portable(candidate[key], `${label}.${key}`, seen, depth + 1),
    ])));
  }
  seen.delete(candidate);
  return value;
}

export function portableValue(value, label) {
  return portable(value, label, new WeakSet(), 0);
}
