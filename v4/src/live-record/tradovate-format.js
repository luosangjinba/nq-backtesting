export const REVIEW_ARCHIVE_APP = 'trading-v4-review';
export const REVIEW_ARCHIVE_VERSION = 1;
export const DEFAULT_TIMEFRAME = '1M';

function hashString(value = '') {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function stableTradovateRecordId(row, instrument) {
  const identity = [
    'tradovate',
    instrument,
    row.symbol || '',
    row.buyFillId || '',
    row.sellFillId || '',
    row.boughtTimestamp || '',
    row.soldTimestamp || '',
    row.buyPrice || '',
    row.sellPrice || '',
  ].join('|');
  return `live_record_tradovate_${hashString(identity)}`;
}

export function formatTradovatePnl(pnl) {
  const sign = pnl < 0 ? '-' : '';
  return `${sign}$${Math.abs(pnl).toFixed(2)}`;
}
