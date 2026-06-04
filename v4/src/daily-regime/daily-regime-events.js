import { EVENT_TAGS, normalizeDailyRegime } from './daily-regime-types.js';

// Manual event table for daily regime research. Keep dates in YYYY-MM-DD and
// tags limited to EVENT_TAGS values: FOMC, CPI, NFP, PPI, major_earnings.
export const CURATED_EVENT_TAGS_BY_DATE = Object.freeze({
});

function normalizeDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normalizeEventTag(tag) {
  const text = String(tag || '').trim();
  if (text === EVENT_TAGS.FOMC) return EVENT_TAGS.FOMC;
  if (text === EVENT_TAGS.CPI) return EVENT_TAGS.CPI;
  if (text === EVENT_TAGS.NFP) return EVENT_TAGS.NFP;
  if (text === EVENT_TAGS.PPI) return EVENT_TAGS.PPI;
  if (text === EVENT_TAGS.MAJOR_EARNINGS) return EVENT_TAGS.MAJOR_EARNINGS;
  const lower = text.toLowerCase();
  if (lower === 'fomc') return EVENT_TAGS.FOMC;
  if (lower === 'cpi') return EVENT_TAGS.CPI;
  if (lower === 'nfp') return EVENT_TAGS.NFP;
  if (lower === 'ppi') return EVENT_TAGS.PPI;
  if (lower === 'major-earnings' || lower === 'major earnings') return EVENT_TAGS.MAJOR_EARNINGS;
  return '';
}

export function getCuratedEventTagsForDate(date, eventTable = CURATED_EVENT_TAGS_BY_DATE) {
  const dateKey = normalizeDate(date);
  if (!dateKey) return [EVENT_TAGS.UNKNOWN];
  const rawTags = eventTable?.[dateKey];
  const tags = (Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : [])
    .map(normalizeEventTag)
    .filter(Boolean);
  return Array.from(new Set(tags.length ? tags : [EVENT_TAGS.NONE]));
}

export function applyEventRegimes(regimes = [], eventTable = CURATED_EVENT_TAGS_BY_DATE) {
  return (Array.isArray(regimes) ? regimes : []).map((regime) => normalizeDailyRegime({
    ...regime,
    eventTags: getCuratedEventTagsForDate(regime.date, eventTable),
  }));
}

function getEconomicEventTag(event = {}) {
  const title = String(event.title || '').trim().toLowerCase();
  if (!title) return '';
  if (title.includes('non-farm') || title.includes('nonfarm')) return EVENT_TAGS.NFP;
  if (title.includes('unemployment rate')) return EVENT_TAGS.NFP;
  if (title.includes('average hourly earnings')) return EVENT_TAGS.NFP;
  if (title.includes('consumer price index') || /\bcpi\b/.test(title)) return EVENT_TAGS.CPI;
  if (title.includes('producer price index') || /\bppi\b/.test(title)) return EVENT_TAGS.PPI;
  if (title.includes('federal funds rate')) return EVENT_TAGS.FOMC;
  if (title.includes('fomc statement')) return EVENT_TAGS.FOMC;
  if (title.includes('fomc meeting minutes')) return EVENT_TAGS.FOMC;
  if (title.includes('fomc economic projections')) return EVENT_TAGS.FOMC;
  if (title.includes('major earnings')) return EVENT_TAGS.MAJOR_EARNINGS;
  return '';
}

export function getEconomicEventTagsForDate(date, economicEvents = []) {
  const dateKey = normalizeDate(date);
  if (!dateKey) return [EVENT_TAGS.UNKNOWN];
  const tags = (Array.isArray(economicEvents) ? economicEvents : [])
    .filter((event) => normalizeDate(event.eventDate || event.event_date) === dateKey)
    .map(getEconomicEventTag)
    .filter(Boolean);
  return Array.from(new Set(tags.length ? tags : [EVENT_TAGS.NONE]));
}

function mergeEventTags(baseTags = [], economicTags = []) {
  const normalizedBase = (Array.isArray(baseTags) ? baseTags : [baseTags])
    .map(normalizeEventTag)
    .filter((tag) => tag && tag !== EVENT_TAGS.NONE && tag !== EVENT_TAGS.UNKNOWN);
  const normalizedEconomic = (Array.isArray(economicTags) ? economicTags : [economicTags])
    .map(normalizeEventTag)
    .filter((tag) => tag && tag !== EVENT_TAGS.NONE && tag !== EVENT_TAGS.UNKNOWN);
  const merged = Array.from(new Set([...normalizedBase, ...normalizedEconomic]));
  return merged.length ? merged : [EVENT_TAGS.NONE];
}

export function applyEconomicEventRegimes(regimes = [], economicEvents = []) {
  return (Array.isArray(regimes) ? regimes : []).map((regime) => {
    const economicTags = getEconomicEventTagsForDate(regime.date, economicEvents);
    return normalizeDailyRegime({
      ...regime,
      eventTags: mergeEventTags(regime.eventTags, economicTags),
    });
  });
}
