import { isNormalizedHexAlphaColor } from './color-value.js';
import { failWorkstationSettings } from './settings-error.js';

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

function exactObject(value, fields, code, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failWorkstationSettings(code, message);
  }
}

function color(value, scope, field) {
  if (!isNormalizedHexAlphaColor(value)) {
    failWorkstationSettings(
      `WORKSTATION_SETTINGS_${scope.toUpperCase()}_COLOR_INVALID`,
      `${scope === 'candle' ? 'Candles' : 'Canvas'} ${field} must be an eight-digit hex-alpha color.`,
    );
  }
  return value.toLowerCase();
}

function booleanField(value, code, message) {
  if (typeof value !== 'boolean') failWorkstationSettings(code, message);
  return value;
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

function normalizeCanvas(value) {
  exactObject(value, CANVAS_FIELDS, 'WORKSTATION_SETTINGS_CANVAS_FIELDS_INVALID', 'Canvas Settings fields are invalid.');
  const canvas = Object.freeze({
    backgroundColor: color(value.backgroundColor, 'canvas', 'backgroundColor'),
    bottomMarginPercent: boundedInteger(value.bottomMarginPercent, {
      code: 'WORKSTATION_SETTINGS_CANVAS_MARGIN_INVALID',
      field: 'Canvas bottomMarginPercent', maximum: 50, minimum: 0,
    }),
    crosshairColor: color(value.crosshairColor, 'canvas', 'crosshairColor'),
    crosshairOpacityPercent: boundedInteger(value.crosshairOpacityPercent, {
      code: 'WORKSTATION_SETTINGS_CROSSHAIR_OPACITY_INVALID',
      field: 'Canvas crosshairOpacityPercent', maximum: 100, minimum: 0,
    }),
    crosshairStyle: enumField(value.crosshairStyle, ['solid', 'dashed', 'dotted'],
      'WORKSTATION_SETTINGS_CROSSHAIR_STYLE_INVALID', 'Canvas crosshairStyle'),
    crosshairWidth: boundedInteger(value.crosshairWidth, {
      code: 'WORKSTATION_SETTINGS_CROSSHAIR_WIDTH_INVALID',
      field: 'Canvas crosshairWidth', maximum: 4, minimum: 1,
    }),
    gridVisible: booleanField(value.gridVisible, 'WORKSTATION_SETTINGS_GRID_VISIBLE_INVALID',
      'Canvas gridVisible must be boolean.'),
    rightMarginBars: boundedInteger(value.rightMarginBars, {
      code: 'WORKSTATION_SETTINGS_RIGHT_MARGIN_INVALID',
      field: 'Canvas rightMarginBars', maximum: 100, minimum: 0,
    }),
    scaleFontSize: boundedInteger(value.scaleFontSize, {
      code: 'WORKSTATION_SETTINGS_SCALE_FONT_SIZE_INVALID',
      field: 'Canvas scaleFontSize', maximum: 24, minimum: 8,
    }),
    scaleTextColor: color(value.scaleTextColor, 'canvas', 'scaleTextColor'),
    topMarginPercent: boundedInteger(value.topMarginPercent, {
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
  return canvas;
}

function normalizeCandles(value) {
  exactObject(value, [
    'bodyVisible', 'bordersVisible', 'downBodyColor', 'downBorderColor',
    'downWickColor', 'pricePrecision', 'upBodyColor', 'upBorderColor',
    'upWickColor', 'wicksVisible',
  ], 'WORKSTATION_SETTINGS_CANDLE_FIELDS_INVALID', 'Candles Settings fields are invalid.');
  return Object.freeze({
    bodyVisible: booleanField(value.bodyVisible, 'WORKSTATION_SETTINGS_CANDLE_VISIBILITY_INVALID',
      'Candles bodyVisible must be boolean.'),
    bordersVisible: booleanField(value.bordersVisible, 'WORKSTATION_SETTINGS_CANDLE_VISIBILITY_INVALID',
      'Candles bordersVisible must be boolean.'),
    downBodyColor: color(value.downBodyColor, 'candle', 'downBodyColor'),
    downBorderColor: color(value.downBorderColor, 'candle', 'downBorderColor'),
    downWickColor: color(value.downWickColor, 'candle', 'downWickColor'),
    pricePrecision: precision(value.pricePrecision),
    upBodyColor: color(value.upBodyColor, 'candle', 'upBodyColor'),
    upBorderColor: color(value.upBorderColor, 'candle', 'upBorderColor'),
    upWickColor: color(value.upWickColor, 'candle', 'upWickColor'),
    wicksVisible: booleanField(value.wicksVisible, 'WORKSTATION_SETTINGS_CANDLE_VISIBILITY_INVALID',
      'Candles wicksVisible must be boolean.'),
  });
}

function normalizeVisibilityGroup(value, fields, prefix, label) {
  exactObject(value, fields, `WORKSTATION_SETTINGS_${prefix}_FIELDS_INVALID`, `${label} Settings fields are invalid.`);
  return Object.freeze(Object.fromEntries(fields.map((field) => [field, booleanField(
    value[field],
    `WORKSTATION_SETTINGS_${prefix}_VISIBILITY_INVALID`,
    `${label} ${field} must be boolean.`,
  )])));
}

function normalizeInterface(value) {
  exactObject(value, ['paneControlDockVisibility'], 'WORKSTATION_SETTINGS_INTERFACE_FIELDS_INVALID',
    'Interface Settings fields are invalid.');
  return Object.freeze({
    paneControlDockVisibility: enumField(value.paneControlDockVisibility, ['hover', 'always', 'hidden'],
      'WORKSTATION_SETTINGS_PANE_CONTROL_VISIBILITY_INVALID', 'Interface paneControlDockVisibility'),
  });
}

function normalizePaneReadout(value) {
  exactObject(value, ['changeVisible', 'fontSize', 'ohlcVisible', 'volumeVisible'],
    'WORKSTATION_SETTINGS_PANE_READOUT_FIELDS_INVALID', 'Pane readout Settings fields are invalid.');
  return Object.freeze({
    changeVisible: booleanField(value.changeVisible,
      'WORKSTATION_SETTINGS_PANE_READOUT_VISIBILITY_INVALID',
      'Pane readout changeVisible must be boolean.'),
    fontSize: boundedInteger(value.fontSize, {
      code: 'WORKSTATION_SETTINGS_PANE_READOUT_FONT_SIZE_INVALID',
      field: 'Pane readout fontSize', maximum: 18, minimum: 10,
    }),
    ohlcVisible: booleanField(value.ohlcVisible,
      'WORKSTATION_SETTINGS_PANE_READOUT_VISIBILITY_INVALID',
      'Pane readout ohlcVisible must be boolean.'),
    volumeVisible: booleanField(value.volumeVisible,
      'WORKSTATION_SETTINGS_PANE_READOUT_VISIBILITY_INVALID',
      'Pane readout volumeVisible must be boolean.'),
  });
}

function normalizeTime(value) {
  exactObject(value, ['dateFormat', 'dayOfWeekVisible', 'displayTimezone', 'hourFormat'],
    'WORKSTATION_SETTINGS_TIME_FIELDS_INVALID', 'Time presentation Settings fields are invalid.');
  return Object.freeze({
    dateFormat: enumField(value.dateFormat, ['YYYY-MM-DD', 'YYYY/MM/DD', 'DD/MM/YYYY', 'MM/DD/YYYY'],
      'WORKSTATION_SETTINGS_DATE_FORMAT_INVALID', 'Time dateFormat'),
    dayOfWeekVisible: booleanField(value.dayOfWeekVisible, 'WORKSTATION_SETTINGS_DAY_OF_WEEK_INVALID',
      'Time dayOfWeekVisible must be boolean.'),
    displayTimezone: enumField(value.displayTimezone, ['America/New_York', 'UTC', 'local'],
      'WORKSTATION_SETTINGS_DISPLAY_TIMEZONE_INVALID', 'Time displayTimezone'),
    hourFormat: enumField(value.hourFormat, ['12-hour', '24-hour'],
      'WORKSTATION_SETTINGS_HOUR_FORMAT_INVALID', 'Time hourFormat'),
  });
}

export function normalizeWorkstationSettingsValue(value) {
  exactObject(value, ['candles', 'canvas', 'currentPrice', 'interface', 'paneReadout', 'time'],
    'WORKSTATION_SETTINGS_FIELDS_INVALID',
    'Workstation Settings require exact candles, canvas, current-price, interface, readout, and time values.');
  return Object.freeze({
    candles: normalizeCandles(value.candles),
    canvas: normalizeCanvas(value.canvas),
    currentPrice: normalizeVisibilityGroup(value.currentPrice,
      ['lineVisible', 'nameVisible', 'valueVisible'], 'CURRENT_PRICE', 'Current-price'),
    interface: normalizeInterface(value.interface),
    paneReadout: normalizePaneReadout(value.paneReadout),
    time: normalizeTime(value.time),
  });
}
