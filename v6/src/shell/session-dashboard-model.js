function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function sessionSymbols(session = {}) {
  return Array.isArray(session.symbols) && session.symbols.length
    ? session.symbols
    : [session.symbol || ''];
}

function dateLabel(value, fallback) {
  return value ? String(value).slice(0, 10) : fallback;
}

function parseDateOnly(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText || ''))) return null;
  const date = new Date(`${dateText}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function previousDateLabel(dateText) {
  const date = parseDateOnly(dateText);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function hasGlobexPriorOpen(session = {}, startDate) {
  const symbols = sessionSymbols(session).map((symbol) => String(symbol || '').toUpperCase());
  const hasSupportedFuture = symbols.some((symbol) => ['NQ', 'ES'].includes(symbol));
  const date = parseDateOnly(startDate);
  return Boolean(hasSupportedFuture && date && date.getUTCDay() === 1);
}

function normalizeTimeframe(value) {
  const match = String(value || '').trim().match(/^(\d+)(m)?$/i);
  return match ? Number(match[1]) : null;
}

function chartBoundaryScopeForSession(session = {}, metadata = {}) {
  const scopes = Array.isArray(metadata?.scopes) ? metadata.scopes : [];
  const symbols = sessionSymbols(session).map((symbol) => String(symbol || '').toUpperCase());
  const timeframe = normalizeTimeframe(session.timeframe || session.displayTimeframe || 1);
  return scopes.find((scope) => (
    symbols.includes(String(scope.instrument || '').toUpperCase()) &&
    (!timeframe || Number(scope.timeframe) === timeframe) &&
    scope.earliestLoadedTime
  )) || null;
}

function searchableText(session = {}) {
  return [
    session.id,
    session.name,
    session.symbol,
    session.timeframe,
    session.startTime,
    session.endTime,
    ...sessionSymbols(session),
  ].map(normalizeText).join(' ');
}

function compareSessionDate(left = {}, right = {}, direction) {
  const leftTime = Date.parse(left.createdAt || left.startTime || 0) || 0;
  const rightTime = Date.parse(right.createdAt || right.startTime || 0) || 0;
  return direction === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
}

export function createSessionDateBoundaryView(session = {}, {
  chartBoundaryMetadata = null,
} = {}) {
  const start = dateLabel(session.startTime, 'Start pending');
  const end = dateLabel(session.endTime, 'End pending');
  const tradingDateRangeLabel = `${start} / ${end}`;
  const actualBoundary = chartBoundaryScopeForSession(session, chartBoundaryMetadata);
  if (actualBoundary) {
    return {
      chartDataBoundaryLabel: `Chart starts at: ${actualBoundary.earliestLoadedTime}`,
      hasActualChartDataBoundary: true,
      hasPriorGlobexOpen: false,
      tradingDateRangeLabel,
    };
  }
  if (!hasGlobexPriorOpen(session, start)) {
    return {
      chartDataBoundaryLabel: '',
      hasActualChartDataBoundary: false,
      hasPriorGlobexOpen: false,
      tradingDateRangeLabel,
    };
  }
  return {
    chartDataBoundaryLabel: `Chart starts at prior Globex open: ${previousDateLabel(start)} 18:00`,
    hasActualChartDataBoundary: false,
    hasPriorGlobexOpen: true,
    tradingDateRangeLabel,
  };
}

export function createRecentSessionsView(sessions = [], {
  page = 1,
  pageSize = 5,
  query = '',
  sort = 'newest',
} = {}) {
  const normalizedQuery = normalizeText(query);
  const normalizedSort = sort === 'oldest' ? 'oldest' : 'newest';
  const normalizedPageSize = Math.max(1, Number(pageSize) || 5);
  const filtered = sessions
    .filter((session) => !normalizedQuery || searchableText(session).includes(normalizedQuery))
    .sort((left, right) => compareSessionDate(left, right, normalizedSort));
  const pageCount = Math.max(1, Math.ceil(filtered.length / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), pageCount);
  const startIndex = (currentPage - 1) * normalizedPageSize;

  return {
    page: currentPage,
    pageCount,
    pageSize: normalizedPageSize,
    query,
    rows: filtered.slice(startIndex, startIndex + normalizedPageSize),
    sort: normalizedSort,
    totalCount: sessions.length,
    visibleCount: filtered.length,
  };
}
