import {
  createSessionAnalyticsSnapshot,
  getSessionAnalyticsAllowedFields,
  getSessionAnalyticsOwner,
} from './session-analytics-contract.js';

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

function formatMetadataValue(field, value) {
  if (field === 'accountBalance') return formatMoney(value);
  if (field === 'autoUpdateEndDate') return formatBoolean(value);
  if (field === 'durationDays') return value == null ? '--' : `${value} days`;
  if (field === 'symbols') return formatList(value);
  return value || '--';
}

const METADATA_LABELS = Object.freeze({
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

const METRIC_LABELS = Object.freeze({
  averageRMultiple: 'Average R',
  expectancy: 'Expectancy',
  grossLoss: 'Gross Loss',
  grossProfit: 'Gross Profit',
  lossCount: 'Losses',
  maxDrawdown: 'Max Drawdown',
  netProfit: 'Net Profit',
  tradeCount: 'Trades',
  winCount: 'Wins',
  winRate: 'Win Rate',
});

export function createSessionAnalyticsSurfaceView(session = {}) {
  const snapshot = createSessionAnalyticsSnapshot(session);
  const metadataFields = getSessionAnalyticsAllowedFields().map((field) => ({
    field,
    label: METADATA_LABELS[field] || field,
    value: formatMetadataValue(field, snapshot.metadata[field]),
  }));
  const metricFields = Object.keys(snapshot.metrics).map((field) => ({
    field,
    label: METRIC_LABELS[field] || field,
    status: 'unavailable',
    value: '--',
  }));

  return Object.freeze({
    metadataFields: Object.freeze(metadataFields.map((field) => Object.freeze({ ...field }))),
    metricFields: Object.freeze(metricFields.map((field) => Object.freeze({ ...field }))),
    owner: getSessionAnalyticsOwner(),
    sessionId: snapshot.metadata.id,
    title: `${snapshot.metadata.name} Stats`,
  });
}
