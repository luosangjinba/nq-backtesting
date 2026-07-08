const SESSION_SETTINGS_OWNER = 'session-settings-runtime';

const SESSION_SETTINGS_FIELD_GROUPS = Object.freeze([
  Object.freeze({
    id: 'sessionInfo',
    label: 'Session Info',
    fields: Object.freeze(['name', 'profileId']),
  }),
  Object.freeze({
    id: 'balanceAssets',
    label: 'Balance & Assets',
    fields: Object.freeze(['balance', 'asset']),
  }),
  Object.freeze({
    id: 'spreadsCommissions',
    label: 'Spreads & Commissions',
    fields: Object.freeze(['spread', 'commission']),
  }),
  Object.freeze({
    id: 'dateRange',
    label: 'Date Range',
    fields: Object.freeze(['startTime', 'endTime']),
  }),
]);

const SESSION_SETTINGS_ALLOWED_FIELDS = Object.freeze(
  SESSION_SETTINGS_FIELD_GROUPS.flatMap((group) => group.fields),
);

const SESSION_SETTINGS_BLOCKED_INTEGRATIONS = Object.freeze([
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
  'settings',
  'viewport',
]);

const DEFAULT_SESSION_SETTINGS_DRAFT = Object.freeze({
  asset: 'USD',
  balance: null,
  commission: 0,
  controlsEnabled: false,
  endTime: null,
  name: 'Backtesting session',
  profileId: 'default-profile',
  readOnly: true,
  spread: 0,
  startTime: null,
});

function cloneFieldGroups() {
  return SESSION_SETTINGS_FIELD_GROUPS.map((group) => ({
    fields: [...group.fields],
    id: group.id,
    label: group.label,
  }));
}

function normalizeOptionalText(value, fallback) {
  const normalized = String(value ?? fallback ?? '').trim();
  return normalized || fallback;
}

function normalizeOptionalNumber(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function normalizeOptionalIsoTime(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toISOString();
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function pushFieldError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

export function getSessionSettingsOwner() {
  return SESSION_SETTINGS_OWNER;
}

export function getSessionSettingsFieldGroups() {
  return cloneFieldGroups();
}

export function getSessionSettingsAllowedFields() {
  return [...SESSION_SETTINGS_ALLOWED_FIELDS];
}

export function getSessionSettingsBlockedIntegrations() {
  return [...SESSION_SETTINGS_BLOCKED_INTEGRATIONS];
}

export function createDefaultSessionSettingsDraft(input = {}) {
  const draft = {
    asset: normalizeOptionalText(input.asset, DEFAULT_SESSION_SETTINGS_DRAFT.asset),
    balance: normalizeOptionalNumber(input.balance, DEFAULT_SESSION_SETTINGS_DRAFT.balance),
    commission: normalizeOptionalNumber(input.commission, DEFAULT_SESSION_SETTINGS_DRAFT.commission),
    controlsEnabled: false,
    endTime: normalizeOptionalIsoTime(input.endTime),
    name: normalizeOptionalText(input.name, DEFAULT_SESSION_SETTINGS_DRAFT.name),
    profileId: normalizeOptionalText(input.profileId, DEFAULT_SESSION_SETTINGS_DRAFT.profileId),
    readOnly: true,
    spread: normalizeOptionalNumber(input.spread, DEFAULT_SESSION_SETTINGS_DRAFT.spread),
    startTime: normalizeOptionalIsoTime(input.startTime),
  };

  return Object.freeze(draft);
}

export function validateSessionSettingsDraft(draft = {}) {
  const candidate = {
    ...DEFAULT_SESSION_SETTINGS_DRAFT,
    ...draft,
  };
  const errors = [];

  if (!String(candidate.name || '').trim()) {
    pushFieldError(errors, 'name', 'Session settings name must be a non-empty string.');
  }
  if (!String(candidate.profileId || '').trim()) {
    pushFieldError(errors, 'profileId', 'Session settings profileId must be a non-empty string.');
  }
  if (!String(candidate.asset || '').trim()) {
    pushFieldError(errors, 'asset', 'Session settings asset must be a non-empty string.');
  }
  if (candidate.balance !== null && !isNonNegativeNumber(candidate.balance)) {
    pushFieldError(errors, 'balance', 'Session settings balance must be null or a non-negative number.');
  }
  if (!isNonNegativeNumber(candidate.spread)) {
    pushFieldError(errors, 'spread', 'Session settings spread must be a non-negative number.');
  }
  if (!isNonNegativeNumber(candidate.commission)) {
    pushFieldError(errors, 'commission', 'Session settings commission must be a non-negative number.');
  }

  const start = candidate.startTime === null ? null : new Date(candidate.startTime);
  const end = candidate.endTime === null ? null : new Date(candidate.endTime);
  if (candidate.startTime !== null && Number.isNaN(start.valueOf())) {
    pushFieldError(errors, 'startTime', 'Session settings startTime must be null or a valid date/time.');
  }
  if (candidate.endTime !== null && Number.isNaN(end.valueOf())) {
    pushFieldError(errors, 'endTime', 'Session settings endTime must be null or a valid date/time.');
  }
  if (
    candidate.startTime !== null &&
    candidate.endTime !== null &&
    !Number.isNaN(start.valueOf()) &&
    !Number.isNaN(end.valueOf()) &&
    start.valueOf() >= end.valueOf()
  ) {
    pushFieldError(errors, 'endTime', 'Session settings endTime must be after startTime.');
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}

export function createSessionSettingsContract() {
  return Object.freeze({
    allowedFields: getSessionSettingsAllowedFields(),
    blockedIntegrations: getSessionSettingsBlockedIntegrations(),
    commandSurfaceReady: false,
    fieldGroups: getSessionSettingsFieldGroups(),
    owner: SESSION_SETTINGS_OWNER,
    panelControlsEnabled: false,
    persistenceReady: false,
    readOnlyDraftReady: true,
    runtimeWiringReady: false,
    writeReady: false,
  });
}
