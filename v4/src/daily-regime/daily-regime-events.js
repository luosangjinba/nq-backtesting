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
