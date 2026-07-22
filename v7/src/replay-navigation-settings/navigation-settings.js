const SETTINGS = new WeakSet();
const SCHEMA = 'v7.replay-navigation-settings';
const VERSION = 1;
const FIELDS = Object.freeze([
  'asianSession',
  'dayOpen',
  'londonSession',
  'newYorkSession',
  'silverBulletLondon',
  'silverBulletNewYorkAm',
  'silverBulletNewYorkPm',
]);

export const DEFAULT_REPLAY_NAVIGATION_SETTINGS = Object.freeze({
  asianSession: '19:00',
  dayOpen: '18:00',
  londonSession: '02:00',
  newYorkSession: '09:30',
  silverBulletLondon: '03:00',
  silverBulletNewYorkAm: '10:00',
  silverBulletNewYorkPm: '14:00',
});

export class ReplayNavigationSettingsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReplayNavigationSettingsError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new ReplayNavigationSettingsError(code, message);
}

function exactFields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...FIELDS].sort().join(',')) {
    fail('REPLAY_NAVIGATION_SETTINGS_FIELDS_INVALID', 'Navigation settings require seven exact time fields.');
  }
}

function time(value, field) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    fail('REPLAY_NAVIGATION_SETTINGS_TIME_INVALID', `${field} must use HH:mm.`);
  }
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) {
    fail('REPLAY_NAVIGATION_SETTINGS_TIME_INVALID', `${field} must be a valid time.`);
  }
  return value;
}

class ReplayNavigationSettingsValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

/** Create one immutable seven-time New York quick-GoTo settings value. */
export function createReplayNavigationSettings(value = DEFAULT_REPLAY_NAVIGATION_SETTINGS) {
  exactFields(value);
  const settings = new ReplayNavigationSettingsValue(Object.fromEntries(
    FIELDS.map((field) => [field, time(value[field], field)]),
  ));
  SETTINGS.add(settings);
  return settings;
}

/** Read a branded settings value without exposing mutable state. */
export function readReplayNavigationSettings(candidate) {
  if (!candidate || !SETTINGS.has(candidate)) {
    fail('REPLAY_NAVIGATION_SETTINGS_REQUIRED', 'Branded Replay navigation settings are required.');
  }
  return candidate.read();
}

/** Serialize settings for Session-owned durable storage. */
export function serializeReplayNavigationSettings(settings) {
  return Object.freeze({
    anchors: readReplayNavigationSettings(settings),
    schema: SCHEMA,
    version: VERSION,
  });
}

/** Restore one current settings value from its exact versioned wire shape. */
export function deserializeReplayNavigationSettings(wire) {
  if (!wire || typeof wire !== 'object' || Array.isArray(wire)
    || Object.keys(wire).sort().join(',') !== 'anchors,schema,version') {
    fail('REPLAY_NAVIGATION_SETTINGS_WIRE_INVALID', 'Navigation settings wire shape is invalid.');
  }
  if (wire.schema !== SCHEMA) {
    fail('REPLAY_NAVIGATION_SETTINGS_SCHEMA_INVALID', 'Navigation settings schema is unsupported.');
  }
  if (wire.version !== VERSION) {
    fail('REPLAY_NAVIGATION_SETTINGS_VERSION_INVALID', 'Navigation settings version is unsupported.');
  }
  return createReplayNavigationSettings(wire.anchors);
}
