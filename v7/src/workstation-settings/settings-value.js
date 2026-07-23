import {
  isNormalizedHexAlphaColor,
  migrateOpaqueHexColor,
} from './color-value.js';

const SETTINGS = new WeakSet();
const SCHEMA = 'v7.workstation-settings';
const VERSION = 3;
const CANVAS_ONLY_VERSION = 1;
const OPAQUE_CANDLE_VERSION = 2;

export const DEFAULT_WORKSTATION_SETTINGS = Object.freeze({
  candles: Object.freeze({
    bodyVisible: true,
    bordersVisible: true,
    downBodyColor: '#f23645ff',
    downBorderColor: '#f23645ff',
    downWickColor: '#f23645ff',
    pricePrecision: 'auto',
    upBodyColor: '#089981ff',
    upBorderColor: '#089981ff',
    upWickColor: '#089981ff',
    wicksVisible: true,
  }),
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

function color(value, field) {
  if (!isNormalizedHexAlphaColor(value)) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_CANDLE_COLOR_INVALID',
      `Candles ${field} must be an eight-digit hex-alpha color.`,
    );
  }
  return value.toLowerCase();
}

function visibility(value, field) {
  if (typeof value !== 'boolean') {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_CANDLE_VISIBILITY_INVALID',
      `Candles ${field} must be boolean.`,
    );
  }
  return value;
}

function precision(value) {
  if (value !== 'auto' && (!Number.isSafeInteger(value) || value < 0 || value > 15)) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_PRICE_PRECISION_INVALID',
      'Candles pricePrecision must be auto or an integer from 0 through 15.',
    );
  }
  return value;
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
    ['candles', 'canvas'],
    'WORKSTATION_SETTINGS_FIELDS_INVALID',
    'Workstation Settings require exact candles and canvas values.',
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
  exactObject(
    value.candles,
    [
      'bodyVisible', 'bordersVisible', 'downBodyColor', 'downBorderColor',
      'downWickColor', 'pricePrecision', 'upBodyColor', 'upBorderColor',
      'upWickColor', 'wicksVisible',
    ],
    'WORKSTATION_SETTINGS_CANDLE_FIELDS_INVALID',
    'Candles Settings fields are invalid.',
  );
  const candles = Object.freeze({
    bodyVisible: visibility(value.candles.bodyVisible, 'bodyVisible'),
    bordersVisible: visibility(value.candles.bordersVisible, 'bordersVisible'),
    downBodyColor: color(value.candles.downBodyColor, 'downBodyColor'),
    downBorderColor: color(value.candles.downBorderColor, 'downBorderColor'),
    downWickColor: color(value.candles.downWickColor, 'downWickColor'),
    pricePrecision: precision(value.candles.pricePrecision),
    upBodyColor: color(value.candles.upBodyColor, 'upBodyColor'),
    upBorderColor: color(value.candles.upBorderColor, 'upBorderColor'),
    upWickColor: color(value.candles.upWickColor, 'upWickColor'),
    wicksVisible: visibility(value.candles.wicksVisible, 'wicksVisible'),
  });
  const settings = new WorkstationSettingsValue(Object.freeze({
    candles,
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
  return JSON.stringify(readWorkstationSettings(left)) === JSON.stringify(readWorkstationSettings(right));
}

/** Serialize only the normalized committed Settings value. */
export function serializeWorkstationSettings(settings) {
  return Object.freeze({
    schema: SCHEMA,
    value: readWorkstationSettings(settings),
    version: VERSION,
  });
}

function migrateCanvasOnlyValue(value) {
  exactObject(
    value,
    ['canvas'],
    'WORKSTATION_SETTINGS_FIELDS_INVALID',
    'Legacy Workstation Settings require one canvas value.',
  );
  exactObject(
    value.canvas,
    ['gridVisible'],
    'WORKSTATION_SETTINGS_CANVAS_FIELDS_INVALID',
    'Legacy Canvas Settings require gridVisible.',
  );
  return createWorkstationSettings({
    candles: DEFAULT_WORKSTATION_SETTINGS.candles,
    canvas: { gridVisible: value.canvas.gridVisible },
  });
}

function migrateOpaqueCandleValue(value) {
  const fields = [
    'downBodyColor', 'downBorderColor', 'downWickColor',
    'upBodyColor', 'upBorderColor', 'upWickColor',
  ];
  const candles = { ...value?.candles };
  for (const field of fields) {
    const migrated = migrateOpaqueHexColor(candles[field]);
    if (migrated === null) {
      failWorkstationSettings(
        'WORKSTATION_SETTINGS_CANDLE_COLOR_INVALID',
        `Legacy candles ${field} must be a six-digit hex color.`,
      );
    }
    candles[field] = migrated;
  }
  return createWorkstationSettings({ ...value, candles });
}

/** Restore the current wire or deterministically migrate the accepted R6.9i shape. */
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
  if (wire.version === CANVAS_ONLY_VERSION) return migrateCanvasOnlyValue(wire.value);
  if (wire.version === OPAQUE_CANDLE_VERSION) return migrateOpaqueCandleValue(wire.value);
  if (wire.version !== VERSION) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_VERSION_INVALID',
      'Workstation Settings version is unsupported.',
    );
  }
  return createWorkstationSettings(wire.value);
}
