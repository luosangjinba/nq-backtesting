const COPY_OWNER = 'session-repository';

const COPY_ALLOWED_FIELDS = Object.freeze([
  'accountBalance',
  'autoUpdateEndDate',
  'createdAt',
  'endTime',
  'name',
  'profileId',
  'startTime',
  'status',
  'symbol',
  'symbols',
  'timeframe',
  'workspaceId',
]);

const COPY_BLOCKED_FIELDS = Object.freeze([
  'activeReplayState',
  'bars',
  'chartState',
  'id',
  'journalEntries',
  'orders',
  'viewportState',
]);

export function getSessionCopyOwner() {
  return COPY_OWNER;
}

export function getSessionCopyAllowedFields() {
  return [...COPY_ALLOWED_FIELDS];
}

export function getSessionCopyBlockedFields() {
  return [...COPY_BLOCKED_FIELDS];
}

export function createSessionCopyContract() {
  return Object.freeze({
    allowedFields: getSessionCopyAllowedFields(),
    blockedFields: getSessionCopyBlockedFields(),
    canAdvanceReplay: false,
    canCopyBars: false,
    canCopyCalendar: false,
    canCopyChartState: false,
    canCopyJournal: false,
    canCopyOrders: false,
    canCreateMetadataRecord: true,
    canLoadBars: false,
    canOpenChart: false,
    canTouchViewport: false,
    idPolicy: 'new-session-id-required',
    namePolicy: 'append-copy-suffix',
    owner: COPY_OWNER,
  });
}
