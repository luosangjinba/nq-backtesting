const DRAWING_ACTION_HISTORY_OWNER = 'drawing-action-history-runtime';

const DRAWING_ALLOWED_TOOL_IDS = Object.freeze([
  'cursor',
  'trend-line',
  'horizontal-line',
  'rectangle',
  'measure',
  'text',
]);

const DRAWING_ALLOWED_FIELDS = Object.freeze([
  'toolId',
  'anchorPoints',
  'targetPane',
  'style',
  'label',
  'visible',
  'metadata',
]);

const ACTION_HISTORY_ALLOWED_FIELDS = Object.freeze([
  'actionId',
  'actionType',
  'target',
  'timestamp',
  'metadata',
]);

const ACTION_HISTORY_ALLOWED_TYPES = Object.freeze([
  'create-drawing',
  'update-drawing',
  'delete-drawing',
]);

const DRAWING_ACTION_HISTORY_BLOCKED_INTEGRATIONS = Object.freeze([
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'default-wall',
  'display-timeframe',
  'indicators',
  'orders',
  'replay',
  'screenshot-export',
  'session-dashboard',
  'session-settings',
  'settings',
  'viewport',
]);

const DEFAULT_DRAWING_INTENT = Object.freeze({
  anchorPoints: Object.freeze([]),
  controlsEnabled: false,
  label: '',
  metadata: null,
  readOnly: true,
  style: Object.freeze({ color: '#f5c542', lineWidth: 1 }),
  targetPane: 'main',
  toolId: 'cursor',
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

function normalizeAnchorPoints(value) {
  if (value === null || value === undefined) {
    return Object.freeze([]);
  }
  if (!Array.isArray(value)) {
    return value;
  }
  return Object.freeze(value.map((point) => (
    typeof point === 'object' && point !== null && !Array.isArray(point)
      ? Object.freeze({ ...point })
      : point
  )));
}

function isPlainObjectOrNull(value) {
  return value === null || (typeof value === 'object' && !Array.isArray(value));
}

function hasValidAnchorPoints(value) {
  return Array.isArray(value) && value.every((point) => {
    if (typeof point !== 'object' || point === null || Array.isArray(point)) return false;
    const hasFiniteTime = typeof point.time === 'string' ? point.time.trim().length > 0 : Number.isFinite(point.time);
    return hasFiniteTime && Number.isFinite(Number(point.price));
  });
}

function pushFieldError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

export function getDrawingActionHistoryOwner() {
  return DRAWING_ACTION_HISTORY_OWNER;
}

export function getDrawingAllowedToolIds() {
  return [...DRAWING_ALLOWED_TOOL_IDS];
}

export function getDrawingAllowedFields() {
  return [...DRAWING_ALLOWED_FIELDS];
}

export function getActionHistoryAllowedFields() {
  return [...ACTION_HISTORY_ALLOWED_FIELDS];
}

export function getActionHistoryAllowedTypes() {
  return [...ACTION_HISTORY_ALLOWED_TYPES];
}

export function getDrawingActionHistoryBlockedIntegrations() {
  return [...DRAWING_ACTION_HISTORY_BLOCKED_INTEGRATIONS];
}

export function createDefaultDrawingIntent(input = {}) {
  const intent = {
    anchorPoints: normalizeAnchorPoints(input.anchorPoints),
    controlsEnabled: false,
    label: normalizeText(input.label, DEFAULT_DRAWING_INTENT.label),
    metadata: normalizeObject(input.metadata, DEFAULT_DRAWING_INTENT.metadata),
    readOnly: true,
    style: normalizeObject(input.style, DEFAULT_DRAWING_INTENT.style),
    targetPane: normalizeText(input.targetPane, DEFAULT_DRAWING_INTENT.targetPane),
    toolId: normalizeText(input.toolId, DEFAULT_DRAWING_INTENT.toolId),
    visible: input.visible === undefined ? DEFAULT_DRAWING_INTENT.visible : Boolean(input.visible),
  };

  return Object.freeze(intent);
}

export function validateDrawingIntent(intent = {}) {
  const candidate = {
    ...DEFAULT_DRAWING_INTENT,
    ...intent,
  };
  const errors = [];

  if (!DRAWING_ALLOWED_TOOL_IDS.includes(candidate.toolId)) {
    pushFieldError(errors, 'toolId', 'Drawing toolId must be a supported built-in drawing tool.');
  }
  if (!hasValidAnchorPoints(candidate.anchorPoints)) {
    pushFieldError(errors, 'anchorPoints', 'Drawing anchorPoints must be an array of points with time and price.');
  }
  if (!String(candidate.targetPane || '').trim()) {
    pushFieldError(errors, 'targetPane', 'Drawing targetPane must be a non-empty string.');
  }
  if (!isPlainObjectOrNull(candidate.style)) {
    pushFieldError(errors, 'style', 'Drawing style must be an object or null.');
  }
  if (typeof candidate.label !== 'string') {
    pushFieldError(errors, 'label', 'Drawing label must be a string.');
  }
  if (typeof candidate.visible !== 'boolean') {
    pushFieldError(errors, 'visible', 'Drawing visible must be boolean.');
  }
  if (!isPlainObjectOrNull(candidate.metadata)) {
    pushFieldError(errors, 'metadata', 'Drawing metadata must be an object or null.');
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}

export function createDrawingActionHistoryContract() {
  return Object.freeze({
    actionHistoryAllowedFields: getActionHistoryAllowedFields(),
    actionHistoryAllowedTypes: getActionHistoryAllowedTypes(),
    actionHistoryReady: false,
    blockedIntegrations: getDrawingActionHistoryBlockedIntegrations(),
    commandSurfaceReady: false,
    drawingAllowedFields: getDrawingAllowedFields(),
    drawingAllowedToolIds: getDrawingAllowedToolIds(),
    drawingCreationReady: false,
    intentReady: true,
    owner: DRAWING_ACTION_HISTORY_OWNER,
    overlayWriteReady: false,
    paneMutationReady: false,
    persistenceReady: false,
    railControlsEnabled: false,
    runtimeWiringReady: false,
    undoRedoEnabled: false,
    writeReady: false,
  });
}
