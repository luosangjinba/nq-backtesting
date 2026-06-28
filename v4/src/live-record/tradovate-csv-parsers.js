const REQUIRED_COLUMNS = new Set([
  'symbol',
  'buyFillId',
  'sellFillId',
  'qty',
  'buyPrice',
  'sellPrice',
  'pnl',
  'boughtTimestamp',
  'soldTimestamp',
  'duration',
]);
const ORDER_REQUIRED_COLUMNS = new Set(['Order ID', 'B/S', 'Contract', 'Product', 'Status', 'Timestamp', 'Type']);
const FILL_REQUIRED_COLUMNS = new Set(['Fill ID', 'Order ID', 'Timestamp', 'B/S', 'Quantity', 'Price', 'Contract', 'Product']);
const POSITION_REQUIRED_COLUMNS = new Set([
  'Position ID',
  'Pair ID',
  'Buy Fill ID',
  'Sell Fill ID',
  'Paired Qty',
  'Buy Price',
  'Sell Price',
  'P/L',
  'Bought Timestamp',
  'Sold Timestamp',
]);
const CASH_REQUIRED_COLUMNS = new Set([
  'Transaction ID',
  'Timestamp',
  'Date',
  'Delta',
  'Amount',
  'Cash Change Type',
  'Currency',
  'Contract',
]);
const BALANCE_REQUIRED_COLUMNS = new Set([
  'Trade Date',
  'Total Amount',
  'Total Realized PNL',
]);

function parseCsvLine(line = '') {
  const values = [];
  let value = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function parseTradovateCsvWithRequiredColumns(text = '', requiredColumns = new Set()) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  if (!lines.length) throw new Error('CSV is empty');

  const columns = parseCsvLine(lines[0]).map((column) => column.trim());
  const missing = [...requiredColumns].filter((column) => !columns.includes(column));
  if (missing.length) {
    throw new Error(`missing required columns: ${missing.join(', ')}`);
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
  });
}

export function parseTradovatePerformanceCsv(text = '') {
  return parseTradovateCsvWithRequiredColumns(text, REQUIRED_COLUMNS);
}

export function parseTradovateOrdersCsv(text = '') {
  if (!String(text || '').trim()) return [];
  return parseTradovateCsvWithRequiredColumns(text, ORDER_REQUIRED_COLUMNS);
}

export function parseTradovateFillsCsv(text = '') {
  if (!String(text || '').trim()) return [];
  return parseTradovateCsvWithRequiredColumns(text, FILL_REQUIRED_COLUMNS);
}

export function parseTradovatePositionHistoryCsv(text = '') {
  if (!String(text || '').trim()) return [];
  return parseTradovateCsvWithRequiredColumns(text, POSITION_REQUIRED_COLUMNS);
}

export function parseTradovateCashHistoryCsv(text = '') {
  if (!String(text || '').trim()) return [];
  return parseTradovateCsvWithRequiredColumns(text, CASH_REQUIRED_COLUMNS);
}

export function parseTradovateAccountBalanceHistoryCsv(text = '') {
  if (!String(text || '').trim()) return [];
  return parseTradovateCsvWithRequiredColumns(text, BALANCE_REQUIRED_COLUMNS);
}

export function parseTradovateMoney(value = '') {
  const text = String(value || '').trim().replace(/\$/g, '').replace(/,/g, '');
  if (!text) throw new Error('empty money value');
  const negative = text.startsWith('(') && text.endsWith(')');
  const parsed = Number(text.replace(/[()]/g, ''));
  if (!Number.isFinite(parsed)) throw new Error(`invalid money value: ${value}`);
  return negative ? -parsed : parsed;
}

export function parseNumberField(value, field) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) throw new Error(`invalid ${field}: ${value}`);
  return parsed;
}

export function parseOptionalNumberField(value) {
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTradovateDateParts(value = '') {
  const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`invalid Tradovate timestamp: ${value}`);
  return {
    month: Number(match[1]),
    day: Number(match[2]),
    year: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
  };
}

function getTimeZoneParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

export function tradovateTimestampToEpochSeconds(value, timeZone = 'UTC') {
  const parts = parseTradovateDateParts(value);
  const targetUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let guessMs = targetUtcMs;
  for (let i = 0; i < 3; i += 1) {
    const zoneParts = getTimeZoneParts(new Date(guessMs), timeZone);
    const zoneAsUtcMs = Date.UTC(
      zoneParts.year,
      zoneParts.month - 1,
      zoneParts.day,
      zoneParts.hour,
      zoneParts.minute,
      zoneParts.second
    );
    const diffMs = targetUtcMs - zoneAsUtcMs;
    if (diffMs === 0) break;
    guessMs += diffMs;
  }
  return Math.floor(guessMs / 1000);
}

function contractRoot(symbol = '') {
  const text = String(symbol || '').trim().toUpperCase();
  const knownRoot = ['MNQ', 'MES', 'NQ', 'ES'].find((root) => text.startsWith(root));
  if (knownRoot) return knownRoot;
  return text.match(/^([A-Z]+)/)?.[1] || '';
}

export function mapTradovateSymbolToInstrument(symbol = '') {
  const root = contractRoot(symbol);
  if (root === 'MNQ' || root === 'NQ') return 'NQ';
  if (root === 'MES' || root === 'ES') return 'ES';
  return root;
}

export function getTradovateDetectedInstruments(text = '') {
  const rows = parseTradovatePerformanceCsv(text);
  return [...new Set(rows.map((row) => mapTradovateSymbolToInstrument(row.symbol)).filter(Boolean))].sort();
}

export function cleanField(value = '') {
  return String(value || '').trim();
}

export function getOrderId(row = {}) {
  return cleanField(row['Order ID'] || row.orderId || row._orderId);
}

export function getFillId(row = {}) {
  return cleanField(row['Fill ID'] || row._id);
}
