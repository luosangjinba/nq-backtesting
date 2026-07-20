import { failReplacement } from './replacement-error.js';

export function exactRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failReplacement('WORKSPACE_REPLACEMENT_VALUE_INVALID', `${label} must be an object.`);
  }
  if (Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failReplacement('WORKSPACE_REPLACEMENT_FIELDS_INVALID', `${label} fields must be exact.`);
  }
}

export function exactString(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    failReplacement('WORKSPACE_REPLACEMENT_STRING_INVALID', `${label} must be an exact non-empty string.`);
  }
  return value;
}

export function requirePolicy(value, method, fields) {
  if (!value || !Object.isFrozen(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')
    || value.deterministic !== true || typeof value[method] !== 'function') {
    failReplacement('WORKSPACE_REPLACEMENT_POLICY_INVALID', `Replacement ${method} policy is invalid.`);
  }
  exactString(value.id, 'policy.id');
  exactString(value.revision, 'policy.revision');
  return value;
}
