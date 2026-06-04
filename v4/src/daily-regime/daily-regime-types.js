// Daily regime is a date-level background layer. It is keyed by
// date + instrument and is not embedded into PDA, Segment, or Order Setup data.

export const DAILY_REGIME_VERSION = 1;
export const DEFAULT_DAILY_REGIME_INSTRUMENT = 'NQ';

export const VIX_BUCKETS = Object.freeze({
  EXTREME_LOW: 'vix_extreme_low',
  LOW: 'vix_low',
  MEDIUM: 'vix_medium',
  HIGH: 'vix_high',
  EXTREME_HIGH: 'vix_extreme_high',
  NA: 'n/a',
});

export const VOLATILITY_REGIMES = Object.freeze({
  UNKNOWN: 'unknown',
  VIX_EXTREME_LOW: VIX_BUCKETS.EXTREME_LOW,
  VIX_LOW: VIX_BUCKETS.LOW,
  VIX_MEDIUM: VIX_BUCKETS.MEDIUM,
  VIX_HIGH: VIX_BUCKETS.HIGH,
  VIX_EXTREME_HIGH: VIX_BUCKETS.EXTREME_HIGH,
});

export const TREND_REGIMES = Object.freeze({
  BULL_TREND: 'bull_trend',
  BEAR_TREND: 'bear_trend',
  RANGE: 'range',
  UNKNOWN: 'unknown',
});

export const RANGE_REGIMES = Object.freeze({
  SMALL_RANGE: 'small_range',
  NORMAL_RANGE: 'normal_range',
  LARGE_RANGE: 'large_range',
  UNKNOWN: 'unknown',
});

export const EVENT_TAGS = Object.freeze({
  FOMC: 'FOMC',
  CPI: 'CPI',
  NFP: 'NFP',
  PPI: 'PPI',
  MAJOR_EARNINGS: 'major_earnings',
  NONE: 'none',
  UNKNOWN: 'unknown',
});

const VALID_VIX_BUCKETS = new Set(Object.values(VIX_BUCKETS));
const VALID_VOLATILITY_REGIMES = new Set(Object.values(VOLATILITY_REGIMES));
const VALID_TREND_REGIMES = new Set(Object.values(TREND_REGIMES));
const VALID_RANGE_REGIMES = new Set(Object.values(RANGE_REGIMES));
const VALID_EVENT_TAGS = new Set(Object.values(EVENT_TAGS));

const VIX_BUCKET_ALIASES = new Map([
  ['extreme_low', VIX_BUCKETS.EXTREME_LOW],
  ['extreme-low', VIX_BUCKETS.EXTREME_LOW],
  ['low', VIX_BUCKETS.LOW],
  ['medium', VIX_BUCKETS.MEDIUM],
  ['mid', VIX_BUCKETS.MEDIUM],
  ['high', VIX_BUCKETS.HIGH],
  ['extreme_high', VIX_BUCKETS.EXTREME_HIGH],
  ['extreme-high', VIX_BUCKETS.EXTREME_HIGH],
  ['na', VIX_BUCKETS.NA],
  ['none', VIX_BUCKETS.NA],
]);

