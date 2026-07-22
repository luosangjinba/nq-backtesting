const SETTINGS = new WeakSet();
const SCHEMA = 'v7.workstation-settings';
const VERSION = 1;

export const DEFAULT_WORKSTATION_SETTINGS = Object.freeze({
  canvas: Object.freeze({ gridVisible: true }),
});

export class WorkstationSettingsError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'WorkstationSettingsError';
    this.code = code;
  }
}

export function failWorkstationSettings(code, message, options) {
  throw new WorkstationSettingsError(code, message, options);
}

function exactObject(value, fields, code, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failWorkstationSettings(code, message);
  }
}

class WorkstationSettingsValue {
  #value;

  constructor(value) {
    this.#value = value;
    Object.freeze(this);
  }

  read() { return this.#value; }
}

/** Create the immutable global presentation value activated by the current schema. */
export function createWorkstationSettings(value = DEFAULT_WORKSTATION_SETTINGS) {
  exactObject(
    value,
    ['canvas'],
    'WORKSTATION_SETTINGS_FIELDS_INVALID',
    'Workstation Settings require one exact canvas value.',
  );
  exactObject(
    value.canvas,
    ['gridVisible'],
    'WORKSTATION_SETTINGS_CANVAS_FIELDS_INVALID',
    'Canvas Settings require one exact gridVisible value.',
  );
  if (typeof value.canvas.gridVisible !== 'boolean') {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_GRID_VISIBLE_INVALID',
      'Canvas gridVisible must be boolean.',
    );
  }
  const settings = new WorkstationSettingsValue(Object.freeze({
    canvas: Object.freeze({ gridVisible: value.canvas.gridVisible }),
  }));
  SETTINGS.add(settings);
  return settings;
}

/** Read a branded Settings value without exposing mutable state. */
export function readWorkstationSettings(candidate) {
  if (!candidate || !SETTINGS.has(candidate)) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_REQUIRED',
      'A branded Workstation Settings value is required.',
    );
  }
  return candidate.read();
}

export function workstationSettingsEqual(left, right) {
  return readWorkstationSettings(left).canvas.gridVisible
    === readWorkstationSettings(right).canvas.gridVisible;
}

/** Serialize only the normalized committed Settings value. */
export function serializeWorkstationSettings(settings) {
  return Object.freeze({
    schema: SCHEMA,
    value: readWorkstationSettings(settings),
    version: VERSION,
  });
}

/** Restore the current exact versioned Settings wire shape. */
export function deserializeWorkstationSettings(wire) {
  exactObject(
    wire,
    ['schema', 'value', 'version'],
    'WORKSTATION_SETTINGS_WIRE_INVALID',
    'Workstation Settings wire shape is invalid.',
  );
  if (wire.schema !== SCHEMA) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_SCHEMA_INVALID',
      'Workstation Settings schema is unsupported.',
    );
  }
  if (wire.version !== VERSION) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_VERSION_INVALID',
      'Workstation Settings version is unsupported.',
    );
  }
  return createWorkstationSettings(wire.value);
}
