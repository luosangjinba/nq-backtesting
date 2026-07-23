const LAYOUT_SYNC_SCHEMA = 'v7.layout-sync';
const LAYOUT_SYNC_VERSION = 1;

export const LAYOUT_SYNC_KEYS = Object.freeze([
  'symbol',
  'interval',
  'crosshair',
  'time',
  'dateRange',
]);

const DEFAULT_LAYOUT_SYNC = Object.freeze({
  symbol: true,
  interval: false,
  crosshair: false,
  time: false,
  dateRange: false,
});

/** Stable public failure for malformed Layout Sync values and wire records. */
export class LayoutSyncDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LayoutSyncDomainError';
    this.code = code;
  }
}

class LayoutSyncValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

function fail(code, message) {
  throw new LayoutSyncDomainError(code, message);
}

function exactKeys(value, keys, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) {
    fail(code, `${label} must contain exactly the documented fields.`);
  }
}

function normalizedSettings(value) {
  exactKeys(value, LAYOUT_SYNC_KEYS, 'LAYOUT_SYNC_FIELDS_INVALID', 'Layout Sync settings');
  const result = {};
  for (const key of LAYOUT_SYNC_KEYS) {
    if (typeof value[key] !== 'boolean') {
      fail('LAYOUT_SYNC_VALUE_INVALID', `Layout Sync ${key} must be boolean.`);
    }
    result[key] = value[key];
  }
  return Object.freeze(result);
}

/**
 * Owner: Layout Sync Domain.
 * Purpose: create the immutable Session-workspace policy shared by the layout menu.
 * Inputs/outputs: exact five-boolean settings or the reviewed default policy.
 * Side effects/lifecycle/concurrency: none.
 * Errors: LayoutSyncDomainError for missing, extra, or non-boolean fields.
 * Protected invariant: policy values contain no Pane, Replay, data, chart, or Viewport state.
 */
export function createLayoutSync(value = DEFAULT_LAYOUT_SYNC) {
  return new LayoutSyncValue(normalizedSettings(value));
}

/** Read a branded immutable Layout Sync value; structural lookalikes are rejected. */
export function readLayoutSync(candidate) {
  if (!(candidate instanceof LayoutSyncValue)) {
    fail('LAYOUT_SYNC_REQUIRED', 'A branded Layout Sync value is required.');
  }
  return candidate.read();
}

/**
 * Owner: Layout Sync Domain.
 * Purpose: apply one policy-toggle intent without changing any feature owner state.
 * Inputs/outputs: branded current value, registered key, and boolean target.
 * Side effects/lifecycle/concurrency: none; consumers decide how an enabled policy is applied.
 * Errors: LayoutSyncDomainError for unsupported keys or non-boolean targets.
 */
export function setLayoutSync(candidate, key, enabled) {
  const current = readLayoutSync(candidate);
  if (!LAYOUT_SYNC_KEYS.includes(key)) {
    fail('LAYOUT_SYNC_KEY_INVALID', `Unsupported Layout Sync key: ${String(key)}.`);
  }
  if (typeof enabled !== 'boolean') {
    fail('LAYOUT_SYNC_VALUE_INVALID', `Layout Sync ${key} must be boolean.`);
  }
  if (current[key] === enabled) return candidate;
  return createLayoutSync({ ...current, [key]: enabled });
}

/** Serialize one Layout Sync value through the exact version-one wire contract. */
export function serializeLayoutSync(candidate) {
  const current = readLayoutSync(candidate);
  return Object.freeze({
    schema: LAYOUT_SYNC_SCHEMA,
    version: LAYOUT_SYNC_VERSION,
    ...current,
  });
}

/** Restore one exact version-one Layout Sync wire record. */
export function deserializeLayoutSync(wire) {
  exactKeys(
    wire,
    ['schema', 'version', ...LAYOUT_SYNC_KEYS],
    'LAYOUT_SYNC_WIRE_INVALID',
    'Layout Sync wire record',
  );
  if (wire.schema !== LAYOUT_SYNC_SCHEMA || wire.version !== LAYOUT_SYNC_VERSION) {
    fail('LAYOUT_SYNC_WIRE_INVALID', 'Layout Sync wire schema or version is unsupported.');
  }
  return createLayoutSync(Object.fromEntries(LAYOUT_SYNC_KEYS.map((key) => [key, wire[key]])));
}
