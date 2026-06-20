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

export function parseTradovatePerformanceCsv(text = '') {
  return parseTradovateCsvWithRequiredColumns(text, REQUIRED_COLUMNS);
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

function parseNumberField(value, field) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) throw new Error(`invalid ${field}: ${value}`);
  return parsed;
}

function parseOptionalNumberField(value) {
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
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

function cleanField(value = '') {
  return String(value || '').trim();
}

function getOrderId(row = {}) {
  return cleanField(row['Order ID'] || row.orderId || row._orderId);
}

function getFillId(row = {}) {
  return cleanField(row['Fill ID'] || row._id);
}

function getPerformancePairKey(row = {}) {
  return `${cleanField(row.buyFillId)}:${cleanField(row.sellFillId)}`;
}

function getPositionPairKey(row = {}) {
  return `${cleanField(row['Buy Fill ID'])}:${cleanField(row['Sell Fill ID'])}`;
}

function almostEqual(left, right, epsilon = 0.000001) {
  return Math.abs(Number(left) - Number(right)) <= epsilon;
}

function createEmptyPositionReconciliation() {
  return {
    provided: false,
    ok: true,
    warnings: [],
    performancePairs: 0,
    positionPairs: 0,
    missingPairs: [],
    extraPairs: [],
    mismatchedPairs: [],
  };
}

function createEmptyCashReconciliation() {
  return {
    provided: false,
    ok: true,
    warnings: [],
    rows: 0,
    byType: {},
    commissionTotal: null,
    fillsCommissionTotal: null,
    commissionDifference: null,
    tradePairedTotal: null,
    performancePnlTotal: null,
    tradePairedDifference: null,
  };
}

function createEmptyBalanceReconciliation() {
  return {
    provided: false,
    ok: true,
    warnings: [],
    rows: 0,
    dailyRows: [],
  };
}

function reconcilePositionHistory(performanceRows = [], positionRows = []) {
  const report = createEmptyPositionReconciliation();
  if (!positionRows.length) return report;

  report.provided = true;
  const performanceByPair = new Map(
    performanceRows.map((row) => [getPerformancePairKey(row), row]).filter(([key]) => key !== ':')
  );
  const positionByPair = new Map(
    positionRows.map((row) => [getPositionPairKey(row), row]).filter(([key]) => key !== ':')
  );
  report.performancePairs = performanceByPair.size;
  report.positionPairs = positionByPair.size;

  performanceByPair.forEach((performance, pairKey) => {
    const position = positionByPair.get(pairKey);
    if (!position) {
      report.missingPairs.push(pairKey);
      return;
    }
    const mismatches = [];
    const performanceQty = parseNumberField(performance.qty, 'qty');
    const positionQty = parseNumberField(position['Paired Qty'], 'Paired Qty');
    const performanceBuyPrice = parseNumberField(performance.buyPrice, 'buyPrice');
    const positionBuyPrice = parseNumberField(position['Buy Price'], 'Buy Price');
    const performanceSellPrice = parseNumberField(performance.sellPrice, 'sellPrice');
    const positionSellPrice = parseNumberField(position['Sell Price'], 'Sell Price');
    const performancePnl = parseTradovateMoney(performance.pnl);
    const positionPnl = parseTradovateMoney(position['P/L']);
    if (!almostEqual(performanceQty, positionQty)) mismatches.push({ field: 'qty', performance: performanceQty, position: positionQty });
    if (!almostEqual(performanceBuyPrice, positionBuyPrice)) mismatches.push({ field: 'buyPrice', performance: performanceBuyPrice, position: positionBuyPrice });
    if (!almostEqual(performanceSellPrice, positionSellPrice)) mismatches.push({ field: 'sellPrice', performance: performanceSellPrice, position: positionSellPrice });
    if (!almostEqual(performancePnl, positionPnl)) mismatches.push({ field: 'pnl', performance: performancePnl, position: positionPnl });
    if (mismatches.length) {
      report.mismatchedPairs.push({
        pairKey,
        positionId: cleanField(position['Position ID']),
        pairId: cleanField(position['Pair ID']),
        mismatches,
      });
    }
  });

  positionByPair.forEach((position, pairKey) => {
    if (!performanceByPair.has(pairKey)) report.extraPairs.push(pairKey);
  });

  report.ok = !report.missingPairs.length && !report.extraPairs.length && !report.mismatchedPairs.length;
  if (!report.ok) {
    report.warnings.push(
      `Position History mismatch: missing=${report.missingPairs.length}, extra=${report.extraPairs.length}, mismatched=${report.mismatchedPairs.length}`
    );
  }
  return report;
}

function aggregateCashRows(cashRows = []) {
  const byType = {};
  cashRows.forEach((row) => {
    const type = cleanField(row['Cash Change Type']) || 'unknown';
    const delta = parseTradovateMoney(row.Delta);
    if (!byType[type]) byType[type] = { count: 0, total: 0 };
    byType[type].count += 1;
    byType[type].total += delta;
  });
  Object.values(byType).forEach((item) => {
    item.total = Number(item.total.toFixed(2));
  });
  return byType;
}

function sumFillsCommission(fills = []) {
  return Number(fills
    .map((fill) => parseOptionalNumberField(fill.commission))
    .filter((value) => value !== null)
    .reduce((sum, value) => sum + value, 0)
    .toFixed(2));
}

function sumPerformancePnl(rows = []) {
  return Number(rows
    .reduce((sum, row) => sum + parseTradovateMoney(row.pnl), 0)
    .toFixed(2));
}

function reconcileCashHistory(performanceRows = [], fills = [], cashRows = []) {
  const report = createEmptyCashReconciliation();
  if (!cashRows.length) return report;

  report.provided = true;
  report.rows = cashRows.length;
  report.byType = aggregateCashRows(cashRows);
  report.commissionTotal = report.byType.Commission?.total ?? 0;
  report.fillsCommissionTotal = sumFillsCommission(fills);
  report.commissionDifference = Number((Math.abs(report.commissionTotal) - Math.abs(report.fillsCommissionTotal)).toFixed(2));
  report.tradePairedTotal = report.byType['Trade Paired']?.total ?? 0;
  report.performancePnlTotal = sumPerformancePnl(performanceRows);
  report.tradePairedDifference = Number((report.tradePairedTotal - report.performancePnlTotal).toFixed(2));

  if (!almostEqual(report.commissionDifference, 0, 0.01)) {
    report.warnings.push(`Cash History commission differs from Fills commission by ${report.commissionDifference.toFixed(2)}`);
  }
  if (!almostEqual(report.tradePairedDifference, 0, 0.01)) {
    report.warnings.push(`Cash History Trade Paired differs from Performance P/L by ${report.tradePairedDifference.toFixed(2)}`);
  }
  report.ok = report.warnings.length === 0;
  return report;
}

function tradeDateFromPerformanceRow(row = {}) {
  const text = String(row.boughtTimestamp || row.soldTimestamp || '').trim();
  if (!text) return '';
  try {
    const parts = parseTradovateDateParts(text);
    return [
      String(parts.year).padStart(4, '0'),
      String(parts.month).padStart(2, '0'),
      String(parts.day).padStart(2, '0'),
    ].join('-');
  } catch {
    return text.slice(0, 10);
  }
}

function aggregatePerformancePnlByDate(rows = []) {
  const byDate = new Map();
  rows.forEach((row) => {
    const date = tradeDateFromPerformanceRow(row);
    if (!date) return;
    byDate.set(date, Number(((byDate.get(date) || 0) + parseTradovateMoney(row.pnl)).toFixed(2)));
  });
  return byDate;
}

function reconcileAccountBalanceHistory(performanceRows = [], balanceRows = []) {
  const report = createEmptyBalanceReconciliation();
  if (!balanceRows.length) return report;

  report.provided = true;
  report.rows = balanceRows.length;
  const performanceByDate = aggregatePerformancePnlByDate(performanceRows);
  report.dailyRows = balanceRows.map((row) => {
    const tradeDate = cleanField(row['Trade Date']);
    const balanceRealizedPnl = parseTradovateMoney(row['Total Realized PNL']);
    const performancePnl = Number((performanceByDate.get(tradeDate) || 0).toFixed(2));
    const difference = Number((balanceRealizedPnl - performancePnl).toFixed(2));
    return {
      tradeDate,
      totalAmount: parseTradovateMoney(row['Total Amount']),
      balanceRealizedPnl,
      performancePnl,
      difference,
      ok: almostEqual(difference, 0, 0.01),
    };
  });
  const mismatches = report.dailyRows.filter((row) => !row.ok);
  if (mismatches.length) {
    report.warnings.push(`Account Balance daily realized P/L differs on ${mismatches.length} day(s)`);
  }
  report.ok = report.warnings.length === 0;
  return report;
}

function getSide(row = {}) {
  return cleanField(row['B/S']).toLowerCase();
}

function getOrderStatus(row = {}) {
  return cleanField(row.Status).toLowerCase();
}

function getOrderType(row = {}) {
  return cleanField(row.Type).toLowerCase();
}

function getOrderPrice(row = {}) {
  return parseOptionalNumberField(
    row.decimalFillAvg || row['Avg Fill Price'] || row.avgPrice || row.Price || row.decimalLimit || row['Limit Price'] || row.decimalStop || row['Stop Price']
  );
}

function getStopPrice(row = {}) {
  return parseOptionalNumberField(row.decimalStop || row['Stop Price']);
}

function getLimitPrice(row = {}) {
  return parseOptionalNumberField(row.decimalLimit || row['Limit Price']);
}

function getTimestampValue(row = {}, field = 'Timestamp') {
  return cleanField(row[field]);
}

function indexEnhancementRows({ ordersText = '', fillsText = '', timeZone = 'UTC' } = {}) {
  const orders = parseTradovateOrdersCsv(ordersText);
  const fills = parseTradovateFillsCsv(fillsText);
  const ordersById = new Map(orders.map((order) => [getOrderId(order), order]).filter(([id]) => id));
  const fillsById = new Map(fills.map((fill) => [getFillId(fill), fill]).filter(([id]) => id));
  const ordersWithEpoch = orders.map((order) => {
    let timestamp = null;
    try {
      timestamp = tradovateTimestampToEpochSeconds(getTimestampValue(order), timeZone);
    } catch {
      timestamp = null;
    }
    return { order, timestamp };
  });
  return { orders, fills, ordersById, fillsById, ordersWithEpoch };
}

function filterRowsByContractInstrument(rows = [], instrument = '') {
  const target = String(instrument || '').trim().toUpperCase();
  if (!target) return rows;
  return rows.filter((row) => {
    const contractInstrument = mapTradovateSymbolToInstrument(row.Contract || row.symbol || '');
    return !contractInstrument || contractInstrument === target;
  });
}

function buildReconciliationReport(rows, options = {}) {
  const instrument = String(options.instrument || '').trim().toUpperCase();
  const positionRows = filterRowsByContractInstrument(
    parseTradovatePositionHistoryCsv(options.positionHistoryText || ''),
    instrument
  );
  const cashRows = filterRowsByContractInstrument(
    parseTradovateCashHistoryCsv(options.cashHistoryText || ''),
    instrument
  );
  const fills = filterRowsByContractInstrument(
    parseTradovateFillsCsv(options.fillsText || ''),
    instrument
  );
  const balanceRows = parseTradovateAccountBalanceHistoryCsv(options.accountBalanceHistoryText || '');
  return {
    position: reconcilePositionHistory(rows, positionRows),
    cash: reconcileCashHistory(rows, fills, cashRows),
    balance: reconcileAccountBalanceHistory(rows, balanceRows),
  };
}

function getOrderByFillId(fillId, enhancement) {
  const fill = enhancement.fillsById.get(cleanField(fillId));
  if (!fill) return null;
  return enhancement.ordersById.get(getOrderId(fill)) || null;
}

function isSameContractOrder(order, sourceSymbol) {
  return cleanField(order.Contract).toUpperCase() === cleanField(sourceSymbol).toUpperCase();
}

function findCompanionOrder({ enhancement, sourceSymbol, side, type, entryTs, exitTs, excludeOrderIds = new Set() }) {
  const normalizedSide = String(side || '').toLowerCase();
  const normalizedType = String(type || '').toLowerCase();
  const candidates = enhancement.ordersWithEpoch
    .filter(({ order, timestamp }) => (
      timestamp !== null
      && timestamp >= entryTs - 60
      && timestamp <= exitTs + 60
      && isSameContractOrder(order, sourceSymbol)
      && getSide(order) === normalizedSide
      && getOrderType(order) === normalizedType
      && !excludeOrderIds.has(getOrderId(order))
    ))
    .sort((a, b) => a.timestamp - b.timestamp);
  return candidates[0]?.order || null;
}

function buildExecutionOrder(row, timeZone) {
  const timestampValue = getTimestampValue(row);
  let timestamp = null;
  try {
    timestamp = timestampValue ? tradovateTimestampToEpochSeconds(timestampValue, timeZone) : null;
  } catch {
    timestamp = null;
  }
  const type = getOrderType(row) || 'order';
  const status = getOrderStatus(row) || 'unknown';
  const side = cleanField(row['B/S']);
  const stopPrice = getStopPrice(row);
  const limitPrice = getLimitPrice(row);
  const fillPrice = getOrderPrice(row);
  const price = fillPrice ?? stopPrice ?? limitPrice;
  return {
    id: getOrderId(row),
    timestamp,
    note: [
      `Tradovate ${cleanField(row.Type) || type} ${side}`.trim(),
      cleanField(row.Status) || status,
      price !== null ? `price ${price}` : '',
      cleanField(row.Contract),
    ].filter(Boolean).join('; '),
    type,
    status,
    side: side.toLowerCase(),
    price,
    stopPrice,
    limitPrice,
    fillPrice,
  };
}

function buildExecutionFill(row, timeZone) {
  const timestampValue = getTimestampValue(row);
  const timestamp = tradovateTimestampToEpochSeconds(timestampValue, timeZone);
  const commission = parseOptionalNumberField(row.commission);
  const price = parseNumberField(row.Price || row._price, 'fill price');
  const quantity = parseNumberField(row.Quantity || row._qty, 'fill quantity');
  return {
    id: getFillId(row),
    timestamp,
    price,
    quantity,
    note: [
      `Tradovate ${cleanField(row['B/S'])} fill for ${cleanField(row.Contract)}.`.replace(/\s+/g, ' '),
      commission !== null ? `commission ${commission}` : '',
      getOrderId(row) ? `orderId ${getOrderId(row)}` : '',
    ].filter(Boolean).join(' '),
    orderId: getOrderId(row),
    side: getSide(row),
    commission,
  };
}

function resultStatus(pnl) {
  if (pnl > 0) return 'win';
  if (pnl < 0) return 'loss';
  return 'breakeven';
}

function exitTypeFromPnl(pnl) {
  if (pnl > 0) return 'profit';
  if (pnl < 0) return 'stopLoss';
  return 'breakeven';
}

function buildImportedStopLoss({ pnl, exitTs, exitPrice, stopOrder, timeZone }) {
  const stopPrice = stopOrder ? getStopPrice(stopOrder) : null;
  const stopStatus = stopOrder ? getOrderStatus(stopOrder) : '';
  const stopTimestampText = stopOrder ? getTimestampValue(stopOrder, stopStatus === 'filled' ? 'Fill Time' : 'Timestamp') : '';
  let stopTimestamp = exitTs;
  if (stopTimestampText) {
    try {
      stopTimestamp = tradovateTimestampToEpochSeconds(stopTimestampText, timeZone);
    } catch {
      stopTimestamp = exitTs;
    }
  }
  if (pnl >= 0 && stopPrice === null) return {};
  return {
    id: 'stopLoss',
    role: 'stopLoss',
    label: 'Stop Loss',
    timestamp: stopTimestamp,
    timeframe: DEFAULT_TIMEFRAME,
    price: stopPrice ?? exitPrice,
    endTimestamp: exitTs,
    endTimeframe: DEFAULT_TIMEFRAME,
    visible: true,
    complete: pnl < 0 || stopStatus === 'filled',
    note: stopOrder
      ? `Imported Tradovate stop order: ${stopStatus || 'unknown'}${pnl < 0 ? '; exit matched stop loss.' : '; cancelled after target/exit.'}`
      : 'Imported losing trade: exit used as stop loss.',
  };
}

function buildImportedTargets({ pnl, exitTs, exitPrice, targetOrder, timeZone }) {
  const targetPrice = targetOrder ? getLimitPrice(targetOrder) : null;
  const targetStatus = targetOrder ? getOrderStatus(targetOrder) : '';
  const targetTimestampText = targetOrder ? getTimestampValue(targetOrder, targetStatus === 'filled' ? 'Fill Time' : 'Timestamp') : '';
  let targetTimestamp = exitTs;
  if (targetTimestampText) {
    try {
      targetTimestamp = tradovateTimestampToEpochSeconds(targetTimestampText, timeZone);
    } catch {
      targetTimestamp = exitTs;
    }
  }
  if (pnl <= 0 && targetPrice === null) return [];
  return [{
    id: 'targetInternal1',
    role: 'targetInternal1',
    targetType: 'internal',
    label: 'Target Internal 1',
    timestamp: targetTimestamp,
    timeframe: DEFAULT_TIMEFRAME,
    price: targetPrice ?? exitPrice,
    endTimestamp: exitTs,
    endTimeframe: DEFAULT_TIMEFRAME,
    visible: true,
    complete: pnl > 0 || targetStatus === 'filled',
    note: targetOrder
      ? `Imported Tradovate limit target order: ${targetStatus || 'unknown'}${pnl > 0 ? '; exit matched target.' : '; cancelled after stop/exit.'}`
      : 'Imported winning trade: exit used as Target Internal 1.',
  }];
}

export function formatTradovatePnl(pnl) {
  const sign = pnl < 0 ? '-' : '';
  return `${sign}$${Math.abs(pnl).toFixed(2)}`;
}

function buildLiveRecord(row, { instrument, timeZone, nowMs, enhancement }) {
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
  const buyOrder = getOrderByFillId(row.buyFillId, enhancement);
  const sellOrder = getOrderByFillId(row.sellFillId, enhancement);
  const exitSide = isLong ? 'sell' : 'buy';
  const usedOrderIds = new Set([buyOrder, sellOrder].filter(Boolean).map(getOrderId));
  const exitOrder = isLong ? sellOrder : buyOrder;
  const exitOrderType = getOrderType(exitOrder || {});
  const stopOrder = exitOrderType === 'stop'
    ? exitOrder
    : findCompanionOrder({ enhancement, sourceSymbol, side: exitSide, type: 'stop', entryTs, exitTs, excludeOrderIds: usedOrderIds });
  const targetOrder = exitOrderType === 'limit'
    ? exitOrder
    : findCompanionOrder({ enhancement, sourceSymbol, side: exitSide, type: 'limit', entryTs, exitTs, excludeOrderIds: usedOrderIds });
  const executionOrders = [buyOrder, sellOrder, stopOrder, targetOrder]
    .filter(Boolean)
    .filter((order, index, rows) => rows.findIndex((candidate) => getOrderId(candidate) === getOrderId(order)) === index)
    .map((order) => buildExecutionOrder(order, timeZone));
  const buyFill = enhancement.fillsById.get(cleanField(row.buyFillId));
  const sellFill = enhancement.fillsById.get(cleanField(row.sellFillId));
  const executionFills = [buyFill, sellFill].filter(Boolean).map((fill) => buildExecutionFill(fill, timeZone));
  const fallbackFills = [
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
  ];
  const commissionTotal = executionFills
    .map((fill) => Number(fill.commission))
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);
  const orderDetails = [
    stopOrder ? `stop ${getOrderStatus(stopOrder)} @ ${getStopPrice(stopOrder) ?? 'unknown'}` : '',
    targetOrder ? `target ${getOrderStatus(targetOrder)} @ ${getLimitPrice(targetOrder) ?? 'unknown'}` : '',
    executionFills.length && commissionTotal ? `commission $${commissionTotal.toFixed(2)}` : '',
  ].filter(Boolean).join('; ');

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
      stopLoss: buildImportedStopLoss({ pnl, exitTs, exitPrice, stopOrder, timeZone }),
      targets: buildImportedTargets({ pnl, exitTs, exitPrice, targetOrder, timeZone }),
      orders: executionOrders,
      fills: executionFills.length ? executionFills : fallbackFills,
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
      note: `Tradovate realized P/L ${pnlText}; qty ${quantity}; buyFillId ${row.buyFillId || ''}; sellFillId ${row.sellFillId || ''}; duration ${duration || 'unknown'}${orderDetails ? `; ${orderDetails}` : ''}.`,
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
  const enhancement = indexEnhancementRows({
    ordersText: options.ordersText || '',
    fillsText: options.fillsText || '',
    timeZone,
  });
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
  const importedRows = [];

  rows.forEach((row) => {
    if (mapTradovateSymbolToInstrument(row.symbol) !== instrument) {
      skippedRows += 1;
      return;
    }
    importedRows.push(row);
    const record = buildLiveRecord(row, { instrument, timeZone, nowMs, enhancement });
    const pnl = parseTradovateMoney(row.pnl);
    liveRecords.push(record);
    totalPnl += pnl;
    if (pnl > 0) wins += 1;
    else if (pnl < 0) losses += 1;
    else breakeven += 1;
  });
  const reconciliation = buildReconciliationReport(importedRows, { ...options, instrument });

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
      ordersRowCount: enhancement.orders.length,
      fillsRowCount: enhancement.fills.length,
      reconciliation,
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
    ordersRows: enhancement.orders.length,
    fillsRows: enhancement.fills.length,
    reconciliation,
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
