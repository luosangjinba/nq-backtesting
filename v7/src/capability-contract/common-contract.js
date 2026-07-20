const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:0*\.\d*[1-9]\d*|0*[1-9]\d*(?:\.\d+)?)$/;

/** Stable public error for capability schema and negotiation failures. */
export class CapabilityContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CapabilityContractError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new CapabilityContractError(code, message);
}

function assertRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_CAPABILITY_FIELD', `${label} must be an object.`);
  }
}

function assertExactFields(value, required, optional = []) {
  assertRecord(value, 'Capability value');
  const allowed = new Set([...required, ...optional]);
  for (const field of required) {
    if (!Object.hasOwn(value, field)) fail('MISSING_CAPABILITY_FIELD', `Missing capability field ${field}.`);
  }
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) fail('UNKNOWN_CAPABILITY_FIELD', `Unknown capability field ${field}.`);
  }
}

function capabilityId(value, label) {
  if (typeof value !== 'string' || !CAPABILITY_ID_PATTERN.test(value)) {
    fail('INVALID_CAPABILITY_ID', `${label} must be a namespaced id.`);
  }
  return value;
}

function stringList(value, label, { ids = true, nonEmpty = true } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) {
    fail('INVALID_CAPABILITY_FIELD', `${label} must be ${nonEmpty ? 'a non-empty' : 'an'} array.`);
  }
  const result = value.map((entry) => {
    if (typeof entry !== 'string' || entry.length === 0) {
      fail('INVALID_CAPABILITY_FIELD', `${label} contains an invalid string.`);
    }
    return ids ? capabilityId(entry, label) : entry;
  });
  if (new Set(result).size !== result.length) fail('DUPLICATE_CAPABILITY_VALUE', `${label} contains duplicates.`);
  return Object.freeze(result);
}

function positiveSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail('INVALID_CAPABILITY_FIELD', `${label} must be a positive safe integer.`);
  }
  return value;
}

function nonNegativeSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail('INVALID_CAPABILITY_FIELD', `${label} must be a non-negative safe integer.`);
  }
  return value;
}

function positiveDecimal(value, label) {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL_PATTERN.test(value)) {
    fail('INVALID_CAPABILITY_FIELD', `${label} must be a positive decimal string.`);
  }
  return value;
}

function timeZone(value, label) {
  if (typeof value !== 'string') fail('INVALID_TIME_ZONE', `${label} must be an IANA time zone.`);
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format(0);
  } catch {
    fail('INVALID_TIME_ZONE', `${label} must be an IANA time zone.`);
  }
  return value;
}

function normalizeBase(value, { contract, kind, specificFields }) {
  const fields = ['schemaVersion', 'apiVersion', 'kind', 'contract', 'id', 'version', 'display'];
  assertExactFields(value, [...fields, ...specificFields]);
  if (value.schemaVersion !== 1 || value.apiVersion !== 1) {
    fail('UNSUPPORTED_CAPABILITY_VERSION', `${kind} requires schemaVersion/apiVersion 1.`);
  }
  if (value.kind !== kind || value.contract !== contract) {
    fail('CAPABILITY_TYPE_MISMATCH', `Expected ${contract} (${kind}).`);
  }
  if (typeof value.version !== 'string' || !SEMVER_PATTERN.test(value.version)) {
    fail('INVALID_CAPABILITY_VERSION', `${value.id ?? kind}.version must be semantic x.y.z.`);
  }
  assertExactFields(value.display, ['label', 'shortLabel']);
  for (const field of ['label', 'shortLabel']) {
    if (typeof value.display[field] !== 'string' || value.display[field].length === 0) {
      fail('INVALID_CAPABILITY_FIELD', `display.${field} must be non-empty.`);
    }
  }
  return {
    schemaVersion: 1,
    apiVersion: 1,
    kind,
    contract,
    id: capabilityId(value.id, `${kind}.id`),
    version: value.version,
    display: Object.freeze({ label: value.display.label, shortLabel: value.display.shortLabel }),
  };
}

export const CAPABILITY_INTERNALS = Object.freeze({
  assertExactFields,
  assertRecord,
  capabilityId,
  fail,
  nonNegativeSafeInteger,
  normalizeBase,
  positiveDecimal,
  positiveSafeInteger,
  stringList,
  timeZone,
});