function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeDate(value) {
  const text = normalizeString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normalizeInstrument(value) {
  return normalizeString(value, DEFAULT_DAILY_REGIME_INSTRUMENT).toUpperCase();
}

function normalizeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeEnum(value, validSet, fallback, aliases = new Map()) {
  const text = normalizeString(value);
  if (!text) return fallback;
  if (validSet.has(text)) return text;
  const lower = text.toLowerCase();
  if (aliases.has(lower)) return aliases.get(lower);
  return fallback;
}

function normalizeEventTags(input = []) {
  const rawTags = Array.isArray(input) ? input : [input];
  const tags = rawTags
    .map((tag) => normalizeString(tag))
    .map((tag) => {
      if (VALID_EVENT_TAGS.has(tag)) return tag;
      const lower = tag.toLowerCase();
      if (lower === 'fomc') return EVENT_TAGS.FOMC;
      if (lower === 'cpi') return EVENT_TAGS.CPI;
      if (lower === 'nfp') return EVENT_TAGS.NFP;
      if (lower === 'ppi') return EVENT_TAGS.PPI;
      if (lower === 'major-earnings' || lower === 'major earnings') return EVENT_TAGS.MAJOR_EARNINGS;
      if (lower === 'none') return EVENT_TAGS.NONE;
      if (lower === 'unknown') return EVENT_TAGS.UNKNOWN;
      return '';
    })
    .filter(Boolean);

  return Array.from(new Set(tags.length ? tags : [EVENT_TAGS.UNKNOWN]));
}

export function getVixBucketForClose(vixClose) {
  const close = normalizeNumber(vixClose);
  if (close === null) return VIX_BUCKETS.NA;
  if (close < 13) return VIX_BUCKETS.EXTREME_LOW;
  if (close < 17) return VIX_BUCKETS.LOW;
  if (close < 22) return VIX_BUCKETS.MEDIUM;
  if (close < 30) return VIX_BUCKETS.HIGH;
  return VIX_BUCKETS.EXTREME_HIGH;
}

export function getDailyRegimeIdentity(regime = {}) {
  const date = normalizeDate(regime.date);
  const instrument = normalizeInstrument(regime.instrument);
  return `${date}|${instrument}`;
}

export function normalizeDailyRegime(input = {}) {
  const date = normalizeDate(input.date || input.tradingDate || input.sessionDate);
  const instrument = normalizeInstrument(input.instrument);
  const vixClose = normalizeNumber(input.vixClose);
  const derivedVixBucket = getVixBucketForClose(vixClose);
  const vixBucket = normalizeEnum(
    input.vixBucket,
    VALID_VIX_BUCKETS,
    derivedVixBucket,
    VIX_BUCKET_ALIASES
  );
  const defaultVolatilityRegime = vixBucket === VIX_BUCKETS.NA
    ? VOLATILITY_REGIMES.UNKNOWN
    : vixBucket;

  return {
    version: DAILY_REGIME_VERSION,
    date,
    instrument,
    volatilityRegime: normalizeEnum(
      input.volatilityRegime,
      VALID_VOLATILITY_REGIMES,
      defaultVolatilityRegime,
      VIX_BUCKET_ALIASES
    ),
    vixClose,
    vixBucket,
    trendRegime: normalizeEnum(input.trendRegime, VALID_TREND_REGIMES, TREND_REGIMES.UNKNOWN),
    trendClose: normalizeNumber(input.trendClose),
    trendEma20: normalizeNumber(input.trendEma20),
    trendEma50: normalizeNumber(input.trendEma50),
    rangeRegime: normalizeEnum(input.rangeRegime, VALID_RANGE_REGIMES, RANGE_REGIMES.UNKNOWN),
    dayRange: normalizeNumber(input.dayRange),
    atr20: normalizeNumber(input.atr20),
    rangeAtrRatio: normalizeNumber(input.rangeAtrRatio),
    eventTags: normalizeEventTags(input.eventTags),
  };
}

export function getVixBucketLabel(vixBucket) {
  const bucket = normalizeEnum(vixBucket, VALID_VIX_BUCKETS, VIX_BUCKETS.NA, VIX_BUCKET_ALIASES);
  if (bucket === VIX_BUCKETS.EXTREME_LOW) return 'Extreme Low';
  if (bucket === VIX_BUCKETS.LOW) return 'Low';
  if (bucket === VIX_BUCKETS.MEDIUM) return 'Medium';
  if (bucket === VIX_BUCKETS.HIGH) return 'High';
  if (bucket === VIX_BUCKETS.EXTREME_HIGH) return 'Extreme High';
  return 'n/a';
}

export function getDailyRegimeSummary(regime = {}) {
  const normalized = normalizeDailyRegime(regime);
  const vixLabel = normalized.vixClose === null
    ? 'VIX: n/a'
    : `VIX: ${getVixBucketLabel(normalized.vixBucket)} ${normalized.vixClose.toFixed(2)}`;
  const trendLabel = `Trend: ${normalized.trendRegime}`;
  const rangeLabel = normalized.rangeAtrRatio === null
    ? `Range: ${normalized.rangeRegime}`
    : `Range: ${normalized.rangeRegime} ${normalized.rangeAtrRatio.toFixed(2)} ATR`;
  const eventsLabel = `Events: ${normalized.eventTags.join(', ')}`;
  return `${vixLabel} | ${trendLabel} | ${rangeLabel} | ${eventsLabel}`;
}
