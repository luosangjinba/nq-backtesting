import {
  cleanField,
  getFillId,
  getOrderId,
  getTradovateDetectedInstruments,
  mapTradovateSymbolToInstrument,
  parseNumberField,
  parseOptionalNumberField,
  parseTradovateFillsCsv,
  parseTradovateMoney,
  parseTradovateOrdersCsv,
  parseTradovatePerformanceCsv,
  tradovateTimestampToEpochSeconds,
} from './tradovate-csv-parsers.js';
import {
  buildReconciliationReport,
  buildTradovateFileAlignmentReport,
  getParsedSupportRows,
} from './tradovate-file-alignment.js';
import {
  DEFAULT_TIMEFRAME,
  REVIEW_ARCHIVE_APP,
  REVIEW_ARCHIVE_VERSION,
  formatTradovatePnl,
  stableTradovateRecordId,
} from './tradovate-format.js';

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
  const quantity = parseOptionalNumberField(row.Quantity || row.qty);
  const filledQuantity = parseOptionalNumberField(row['Filled Qty'] || row.filledQty);
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
    quantity,
    filledQuantity,
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

function exitTypeFromPnl(pnl, exitOrder) {
  if (pnl > 0) return getOrderType(exitOrder || {}) === 'limit' ? 'profit' : 'manualProfit';
  if (pnl < 0) return getOrderType(exitOrder || {}) === 'stop' ? 'stopLoss' : 'manualLoss';
  return 'breakeven';
}

function buildImportedStopLoss({ pnl, exitTs, exitPrice, stopOrder, exitType, timeZone }) {
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
  if (exitType !== 'stopLoss' && !stopOrder) return {};
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
    complete: stopStatus === 'filled',
    note: stopOrder
      ? `Imported Tradovate stop order: ${stopStatus || 'unknown'}${exitType === 'stopLoss' ? '; exit matched stop loss.' : '; not the filled exit.'}`
      : 'Imported losing trade: filled stop exit.',
  };
}

function buildImportedTargets({ pnl, exitTs, exitPrice, targetOrder, exitType, timeZone }) {
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
  if (exitType !== 'profit' && !targetOrder) return [];
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
    complete: targetStatus === 'filled',
    note: targetOrder
      ? `Imported Tradovate limit target order: ${targetStatus || 'unknown'}${exitType === 'profit' ? '; exit matched target.' : '; cancelled after stop/exit.'}`
      : 'Imported winning trade: exit used as Target Internal 1.',
  }];
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
  const resultExitType = exitTypeFromPnl(pnl, exitOrder);
  const stopOrder = exitOrderType === 'stop'
    ? exitOrder
    : findCompanionOrder({ enhancement, sourceSymbol, side: exitSide, type: 'stop', entryTs, exitTs, excludeOrderIds: usedOrderIds });
  const targetOrder = pnl > 0 && exitOrderType === 'limit'
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
    id: stableTradovateRecordId(row, instrument),
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
      stopLoss: buildImportedStopLoss({ pnl, exitTs, exitPrice, stopOrder, exitType: resultExitType, timeZone }),
      targets: buildImportedTargets({ pnl, exitTs, exitPrice, targetOrder, exitType: resultExitType, timeZone }),
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
      exitType: resultExitType,
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
  const balanceSkipReason = detected.size > 1 && String(options.accountBalanceHistoryText || '').trim()
    ? 'Account Balance History is account-wide; mixed-instrument auto imports skip per-instrument balance reconciliation.'
    : '';

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
  const supportRows = getParsedSupportRows(options, instrument);
  const fileAlignment = buildTradovateFileAlignmentReport({
    performanceRows: importedRows,
    ...supportRows,
  });
  const reconciliation = buildReconciliationReport(importedRows, { ...options, instrument, balanceSkipReason });

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
      sourceFileName: options.sourceFileName || '',
      timezone: timeZone,
      rowCount: rows.length,
      skippedRows,
      ordersRowCount: enhancement.orders.length,
      fillsRowCount: enhancement.fills.length,
      fileAlignment,
      reconciliation,
      importBatch: {
        sourceType: 'tradovate-performance-csv',
        sourceFileName: options.sourceFileName || '',
        instrument,
        counts: {
          liveRecords: liveRecords.length,
          sourceRows: rows.length,
          ordersRows: enhancement.orders.length,
          fillsRows: enhancement.fills.length,
        },
        skipped: {
          sourceRows: skippedRows,
        },
      },
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
    fileAlignment,
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
