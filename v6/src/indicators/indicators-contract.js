const INDICATORS_OWNER = 'indicators-runtime';

const INDICATORS_ALLOWED_IDS = Object.freeze([
  'sma',
  'ema',
  'rsi',
  'macd',
  'volume',
  'vwap',
  'atr',
]);

const INDICATORS_ALLOWED_SOURCE_SERIES = Object.freeze([
  'open',
  'high',
  'low',
  'close',
  'hl2',
  'hlc3',
  'ohlc4',
  'volume',
]);

const INDICATORS_ALLOWED_PANE_PLACEMENTS = Object.freeze(['overlay', 'separate']);

const INDICATORS_ALLOWED_FIELDS = Object.freeze([
  'indicatorId',
  'sourceSeries',
  'panePlacement',
  'inputs',
  'style',
  'visible',
  'metadata',
]);

const INDICATORS_BLOCKED_INTEGRATIONS = Object.freeze([
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'default-wall',
  'display-timeframe',
  'orders',
  'replay',
  'screenshot-export',
  'session-dashboard',
  'session-settings',
  'settings',
  'viewport',
]);

const DEFAULT_INDICATOR_INTENT = Object.freeze({
  controlsEnabled: false,
  indicatorId: 'sma',
  inputs: Object.freeze({ length: 20 }),
  metadata: null,
  panePlacement: 'overlay',
  readOnly: true,
  sourceSeries: 'close',
  style: Object.freeze({ color: '#4ea1ff', lineWidth: 2 }),
  visible: true,
});

function normalizeText(value, fallback) {
  const normalized = String(value ?? fallback ?? '').trim();
  return normalized || fallback;
}

function normalizeObject(value, fallback) {
  if (value === null || value === undefined) {
    return fallback === null ? null : Object.freeze({ ...fallback });
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.freeze({ ...value });
  }
  return value;
}

function isPlainObjectOrNull(value) {
  return value === null || (typeof value === 'object' && !Array.isArray(value));
}

function pushFieldError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

export function getIndicatorsOwner() {
  return INDICATORS_OWNER;
}

export function getIndicatorsAllowedIds() {
  return [...INDICATORS_ALLOWED_IDS];
}

export function getIndicatorsAllowedSourceSeries() {
  return [...INDICATORS_ALLOWED_SOURCE_SERIES];
}

export function getIndicatorsAllowedPanePlacements() {
  return [...INDICATORS_ALLOWED_PANE_PLACEMENTS];
}

export function getIndicatorsAllowedFields() {
  return [...INDICATORS_ALLOWED_FIELDS];
}

export function getIndicatorsBlockedIntegrations() {
  return [...INDICATORS_BLOCKED_INTEGRATIONS];
}

export function createDefaultIndicatorIntent(input = {}) {
  const intent = {
    controlsEnabled: false,
    indicatorId: normalizeText(input.indicatorId, DEFAULT_INDICATOR_INTENT.indicatorId).toLowerCase(),
    inputs: normalizeObject(input.inputs, DEFAULT_INDICATOR_INTENT.inputs),
    metadata: normalizeObject(input.metadata, DEFAULT_INDICATOR_INTENT.metadata),
    panePlacement: normalizeText(input.panePlacement, DEFAULT_INDICATOR_INTENT.panePlacement),
    readOnly: true,
    sourceSeries: normalizeText(input.sourceSeries, DEFAULT_INDICATOR_INTENT.sourceSeries),
    style: normalizeObject(input.style, DEFAULT_INDICATOR_INTENT.style),
    visible: input.visible === undefined ? DEFAULT_INDICATOR_INTENT.visible : Boolean(input.visible),
  };

  return Object.freeze(intent);
}

export function validateIndicatorIntent(intent = {}) {
  const candidate = {
    ...DEFAULT_INDICATOR_INTENT,
    ...intent,
  };
  const errors = [];

  if (!INDICATORS_ALLOWED_IDS.includes(candidate.indicatorId)) {
    pushFieldError(errors, 'indicatorId', 'Indicator id must be a supported built-in indicator.');
  }
  if (!INDICATORS_ALLOWED_SOURCE_SERIES.includes(candidate.sourceSeries)) {
    pushFieldError(errors, 'sourceSeries', 'Indicator sourceSeries must be a supported price or volume source.');
  }
  if (!INDICATORS_ALLOWED_PANE_PLACEMENTS.includes(candidate.panePlacement)) {
    pushFieldError(errors, 'panePlacement', 'Indicator panePlacement must be overlay or separate.');
  }
  if (!isPlainObjectOrNull(candidate.inputs)) {
    pushFieldError(errors, 'inputs', 'Indicator inputs must be an object or null.');
  }
  if (!isPlainObjectOrNull(candidate.style)) {
    pushFieldError(errors, 'style', 'Indicator style must be an object or null.');
  }
  if (typeof candidate.visible !== 'boolean') {
    pushFieldError(errors, 'visible', 'Indicator visible must be boolean.');
  }
  if (!isPlainObjectOrNull(candidate.metadata)) {
    pushFieldError(errors, 'metadata', 'Indicator metadata must be an object or null.');
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}

export function createIndicatorsContract() {
  return Object.freeze({
    allowedFields: getIndicatorsAllowedFields(),
    allowedIds: getIndicatorsAllowedIds(),
    allowedPanePlacements: getIndicatorsAllowedPanePlacements(),
    allowedSourceSeries: getIndicatorsAllowedSourceSeries(),
    blockedIntegrations: getIndicatorsBlockedIntegrations(),
    calculationReady: false,
    commandSurfaceReady: false,
    customDefinitionsReady: false,
    intentReady: true,
    owner: INDICATORS_OWNER,
    paneCreationReady: false,
    persistenceReady: false,
    runtimeWiringReady: false,
    toolbarControlEnabled: false,
    writeReady: false,
  });
}
