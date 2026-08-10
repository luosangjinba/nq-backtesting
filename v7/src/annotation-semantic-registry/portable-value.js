import { failSemanticPackage } from './semantic-package-error.js';

export function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failSemanticPackage(code, `${label} fields must be exact.`);
  }
}

export function portableValue(value, path = 'value', ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      failSemanticPackage('SEMANTIC_PORTABLE_VALUE_INVALID', `${path} must be finite.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (!value || typeof value !== 'object' || ancestors.has(value)) {
    failSemanticPackage(
      'SEMANTIC_PORTABLE_VALUE_INVALID',
      `${path} must be acyclic JSON-compatible data.`,
    );
  }
  ancestors.add(value);
  let result;
  if (Array.isArray(value)) {
    result = value.map((entry, index) => portableValue(entry, `${path}[${index}]`, ancestors));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      failSemanticPackage('SEMANTIC_PORTABLE_VALUE_INVALID', `${path} must use plain records.`);
    }
    result = Object.fromEntries(Object.keys(value).sort().map((key) => [
      key,
      portableValue(value[key], `${path}.${key}`, ancestors),
    ]));
  }
  ancestors.delete(value);
  return Object.freeze(result);
}
