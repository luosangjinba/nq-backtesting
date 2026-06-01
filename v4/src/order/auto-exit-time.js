import { fetchBars } from '../api.js';
import { ORDER_DIRECTIONS, ORDER_RESULTS } from './order-review-store.js';

const DEFAULT_LOOKAHEAD_HOURS = 72;
const MAX_LOOKAHEAD_HOURS = 24 * 14;
const SECONDS_PER_HOUR = 3600;

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatApiTime(timestamp) {
  const parsed = toFiniteNumber(timestamp);
  if (parsed === null) return '';
  return new Date(parsed * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

function normalizeDirection(direction) {
  if (direction === ORDER_DIRECTIONS.SHORT) return ORDER_DIRECTIONS.SHORT;
  if (direction === ORDER_DIRECTIONS.LONG) return ORDER_DIRECTIONS.LONG;
  return ORDER_DIRECTIONS.UNKNOWN;
}

export function getAutoExitTargetPrice({ result, entryPrice, stopPrice, targets = [] } = {}) {
  if (result === ORDER_RESULTS.STOP_LOSS) return toFiniteNumber(stopPrice);
  if (result === ORDER_RESULTS.BREAKEVEN) return toFiniteNumber(entryPrice);
  if (![ORDER_RESULTS.TARGET1, ORDER_RESULTS.TARGET2, ORDER_RESULTS.TARGET3].includes(result)) return null;
  const target = targets.find((item) => item?.role === result);
  return toFiniteNumber(target?.price);
}

export function doesBarTouchAutoExit({ bar, direction, result, price }) {
  const targetPrice = toFiniteNumber(price);
  if (!bar || targetPrice === null) return false;
  const high = toFiniteNumber(bar.high);
  const low = toFiniteNumber(bar.low);
  if (high === null || low === null) return false;

  if (result === ORDER_RESULTS.BREAKEVEN) return low <= targetPrice && targetPrice <= high;
  if (direction === ORDER_DIRECTIONS.LONG) {
    if ([ORDER_RESULTS.TARGET1, ORDER_RESULTS.TARGET2, ORDER_RESULTS.TARGET3].includes(result)) {
      return high >= targetPrice;
    }
    if (result === ORDER_RESULTS.STOP_LOSS) return low <= targetPrice;
  }
  if (direction === ORDER_DIRECTIONS.SHORT) {
    if ([ORDER_RESULTS.TARGET1, ORDER_RESULTS.TARGET2, ORDER_RESULTS.TARGET3].includes(result)) {
      return low <= targetPrice;
    }
    if (result === ORDER_RESULTS.STOP_LOSS) return high >= targetPrice;
  }
  return false;
}

export function findFirstAutoExitTouchBar(bars = [], criteria = {}) {
  const entryTimestamp = toFiniteNumber(criteria.entryTimestamp);
  const direction = normalizeDirection(criteria.direction);
  if (entryTimestamp === null) return { ok: false, reason: 'missing-entry-time' };
  if (direction === ORDER_DIRECTIONS.UNKNOWN) return { ok: false, reason: 'missing-direction' };

  const result = criteria.result || ORDER_RESULTS.UNKNOWN;
  if (![ORDER_RESULTS.TARGET1, ORDER_RESULTS.TARGET2, ORDER_RESULTS.TARGET3, ORDER_RESULTS.STOP_LOSS, ORDER_RESULTS.BREAKEVEN].includes(result)) {
    return { ok: false, reason: 'unsupported-result' };
  }

  const targetPrice = getAutoExitTargetPrice(criteria);
  if (targetPrice === null) return { ok: false, reason: 'missing-exit-price' };

  const touchBar = bars.find((bar) => {
    const timestamp = toFiniteNumber(bar?.timestamp);
    return (
      timestamp !== null &&
      timestamp > entryTimestamp &&
      doesBarTouchAutoExit({ bar, direction, result, price: targetPrice })
    );
  });

  if (!touchBar) return { ok: false, reason: 'not-touched' };
  return {
    ok: true,
    reason: 'touched',
    bar: touchBar,
    exitTimestamp: Number(touchBar.timestamp),
    exitPrice: targetPrice,
  };
}

export async function calculateAutoExitTime(criteria = {}, options = {}) {
  const entryTimestamp = toFiniteNumber(criteria.entryTimestamp);
  if (entryTimestamp === null) return { ok: false, reason: 'missing-entry-time' };

  const lookaheadHours = Math.min(
    Math.max(Number(options.lookaheadHours) || DEFAULT_LOOKAHEAD_HOURS, 1),
    MAX_LOOKAHEAD_HOURS
  );
  const start = formatApiTime(entryTimestamp);
  const end = formatApiTime(entryTimestamp + lookaheadHours * SECONDS_PER_HOUR);
  const instrument = criteria.instrument || options.instrument || 'NQ';
  const payload = await fetchBars(start, end, 1, instrument);
  const bars = Array.isArray(payload?.result) ? payload.result : Array.isArray(payload?.bars) ? payload.bars : [];
  return findFirstAutoExitTouchBar(bars, criteria);
}
