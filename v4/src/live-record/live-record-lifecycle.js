import { LIVE_RECORD_STATUSES } from './live-record-types.js';

export const LIVE_RECORD_DEFAULT_CHART_STATUS = LIVE_RECORD_STATUSES.ACTIVE;

const STATUS_LABELS = Object.freeze({
  [LIVE_RECORD_STATUSES.DRAFT]: 'Draft',
  [LIVE_RECORD_STATUSES.PLANNED]: 'Planned',
  [LIVE_RECORD_STATUSES.ACTIVE]: 'Active',
  [LIVE_RECORD_STATUSES.SUBMITTED]: 'Submitted',
  [LIVE_RECORD_STATUSES.FILLED]: 'Filled',
  [LIVE_RECORD_STATUSES.CANCELLED]: 'Cancelled',
  [LIVE_RECORD_STATUSES.CLOSED]: 'Closed',
  [LIVE_RECORD_STATUSES.REVIEWED]: 'Reviewed',
});

const TERMINAL_STATUSES = new Set([
  LIVE_RECORD_STATUSES.CANCELLED,
  LIVE_RECORD_STATUSES.CLOSED,
  LIVE_RECORD_STATUSES.REVIEWED,
]);

const OPEN_STATUSES = new Set([
  LIVE_RECORD_STATUSES.DRAFT,
  LIVE_RECORD_STATUSES.PLANNED,
  LIVE_RECORD_STATUSES.ACTIVE,
  LIVE_RECORD_STATUSES.SUBMITTED,
  LIVE_RECORD_STATUSES.FILLED,
]);

export const LIVE_RECORD_STATUS_TRANSITIONS = Object.freeze({
  [LIVE_RECORD_STATUSES.DRAFT]: Object.freeze([
    LIVE_RECORD_STATUSES.PLANNED,
    LIVE_RECORD_STATUSES.ACTIVE,
    LIVE_RECORD_STATUSES.CANCELLED,
  ]),
  [LIVE_RECORD_STATUSES.PLANNED]: Object.freeze([
    LIVE_RECORD_STATUSES.ACTIVE,
    LIVE_RECORD_STATUSES.SUBMITTED,
    LIVE_RECORD_STATUSES.CANCELLED,
  ]),
  [LIVE_RECORD_STATUSES.ACTIVE]: Object.freeze([
    LIVE_RECORD_STATUSES.SUBMITTED,
    LIVE_RECORD_STATUSES.FILLED,
    LIVE_RECORD_STATUSES.CANCELLED,
    LIVE_RECORD_STATUSES.CLOSED,
    LIVE_RECORD_STATUSES.REVIEWED,
  ]),
  [LIVE_RECORD_STATUSES.SUBMITTED]: Object.freeze([
    LIVE_RECORD_STATUSES.FILLED,
    LIVE_RECORD_STATUSES.CANCELLED,
    LIVE_RECORD_STATUSES.CLOSED,
  ]),
  [LIVE_RECORD_STATUSES.FILLED]: Object.freeze([
    LIVE_RECORD_STATUSES.CLOSED,
    LIVE_RECORD_STATUSES.REVIEWED,
  ]),
  [LIVE_RECORD_STATUSES.CANCELLED]: Object.freeze([
    LIVE_RECORD_STATUSES.ACTIVE,
  ]),
  [LIVE_RECORD_STATUSES.CLOSED]: Object.freeze([
    LIVE_RECORD_STATUSES.REVIEWED,
    LIVE_RECORD_STATUSES.ACTIVE,
  ]),
  [LIVE_RECORD_STATUSES.REVIEWED]: Object.freeze([
    LIVE_RECORD_STATUSES.ACTIVE,
  ]),
});

export function getLiveRecordStatusLabel(status = '') {
  return STATUS_LABELS[status] || STATUS_LABELS[LIVE_RECORD_STATUSES.DRAFT];
}

export function getLiveRecordDefaultChartStatus() {
  return LIVE_RECORD_DEFAULT_CHART_STATUS;
}

export function isLiveRecordTerminalStatus(status = '') {
  return TERMINAL_STATUSES.has(status);
}

export function isLiveRecordOpenStatus(status = '') {
  return OPEN_STATUSES.has(status);
}

export function needsLiveRecordReview(record = {}) {
  const status = record.status || LIVE_RECORD_STATUSES.DRAFT;
  if (status === LIVE_RECORD_STATUSES.REVIEWED) return false;
  return status === LIVE_RECORD_STATUSES.CLOSED || status === LIVE_RECORD_STATUSES.FILLED;
}

export function getLiveRecordAllowedNextStatuses(status = '') {
  return [...(LIVE_RECORD_STATUS_TRANSITIONS[status] || [])];
}

export function canTransitionLiveRecordStatus(fromStatus = '', toStatus = '') {
  if (!toStatus || fromStatus === toStatus) return false;
  return getLiveRecordAllowedNextStatuses(fromStatus).includes(toStatus);
}

