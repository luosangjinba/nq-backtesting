import {
  createSessionSummary,
  getSessionSummaryAllowedFields,
  getSessionSummaryOwner,
} from './session-summary-contract.js';

function formatMoney(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-US', { maximumFractionDigits: 0, style: 'currency', currency: 'USD' })
    : '$0';
}

function formatList(values = []) {
  return values.length ? values.join(', ') : '--';
}

function formatBoolean(value) {
  return value ? 'On' : 'Off';
}

function formatValue(field, value) {
  if (field === 'accountBalance') return formatMoney(value);
  if (field === 'autoUpdateEndDate') return formatBoolean(value);
  if (field === 'durationDays') return value == null ? '--' : `${value} days`;
  if (field === 'symbols') return formatList(value);
  return value || '--';
}

const SUMMARY_LABELS = Object.freeze({
  accountBalance: 'Account Balance',
  autoUpdateEndDate: 'Auto-update End Date',
  createdAt: 'Created',
  durationDays: 'Duration',
  endTime: 'End',
  id: 'Session ID',
  name: 'Name',
  profileId: 'Profile',
  startTime: 'Start',
  status: 'Status',
  symbol: 'Primary Symbol',
  symbols: 'Symbols',
  timeframe: 'Timeframe',
  workspaceId: 'Workspace',
});

export function createSessionSummarySurfaceView(session = {}) {
  const summary = createSessionSummary(session);
  const fields = getSessionSummaryAllowedFields().map((field) => ({
    field,
    label: SUMMARY_LABELS[field] || field,
    value: formatValue(field, summary[field]),
  }));

  return Object.freeze({
    fields: Object.freeze(fields.map((field) => Object.freeze({ ...field }))),
    owner: getSessionSummaryOwner(),
    sessionId: summary.id,
    title: summary.name,
  });
}
