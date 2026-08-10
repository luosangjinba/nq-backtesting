import { failEvidence } from './evidence-error.js';

export const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export const CAPABILITY_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;

export function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failEvidence(code, `${label} fields are invalid.`);
  }
}

export function epoch(value, code, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failEvidence(code, `${label} must be a non-negative safe epoch.`);
  }
  return value;
}

export function count(value, maximum, code, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    failEvidence(code, `${label} must be an integer from 0 through ${maximum}.`);
  }
  return value;
}

export function opaqueId(value, code, label) {
  if (typeof value !== 'string' || !OPAQUE_ID.test(value)) {
    failEvidence(code, `${label} must be an exact opaque identifier.`);
  }
  return value;
}

export function capabilityId(value, code, label) {
  if (typeof value !== 'string' || !CAPABILITY_ID.test(value)) {
    failEvidence(code, `${label} must be an exact capability identifier.`);
  }
  return value;
}
