import {
  isNormalizedHexAlphaColor,
  migrateOpaqueHexColor,
} from './color-value.js';

const SETTINGS = new WeakSet();
const SCHEMA = 'v7.workstation-settings';
const VERSION = 6;
const CANVAS_ONLY_VERSION = 1;
const OPAQUE_CANDLE_VERSION = 2;
const ALPHA_CANDLE_VERSION = 3;
const STATUS_CURRENT_PRICE_VERSION = 4;
const CANVAS_PRESENTATION_VERSION = 5;

const CANVAS_FIELDS = Object.freeze([
  'backgroundColor',
  'bottomMarginPercent',
  'crosshairColor',
  'crosshairOpacityPercent',
  'crosshairStyle',
  'crosshairWidth',
  'gridVisible',
  'rightMarginBars',
  'scaleFontSize',
  'scaleTextColor',
  'topMarginPercent',
]);

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

function booleanField(value, code, message) {
  if (typeof value !== 'boolean') failWorkstationSettings(code, message);
  return value;
}

function canvasColor(value, field) {
  if (!isNormalizedHexAlphaColor(value)) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_CANVAS_COLOR_INVALID',
      `Canvas ${field} must be an eight-digit hex-alpha color.`,
    );
  }
  return value.toLowerCase();
}

function boundedInteger(value, { code, field, maximum, minimum }) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    failWorkstationSettings(code, `${field} must be an integer from ${minimum} through ${maximum}.`);
  }
  return value;
}

