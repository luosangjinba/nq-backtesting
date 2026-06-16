const REVIEW_ARCHIVE_APP = 'trading-v4-review';
const REVIEW_ARCHIVE_VERSION = 1;
const DEFAULT_TIMEFRAME = '1M';
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

export function parseTradovatePerformanceCsv(text = '') {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  if (!lines.length) throw new Error('CSV is empty');

  const columns = parseCsvLine(lines[0]).map((column) => column.trim());
  const missing = [...REQUIRED_COLUMNS].filter((column) => !columns.includes(column));
  if (missing.length) {
    throw new Error(`missing required columns: ${missing.join(', ')}`);
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
  });
}

export function parseTradovateMoney(value = '') {
  const text = String(value || '').trim().replace(/\$/g, '').replace(/,/g, '');
  if (!text) throw new Error('empty money value');
  const negative = text.startsWith('(') && text.endsWith(')');
  const parsed = Number(text.replace(/[()]/g, ''));
  if (!Number.isFinite(parsed)) throw new Error(`invalid money value: ${value}`);
  return negative ? -parsed : parsed;
}

function parseNumberField(value, field) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) throw new Error(`invalid ${field}: ${value}`);
  return parsed;
}

function parseTradovateDateParts(value = '') {
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

function hashString(value = '') {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableRecordId(row, instrument) {
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

function resultStatus(pnl) {
  if (pnl > 0) return 'win';
  if (pnl < 0) return 'loss';
  return 'breakeven';
}

function exitTypeFromPnl(pnl) {
  if (pnl > 0) return 'profit';
  if (pnl < 0) return 'stopLoss';
  return 'unknown';
}

function buildImportedStopLoss({ pnl, exitTs, exitPrice }) {
  if (pnl >= 0) return {};
  return {
    id: 'stopLoss',
    role: 'stopLoss',
    label: 'Stop Loss',
    timestamp: exitTs,
    timeframe: DEFAULT_TIMEFRAME,
    price: exitPrice,
    endTimestamp: exitTs,
    endTimeframe: DEFAULT_TIMEFRAME,
    visible: true,
    complete: true,
    note: 'Imported losing trade: exit used as stop loss.',
  };
}

function buildImportedTargets({ pnl, exitTs, exitPrice }) {
  if (pnl <= 0) return [];
  return [{
    id: 'targetInternal1',
    role: 'targetInternal1',
    targetType: 'internal',
    label: 'Target Internal 1',
    timestamp: exitTs,
    timeframe: DEFAULT_TIMEFRAME,
    price: exitPrice,
    endTimestamp: exitTs,
    endTimeframe: DEFAULT_TIMEFRAME,
    visible: true,
    complete: true,
    note: 'Imported winning trade: exit used as Target Internal 1.',
  }];
}

export function formatTradovatePnl(pnl) {
  const sign = pnl < 0 ? '-' : '';
  return `${sign}$${Math.abs(pnl).toFixed(2)}`;
}

function buildLiveRecord(row, { instrument, timeZone, nowMs }) {
  const buyTs = tradovateTimestampToEpochSeconds(row.boughtTimestamp, timeZone);
  const sellTs = tradovateTimestampToEpochSeconds(row.soldTimestamp, timeZone);
  const buyPrice = parseNumberField(row.buyPrice, 'buyPrice');
  const sellPrice = parseNumberField(row.sellPrice, 'sellPrice');
  const quantity = parseNumberField(row.qty, 'qty');
  const pnl = parseTradovateMoney(row.pnl);
  const isLong = buyTs <= sellTs;
  const direction = isLong ? 'long' : 'short';
  const entryTs = isLong ? buyTs : sellTs;
  const exitTs = isLong ? sellTs : buyTs;
  const entryPrice = isLong ? buyPrice : sellPrice;
  const exitPrice = isLong ? sellPrice : buyPrice;
  const sourceSymbol = String(row.symbol || '').trim();
  const duration = String(row.duration || '').trim();
  const pnlText = formatTradovatePnl(pnl);

  return {
    version: 1,
    id: stableRecordId(row, instrument),
    instrument,
    createdAt: nowMs,
    updatedAt: nowMs,
    status: 'closed',
    direction,
    orderSetupId: '',
    summary: `Tradovate import: ${sourceSymbol} ${direction === 'long' ? 'Long' : 'Short'} qty ${quantity}, P/L ${pnlText}, duration ${duration || 'unknown'}.`,
    anchor: {
      timestamp: entryTs,
      timeframe: DEFAULT_TIMEFRAME,
      price: entryPrice,
    },
    execution: {
      entry: {
        id: 'entry',
        role: 'entry',
        label: 'Entry',
        timestamp: entryTs,
        timeframe: DEFAULT_TIMEFRAME,
        price: entryPrice,
        endTimestamp: exitTs,
        endTimeframe: DEFAULT_TIMEFRAME,
        visible: true,
        complete: true,
        note: `Imported entry fill from Tradovate ${sourceSymbol}.`,
      },
      marketStructureShift: {},
      stopLoss: buildImportedStopLoss({ pnl, exitTs, exitPrice }),
      targets: buildImportedTargets({ pnl, exitTs, exitPrice }),
      orders: [],
      fills: [
        {
          id: String(row.buyFillId || '').trim() || 'buy_fill',
          timestamp: buyTs,
          price: buyPrice,
          quantity,
          note: `Tradovate buy fill for ${sourceSymbol}.`,
        },
        {
          id: String(row.sellFillId || '').trim() || 'sell_fill',
          timestamp: sellTs,
          price: sellPrice,
          quantity,
          note: `Tradovate sell fill for ${sourceSymbol}.`,
        },
      ],
    },
    reasons: [{
      id: 'reason_1',
      category: 'execution',
      note: '',
      refs: [],
    }],
    linkedObjectRefs: [],
    result: {
      status: resultStatus(pnl),
      exitType: exitTypeFromPnl(pnl),
      exitTimestamp: exitTs,
      exitTimeframe: DEFAULT_TIMEFRAME,
      exitPrice,
      note: `Tradovate realized P/L ${pnlText}; qty ${quantity}; buyFillId ${row.buyFillId || ''}; sellFillId ${row.sellFillId || ''}; duration ${duration || 'unknown'}.`,
      executionReviewNote: '',
    },
    display: {
      hidden: false,
      showRiskRewardBox: true,
      elementVisibility: {},
    },
  };
}

export function buildTradovateLiveRecordArchive(text, options = {}) {
  const rows = parseTradovatePerformanceCsv(text);
  let instrument = String(options.instrument || 'auto').trim().toUpperCase();
  const timeZone = options.timeZone || 'UTC';
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const detected = new Set(rows.map((row) => mapTradovateSymbolToInstrument(row.symbol)).filter(Boolean));

  if (instrument === 'AUTO') {
    if (detected.size !== 1) {
      throw new Error(`auto instrument requires exactly one detected instrument; detected ${[...detected].join(', ') || 'unknown'}`);
    }
    instrument = [...detected][0];
  }

  const liveRecords = [];
  let skippedRows = 0;
  let totalPnl = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;

  rows.forEach((row) => {
    if (mapTradovateSymbolToInstrument(row.symbol) !== instrument) {
      skippedRows += 1;
      return;
    }
    const record = buildLiveRecord(row, { instrument, timeZone, nowMs });
    const pnl = parseTradovateMoney(row.pnl);
    liveRecords.push(record);
    totalPnl += pnl;
    if (pnl > 0) wins += 1;
    else if (pnl < 0) losses += 1;
    else breakeven += 1;
  });

  const payload = {
    app: REVIEW_ARCHIVE_APP,
    version: REVIEW_ARCHIVE_VERSION,
    exportedAt: new Date(nowMs).toISOString(),
    instrument,
    timeframe: DEFAULT_TIMEFRAME,
    range: {},
    pdaAnnotations: [],
    marketSegments: [],
    segmentGroups: [],
    smtRecords: [],
    orderReviews: [],
    liveRecords,
    dailyTimeReviews: [],
    chartNotes: [],
    dailyRegimes: [],
    source: {
      type: 'tradovate-performance-csv',
      timezone: timeZone,
      rowCount: rows.length,
      skippedRows,
    },
  };

  return {
    payload,
    sourceRows: rows.length,
    liveRecords: liveRecords.length,
    skippedRows,
    wins,
    losses,
    breakeven,
    totalPnl,
  };
}

export function buildTradovateLiveRecordArchives(text, options = {}) {
  const instrument = String(options.instrument || 'auto').trim().toUpperCase();
  if (instrument !== 'AUTO') {
    return [buildTradovateLiveRecordArchive(text, options)];
  }
  const instruments = getTradovateDetectedInstruments(text);
  if (!instruments.length) throw new Error('no Tradovate instruments detected');
  return instruments.map((detectedInstrument) => buildTradovateLiveRecordArchive(text, {
    ...options,
    instrument: detectedInstrument,
  }));
}
