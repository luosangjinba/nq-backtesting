import {
  cleanField,
  getFillId,
  getOrderId,
  mapTradovateSymbolToInstrument,
  parseNumberField,
  parseOptionalNumberField,
  parseTradovateAccountBalanceHistoryCsv,
  parseTradovateCashHistoryCsv,
  parseTradovateFillsCsv,
  parseTradovateMoney,
  parseTradovateOrdersCsv,
  parseTradovatePositionHistoryCsv,
  parseTradovateDateParts,
} from './tradovate-csv-parsers.js';

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
    skipped: false,
    skippedReason: '',
    warnings: [],
    rows: 0,
    dailyRows: [],
  };
}

function createEmptyFileAlignmentReport() {
  return {
    ok: true,
    warnings: [],
    performanceRows: 0,
    ordersRows: 0,
    fillsRows: 0,
    positionRows: 0,
    cashRows: 0,
    balanceRows: 0,
    missingPerformanceFillIds: [],
    fillsWithoutOrders: [],
    orderlessPerformanceFillIds: [],
    positionOnlyPairs: [],
    cashInstrumentRows: 0,
  };
}

export function buildTradovateFileAlignmentReport({
  performanceRows = [],
  orders = [],
  fills = [],
  positionRows = [],
  cashRows = [],
  balanceRows = [],
} = {}) {
  const report = createEmptyFileAlignmentReport();
  report.performanceRows = performanceRows.length;
  report.ordersRows = orders.length;
  report.fillsRows = fills.length;
  report.positionRows = positionRows.length;
  report.cashRows = cashRows.length;
  report.balanceRows = balanceRows.length;
  report.cashInstrumentRows = cashRows.filter((row) => cleanField(row.Contract)).length;

  const performanceFillIds = new Set();
  performanceRows.forEach((row) => {
    const buyFillId = cleanField(row.buyFillId);
    const sellFillId = cleanField(row.sellFillId);
    if (buyFillId) performanceFillIds.add(buyFillId);
    if (sellFillId) performanceFillIds.add(sellFillId);
  });

  const fillsById = new Map(fills.map((fill) => [getFillId(fill), fill]).filter(([id]) => id));
  const ordersById = new Map(orders.map((order) => [getOrderId(order), order]).filter(([id]) => id));

  if (fills.length) {
    performanceFillIds.forEach((fillId) => {
      if (!fillsById.has(fillId)) report.missingPerformanceFillIds.push(fillId);
    });
  }

  if (orders.length && fills.length) {
    fills.forEach((fill) => {
      const orderId = getOrderId(fill);
      if (orderId && !ordersById.has(orderId)) {
        report.fillsWithoutOrders.push({
          fillId: getFillId(fill),
          orderId,
        });
      }
    });

    performanceFillIds.forEach((fillId) => {
      const fill = fillsById.get(fillId);
      if (!fill) return;
      const orderId = getOrderId(fill);
      if (orderId && !ordersById.has(orderId)) {
        report.orderlessPerformanceFillIds.push(fillId);
      }
    });
  }

  if (positionRows.length) {
    const performancePairs = new Set(
      performanceRows.map((row) => getPerformancePairKey(row)).filter((key) => key !== ':')
    );
    positionRows.forEach((row) => {
      const pairKey = getPositionPairKey(row);
      if (pairKey !== ':' && !performancePairs.has(pairKey)) report.positionOnlyPairs.push(pairKey);
    });
  }

  if (report.missingPerformanceFillIds.length) {
    report.warnings.push(`Fills CSV is missing ${report.missingPerformanceFillIds.length} Performance fill id(s)`);
  }
  if (report.fillsWithoutOrders.length) {
    report.warnings.push(`Orders CSV is missing ${report.fillsWithoutOrders.length} order id(s) referenced by Fills CSV`);
  }
  if (report.positionOnlyPairs.length) {
    report.warnings.push(`Position History has ${report.positionOnlyPairs.length} pair(s) not present in Performance CSV`);
  }
  if (cashRows.length && report.cashInstrumentRows === 0) {
    report.warnings.push('Cash History has no Contract values; instrument-level cash reconciliation may be account-wide');
  }
  report.ok = report.warnings.length === 0;
  return report;
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

function sortableTradovateTimestamp(value = '') {
  const parts = parseTradovateDateParts(value);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function tradeDateFromPerformanceRow(row = {}) {
  const candidates = [row.boughtTimestamp, row.soldTimestamp]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((text) => {
      try {
        return { text, sortValue: sortableTradovateTimestamp(text) };
      } catch {
        return { text, sortValue: null };
      }
    });
  if (!candidates.length) return '';
  const text = candidates
    .filter((candidate) => candidate.sortValue !== null)
    .sort((left, right) => right.sortValue - left.sortValue)[0]?.text || candidates[candidates.length - 1].text;
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

function reconcileAccountBalanceHistory(performanceRows = [], balanceRows = [], options = {}) {
  const report = createEmptyBalanceReconciliation();
  if (!balanceRows.length) return report;

  report.provided = true;
  report.rows = balanceRows.length;
  if (options.skipReason) {
    report.skipped = true;
    report.skippedReason = options.skipReason;
    return report;
  }
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

function filterRowsByContractInstrument(rows = [], instrument = '') {
  const target = String(instrument || '').trim().toUpperCase();
  if (!target) return rows;
  return rows.filter((row) => {
    const contractInstrument = mapTradovateSymbolToInstrument(row.Contract || row.symbol || '');
    return !contractInstrument || contractInstrument === target;
  });
}

export function getParsedSupportRows(options = {}, instrument = '') {
  const targetInstrument = String(instrument || options.instrument || '').trim().toUpperCase();
  const orders = filterRowsByContractInstrument(parseTradovateOrdersCsv(options.ordersText || ''), targetInstrument);
  const fills = filterRowsByContractInstrument(parseTradovateFillsCsv(options.fillsText || ''), targetInstrument);
  const positionRows = filterRowsByContractInstrument(parseTradovatePositionHistoryCsv(options.positionHistoryText || ''), targetInstrument);
  const cashRows = filterRowsByContractInstrument(parseTradovateCashHistoryCsv(options.cashHistoryText || ''), targetInstrument);
  const balanceRows = parseTradovateAccountBalanceHistoryCsv(options.accountBalanceHistoryText || '');
  return { orders, fills, positionRows, cashRows, balanceRows };
}

export function buildReconciliationReport(rows, options = {}) {
  const supportRows = getParsedSupportRows(options, options.instrument);
  return {
    position: reconcilePositionHistory(rows, supportRows.positionRows),
    cash: reconcileCashHistory(rows, supportRows.fills, supportRows.cashRows),
    balance: reconcileAccountBalanceHistory(rows, supportRows.balanceRows, {
      skipReason: options.balanceSkipReason || '',
    }),
  };
}
