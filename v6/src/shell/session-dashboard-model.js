function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function sessionSymbols(session = {}) {
  return Array.isArray(session.symbols) && session.symbols.length
    ? session.symbols
    : [session.symbol || ''];
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
