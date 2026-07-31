import {
  migrateOpaqueHexColor,
} from './color-value.js';
import { failWorkstationSettings } from './settings-error.js';
import { normalizeWorkstationSettingsValue } from './settings-normalization.js';

export { failWorkstationSettings, WorkstationSettingsError } from './settings-error.js';

const SETTINGS = new WeakSet();
const SCHEMA = 'v7.workstation-settings';
const VERSION = 6;
const CANVAS_ONLY_VERSION = 1;
const OPAQUE_CANDLE_VERSION = 2;
const ALPHA_CANDLE_VERSION = 3;
const STATUS_CURRENT_PRICE_VERSION = 4;
const CANVAS_PRESENTATION_VERSION = 5;

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
  canvas: Object.freeze({
    backgroundColor: '#000000ff',
    bottomMarginPercent: 12,
    crosshairColor: '#758696ff',
    crosshairOpacityPercent: 100,
    crosshairStyle: 'dashed',
    crosshairWidth: 1,
    gridVisible: true,
    rightMarginBars: 12,
    scaleFontSize: 12,
    scaleTextColor: '#b8bdc5ff',
    topMarginPercent: 10,
  }),
  currentPrice: Object.freeze({
    lineVisible: true,
    nameVisible: true,
    valueVisible: true,
  }),
  interface: Object.freeze({ paneControlDockVisibility: 'hover' }),
  paneReadout: Object.freeze({
    changeVisible: true,
    ohlcVisible: true,
    volumeVisible: false,
  }),
  time: Object.freeze({
    dateFormat: 'MM/DD/YYYY',
    dayOfWeekVisible: false,
    displayTimezone: 'America/New_York',
    hourFormat: '24-hour',
  }),
});

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
  const settings = new WorkstationSettingsValue(normalizeWorkstationSettingsValue(value));
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
    canvas: { ...DEFAULT_WORKSTATION_SETTINGS.canvas, gridVisible: value.canvas.gridVisible },
    currentPrice: DEFAULT_WORKSTATION_SETTINGS.currentPrice,
    interface: DEFAULT_WORKSTATION_SETTINGS.interface,
    paneReadout: DEFAULT_WORKSTATION_SETTINGS.paneReadout,
    time: DEFAULT_WORKSTATION_SETTINGS.time,
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
  return createWorkstationSettings({
    ...value,
    candles,
    canvas: { ...DEFAULT_WORKSTATION_SETTINGS.canvas, gridVisible: value.canvas.gridVisible },
    currentPrice: DEFAULT_WORKSTATION_SETTINGS.currentPrice,
    interface: DEFAULT_WORKSTATION_SETTINGS.interface,
    paneReadout: DEFAULT_WORKSTATION_SETTINGS.paneReadout,
    time: DEFAULT_WORKSTATION_SETTINGS.time,
  });
}

function migrateAlphaCandleValue(value) {
  return createWorkstationSettings({
    ...value,
    canvas: { ...DEFAULT_WORKSTATION_SETTINGS.canvas, gridVisible: value.canvas.gridVisible },
    currentPrice: DEFAULT_WORKSTATION_SETTINGS.currentPrice,
    interface: DEFAULT_WORKSTATION_SETTINGS.interface,
    paneReadout: DEFAULT_WORKSTATION_SETTINGS.paneReadout,
    time: DEFAULT_WORKSTATION_SETTINGS.time,
  });
}

function migrateStatusCurrentPriceValue(value) {
  return createWorkstationSettings({
    ...value,
    canvas: { ...DEFAULT_WORKSTATION_SETTINGS.canvas, gridVisible: value.canvas.gridVisible },
    interface: DEFAULT_WORKSTATION_SETTINGS.interface,
    time: DEFAULT_WORKSTATION_SETTINGS.time,
  });
}

function migrateCanvasPresentationValue(value) {
  return createWorkstationSettings({
    ...value,
    time: DEFAULT_WORKSTATION_SETTINGS.time,
  });
}

/** Restore the current wire or deterministically migrate every accepted prior shape. */
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
  if (wire.version === ALPHA_CANDLE_VERSION) return migrateAlphaCandleValue(wire.value);
  if (wire.version === STATUS_CURRENT_PRICE_VERSION) return migrateStatusCurrentPriceValue(wire.value);
  if (wire.version === CANVAS_PRESENTATION_VERSION) return migrateCanvasPresentationValue(wire.value);
  if (wire.version !== VERSION) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_VERSION_INVALID',
      'Workstation Settings version is unsupported.',
    );
  }
  return createWorkstationSettings(wire.value);
}
