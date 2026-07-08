const SCREENSHOT_EXPORT_OWNER = 'screenshot-export-runtime';

const SCREENSHOT_EXPORT_ALLOWED_FORMATS = Object.freeze(['png', 'jpeg']);
const SCREENSHOT_EXPORT_ALLOWED_SURFACES = Object.freeze(['workstation', 'chart']);
const SCREENSHOT_EXPORT_ALLOWED_FIELDS = Object.freeze([
  'sourceSurface',
  'format',
  'filename',
  'width',
  'height',
  'background',
  'metadata',
]);

const SCREENSHOT_EXPORT_BLOCKED_INTEGRATIONS = Object.freeze([
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'default-wall',
  'display-timeframe',
  'orders',
  'replay',
  'session-dashboard',
  'session-settings',
  'settings',
  'viewport',
]);

const DEFAULT_SCREENSHOT_EXPORT_INTENT = Object.freeze({
  background: 'transparent',
  controlsEnabled: false,
  filename: 'v6-workstation',
  format: 'png',
  height: null,
  metadata: null,
  readOnly: true,
  sourceSurface: 'workstation',
  width: null,
});

function normalizeText(value, fallback) {
  const normalized = String(value ?? fallback ?? '').trim();
  return normalized || fallback;
}

function normalizeFormat(value) {
  return normalizeText(value, DEFAULT_SCREENSHOT_EXPORT_INTENT.format).toLowerCase();
}

function normalizeSurface(value) {
  return normalizeText(value, DEFAULT_SCREENSHOT_EXPORT_INTENT.sourceSurface);
}

function normalizeOptionalPositiveInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return Math.trunc(parsed);
}

function normalizeMetadata(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.freeze({ ...value });
  }
  return value;
}

function isPositiveIntegerOrNull(value) {
  return value === null || (Number.isInteger(value) && value > 0);
}

function pushFieldError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

export function getScreenshotExportOwner() {
  return SCREENSHOT_EXPORT_OWNER;
}

export function getScreenshotExportAllowedFields() {
  return [...SCREENSHOT_EXPORT_ALLOWED_FIELDS];
}

export function getScreenshotExportAllowedFormats() {
  return [...SCREENSHOT_EXPORT_ALLOWED_FORMATS];
}

export function getScreenshotExportAllowedSurfaces() {
  return [...SCREENSHOT_EXPORT_ALLOWED_SURFACES];
}

export function getScreenshotExportBlockedIntegrations() {
  return [...SCREENSHOT_EXPORT_BLOCKED_INTEGRATIONS];
}

export function createDefaultScreenshotExportIntent(input = {}) {
  const intent = {
    background: normalizeText(input.background, DEFAULT_SCREENSHOT_EXPORT_INTENT.background),
    controlsEnabled: false,
    filename: normalizeText(input.filename, DEFAULT_SCREENSHOT_EXPORT_INTENT.filename),
    format: normalizeFormat(input.format),
    height: normalizeOptionalPositiveInteger(input.height),
    metadata: normalizeMetadata(input.metadata),
    readOnly: true,
    sourceSurface: normalizeSurface(input.sourceSurface),
    width: normalizeOptionalPositiveInteger(input.width),
  };

  return Object.freeze(intent);
}

export function validateScreenshotExportIntent(intent = {}) {
  const candidate = {
    ...DEFAULT_SCREENSHOT_EXPORT_INTENT,
    ...intent,
  };
  const errors = [];

  if (!SCREENSHOT_EXPORT_ALLOWED_SURFACES.includes(candidate.sourceSurface)) {
    pushFieldError(errors, 'sourceSurface', 'Screenshot export sourceSurface must be workstation or chart.');
  }
  if (!SCREENSHOT_EXPORT_ALLOWED_FORMATS.includes(candidate.format)) {
    pushFieldError(errors, 'format', 'Screenshot export format must be png or jpeg.');
  }
  if (!String(candidate.filename || '').trim()) {
    pushFieldError(errors, 'filename', 'Screenshot export filename must be a non-empty string.');
  }
  if (!isPositiveIntegerOrNull(candidate.width)) {
    pushFieldError(errors, 'width', 'Screenshot export width must be null or a positive integer.');
  }
  if (!isPositiveIntegerOrNull(candidate.height)) {
    pushFieldError(errors, 'height', 'Screenshot export height must be null or a positive integer.');
  }
  if (!String(candidate.background || '').trim()) {
    pushFieldError(errors, 'background', 'Screenshot export background must be a non-empty string.');
  }
  if (candidate.metadata !== null && (typeof candidate.metadata !== 'object' || Array.isArray(candidate.metadata))) {
    pushFieldError(errors, 'metadata', 'Screenshot export metadata must be null or an object.');
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}

export function createScreenshotExportContract() {
  return Object.freeze({
    allowedFields: getScreenshotExportAllowedFields(),
    allowedFormats: getScreenshotExportAllowedFormats(),
    allowedSurfaces: getScreenshotExportAllowedSurfaces(),
    blockedIntegrations: getScreenshotExportBlockedIntegrations(),
    commandSurfaceReady: false,
    intentReady: true,
    owner: SCREENSHOT_EXPORT_OWNER,
    persistenceReady: false,
    runtimeWiringReady: false,
    toolbarControlEnabled: false,
    writeReady: false,
  });
}