function enumField(value, allowed, code, field) {
  if (!allowed.includes(value)) {
    failWorkstationSettings(code, `${field} must be one of ${allowed.join(', ')}.`);
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
    ['candles', 'canvas', 'currentPrice', 'interface', 'paneReadout', 'time'],
    'WORKSTATION_SETTINGS_FIELDS_INVALID',
    'Workstation Settings require exact candles, canvas, current-price, interface, readout, and time values.',
  );
  exactObject(
    value.canvas,
    CANVAS_FIELDS,
    'WORKSTATION_SETTINGS_CANVAS_FIELDS_INVALID',
    'Canvas Settings fields are invalid.',
  );
  if (typeof value.canvas.gridVisible !== 'boolean') {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_GRID_VISIBLE_INVALID',
      'Canvas gridVisible must be boolean.',
    );
  }
  const canvas = Object.freeze({
    backgroundColor: canvasColor(value.canvas.backgroundColor, 'backgroundColor'),
    bottomMarginPercent: boundedInteger(value.canvas.bottomMarginPercent, {
      code: 'WORKSTATION_SETTINGS_CANVAS_MARGIN_INVALID',
      field: 'Canvas bottomMarginPercent', maximum: 50, minimum: 0,
    }),
    crosshairColor: canvasColor(value.canvas.crosshairColor, 'crosshairColor'),
    crosshairOpacityPercent: boundedInteger(value.canvas.crosshairOpacityPercent, {
      code: 'WORKSTATION_SETTINGS_CROSSHAIR_OPACITY_INVALID',
      field: 'Canvas crosshairOpacityPercent', maximum: 100, minimum: 0,
    }),
    crosshairStyle: enumField(
      value.canvas.crosshairStyle,
      ['solid', 'dashed', 'dotted'],
      'WORKSTATION_SETTINGS_CROSSHAIR_STYLE_INVALID',
      'Canvas crosshairStyle',
    ),
    crosshairWidth: boundedInteger(value.canvas.crosshairWidth, {
      code: 'WORKSTATION_SETTINGS_CROSSHAIR_WIDTH_INVALID',
      field: 'Canvas crosshairWidth', maximum: 4, minimum: 1,
    }),
    gridVisible: value.canvas.gridVisible,
    rightMarginBars: boundedInteger(value.canvas.rightMarginBars, {
      code: 'WORKSTATION_SETTINGS_RIGHT_MARGIN_INVALID',
      field: 'Canvas rightMarginBars', maximum: 100, minimum: 0,
    }),
    scaleFontSize: boundedInteger(value.canvas.scaleFontSize, {
      code: 'WORKSTATION_SETTINGS_SCALE_FONT_SIZE_INVALID',
      field: 'Canvas scaleFontSize', maximum: 24, minimum: 8,
    }),
    scaleTextColor: canvasColor(value.canvas.scaleTextColor, 'scaleTextColor'),
    topMarginPercent: boundedInteger(value.canvas.topMarginPercent, {
      code: 'WORKSTATION_SETTINGS_CANVAS_MARGIN_INVALID',
      field: 'Canvas topMarginPercent', maximum: 50, minimum: 0,
    }),
  });
  if (canvas.topMarginPercent + canvas.bottomMarginPercent > 90) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_CANVAS_MARGIN_SUM_INVALID',
      'Canvas top and bottom margins must total 90 percent or less.',
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
  exactObject(
    value.currentPrice,
    ['lineVisible', 'nameVisible', 'valueVisible'],
    'WORKSTATION_SETTINGS_CURRENT_PRICE_FIELDS_INVALID',
    'Current-price Settings fields are invalid.',
  );
  const currentPrice = Object.freeze({
    lineVisible: booleanField(
      value.currentPrice.lineVisible,
      'WORKSTATION_SETTINGS_CURRENT_PRICE_VISIBILITY_INVALID',
      'Current-price lineVisible must be boolean.',
    ),
    nameVisible: booleanField(
      value.currentPrice.nameVisible,
      'WORKSTATION_SETTINGS_CURRENT_PRICE_VISIBILITY_INVALID',
      'Current-price nameVisible must be boolean.',
    ),
    valueVisible: booleanField(
      value.currentPrice.valueVisible,
      'WORKSTATION_SETTINGS_CURRENT_PRICE_VISIBILITY_INVALID',
      'Current-price valueVisible must be boolean.',
    ),
  });
  exactObject(
    value.interface,
    ['paneControlDockVisibility'],
    'WORKSTATION_SETTINGS_INTERFACE_FIELDS_INVALID',
    'Interface Settings fields are invalid.',
  );
  const interfaceSettings = Object.freeze({
    paneControlDockVisibility: enumField(
      value.interface.paneControlDockVisibility,
      ['hover', 'always', 'hidden'],
      'WORKSTATION_SETTINGS_PANE_CONTROL_VISIBILITY_INVALID',
      'Interface paneControlDockVisibility',
    ),
  });
  exactObject(
    value.paneReadout,
    ['changeVisible', 'ohlcVisible', 'volumeVisible'],
    'WORKSTATION_SETTINGS_PANE_READOUT_FIELDS_INVALID',
    'Pane readout Settings fields are invalid.',
  );
  const paneReadout = Object.freeze({
    changeVisible: booleanField(
      value.paneReadout.changeVisible,
      'WORKSTATION_SETTINGS_PANE_READOUT_VISIBILITY_INVALID',
      'Pane readout changeVisible must be boolean.',
    ),
    ohlcVisible: booleanField(
      value.paneReadout.ohlcVisible,
      'WORKSTATION_SETTINGS_PANE_READOUT_VISIBILITY_INVALID',
      'Pane readout ohlcVisible must be boolean.',
    ),
    volumeVisible: booleanField(
      value.paneReadout.volumeVisible,
      'WORKSTATION_SETTINGS_PANE_READOUT_VISIBILITY_INVALID',
      'Pane readout volumeVisible must be boolean.',
    ),
  });
  exactObject(
    value.time,
    ['dateFormat', 'dayOfWeekVisible', 'displayTimezone', 'hourFormat'],
    'WORKSTATION_SETTINGS_TIME_FIELDS_INVALID',
    'Time presentation Settings fields are invalid.',
  );
  const time = Object.freeze({
    dateFormat: enumField(
      value.time.dateFormat,
      ['YYYY-MM-DD', 'YYYY/MM/DD', 'DD/MM/YYYY', 'MM/DD/YYYY'],
      'WORKSTATION_SETTINGS_DATE_FORMAT_INVALID',
      'Time dateFormat',
    ),
    dayOfWeekVisible: booleanField(
      value.time.dayOfWeekVisible,
      'WORKSTATION_SETTINGS_DAY_OF_WEEK_INVALID',
      'Time dayOfWeekVisible must be boolean.',
    ),
    displayTimezone: enumField(
      value.time.displayTimezone,
      ['America/New_York', 'UTC', 'local'],
      'WORKSTATION_SETTINGS_DISPLAY_TIMEZONE_INVALID',
      'Time displayTimezone',
    ),
    hourFormat: enumField(
      value.time.hourFormat,
      ['12-hour', '24-hour'],
      'WORKSTATION_SETTINGS_HOUR_FORMAT_INVALID',
      'Time hourFormat',
    ),
  });
  const settings = new WorkstationSettingsValue(Object.freeze({
    candles,
    canvas,
    currentPrice,
    interface: interfaceSettings,
    paneReadout,
    time,
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
