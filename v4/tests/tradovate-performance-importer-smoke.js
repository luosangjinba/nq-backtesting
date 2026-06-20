import assert from 'node:assert/strict';

import {
  buildTradovateLiveRecordArchive,
  buildTradovateLiveRecordArchives,
  mapTradovateSymbolToInstrument,
  parseTradovateAccountBalanceHistoryCsv,
  parseTradovateCashHistoryCsv,
  parseTradovatePositionHistoryCsv,
  parseTradovateMoney,
  tradovateTimestampToEpochSeconds,
} from '../src/live-record/tradovate-performance-importer.js';
import { normalizeLiveRecord } from '../src/live-record/live-record-store.js';

const csv = [
  'symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration',
  'MNQM6,-2,0,0.25,524699600302,524699600331,4,29320.00,29291.75,$(226.00),06/12/2026 09:49:42,06/12/2026 09:50:11,29sec',
  'MNQM6,-2,0,0.25,524699600400,524699600455,1,29310.00,29433.75,$247.50,06/12/2026 09:54:12,06/12/2026 10:00:56,6min 44sec',
].join('\n');

assert.equal(parseTradovateMoney('$(226.00)'), -226);
assert.equal(parseTradovateMoney('$247.50'), 247.5);
assert.equal(mapTradovateSymbolToInstrument('MNQM6'), 'NQ');
assert.equal(mapTradovateSymbolToInstrument('MESM6'), 'ES');
assert.equal(
  tradovateTimestampToEpochSeconds('06/12/2026 09:49:42', 'UTC'),
  1781257782
);

const result = buildTradovateLiveRecordArchive(csv, {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
});

assert.equal(result.payload.app, 'trading-v4-review');
assert.equal(result.payload.instrument, 'NQ');
assert.equal(result.sourceRows, 2);
assert.equal(result.liveRecords, 2);
assert.equal(result.wins, 1);
assert.equal(result.losses, 1);
assert.equal(result.totalPnl, 21.5);

const first = result.payload.liveRecords[0];
assert.equal(first.status, 'closed');
assert.equal(first.direction, 'long');
assert.equal(first.execution.entry.price, 29320);
assert.equal(first.result.exitPrice, 29291.75);
assert.equal(first.result.status, 'loss');
assert.equal(first.result.exitType, 'stopLoss');
assert.equal(first.execution.stopLoss.price, 29291.75);
assert.equal(first.execution.stopLoss.complete, true);
assert.equal(first.execution.targets.length, 0);
assert.equal(first.execution.fills[0].id, '524699600302');
assert.match(first.summary, /Tradovate import/);
assert.equal(result.reconciliation.position.provided, false, 'omitted Position History keeps reconciliation optional');
assert.equal(result.reconciliation.cash.provided, false, 'omitted Cash History keeps reconciliation optional');
assert.equal(result.reconciliation.balance.provided, false, 'omitted Account Balance keeps reconciliation optional');

const positionHistoryCsv = [
  'Position ID,Timestamp,Trade Date,Net Pos,Net Price,Bought,Avg. Buy,Sold,Avg. Sell,Account,Contract,Product,Product Description,_priceFormat,_priceFormatType,_tickSize,Pair ID,Buy Fill ID,Sell Fill ID,Paired Qty,Buy Price,Sell Price,P/L,Currency,Bought Timestamp,Sold Timestamp',
  'pos-1,06/12/2026 09:50:11,2026-06-12,0,,4,29320.00,4,29291.75,acct,MNQM6,MNQ,Micro E-mini NASDAQ-100,-2,0,0.25,pair-1,524699600302,524699600331,4,29320.00,29291.75,-226.00,USD,06/12/2026 09:49:42,06/12/2026 09:50:11',
  'pos-2,06/12/2026 10:00:56,2026-06-12,0,,1,29310.00,1,29433.75,acct,MNQM6,MNQ,Micro E-mini NASDAQ-100,-2,0,0.25,pair-2,524699600400,524699600455,1,29310.00,29433.75,247.50,USD,06/12/2026 09:54:12,06/12/2026 10:00:56',
].join('\n');

assert.equal(parseTradovatePositionHistoryCsv(positionHistoryCsv).length, 2, 'Position History parser reads rows');
const reconciled = buildTradovateLiveRecordArchive(csv, {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
  positionHistoryText: positionHistoryCsv,
});
assert.equal(reconciled.reconciliation.position.provided, true, 'Position History reconciliation is enabled when provided');
assert.equal(reconciled.reconciliation.position.ok, true, 'matching Position History reconciles cleanly');
assert.equal(reconciled.reconciliation.position.performancePairs, 2, 'performance pair count is reported');
assert.equal(reconciled.reconciliation.position.positionPairs, 2, 'position pair count is reported');
assert.equal(reconciled.payload.source.reconciliation.position.ok, true, 'Review JSON source carries reconciliation summary');

const mismatchedPositionHistoryCsv = positionHistoryCsv.replace('247.50,USD', '999.00,USD');
const mismatched = buildTradovateLiveRecordArchive(csv, {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
  positionHistoryText: mismatchedPositionHistoryCsv,
});
assert.equal(mismatched.reconciliation.position.ok, false, 'Position History mismatch is detected');
assert.equal(mismatched.reconciliation.position.mismatchedPairs.length, 1, 'mismatched pair is reported');
assert.equal(
  mismatched.reconciliation.position.mismatchedPairs[0].mismatches[0].field,
  'pnl',
  'mismatch includes field name'
);

const accountBalanceHistoryCsv = [
  'Account ID,Account Name,Trade Date,Total Amount,Total Realized PNL',
  '1,acct,2026-06-12,"25,021.50",21.50',
].join('\n');
assert.equal(parseTradovateAccountBalanceHistoryCsv(accountBalanceHistoryCsv).length, 1, 'Account Balance parser reads rows');
const balanceReconciled = buildTradovateLiveRecordArchive(csv, {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
  accountBalanceHistoryText: accountBalanceHistoryCsv,
});
assert.equal(balanceReconciled.reconciliation.balance.provided, true, 'Account Balance reconciliation is enabled when provided');
assert.equal(balanceReconciled.reconciliation.balance.ok, true, 'matching daily balance reconciles cleanly');
assert.equal(balanceReconciled.reconciliation.balance.dailyRows[0].tradeDate, '2026-06-12', 'daily balance row reports trade date');
assert.equal(balanceReconciled.reconciliation.balance.dailyRows[0].performancePnl, 21.5, 'daily balance compares Performance P/L');
assert.equal(balanceReconciled.reconciliation.balance.dailyRows[0].difference, 0, 'daily balance difference is reported');

const overnightLongCsv = [
  'symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration',
  'MNQM6,-2,0,0.25,overnight-buy,overnight-sell,1,29320.00,29330.00,$20.00,06/12/2026 23:59:42,06/13/2026 00:01:11,1min 29sec',
].join('\n');
const overnightBalanceCsv = [
  'Account ID,Account Name,Trade Date,Total Amount,Total Realized PNL',
  '1,acct,2026-06-13,"25,020.00",20.00',
].join('\n');
const overnightBalanceReconciled = buildTradovateLiveRecordArchive(overnightLongCsv, {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
  accountBalanceHistoryText: overnightBalanceCsv,
});
assert.equal(overnightBalanceReconciled.reconciliation.balance.ok, true, 'overnight long balance uses exit date');
assert.equal(
  overnightBalanceReconciled.reconciliation.balance.dailyRows[0].performancePnl,
  20,
  'overnight long P/L is grouped on the exit day'
);

const mixedCsv = [
  'symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration',
  'MNQM6,-2,0,0.25,nq-buy,nq-sell,1,29320.00,29330.00,$20.00,06/12/2026 09:49:42,06/12/2026 09:50:11,29sec',
  'MESM6,-2,0,0.25,es-buy,es-sell,1,6000.00,5995.00,$(25.00),06/12/2026 10:00:00,06/12/2026 10:01:00,1min',
].join('\n');

const splitResults = buildTradovateLiveRecordArchives(mixedCsv, {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
});

assert.deepEqual(splitResults.map((item) => item.payload.instrument), ['ES', 'NQ']);
assert.deepEqual(splitResults.map((item) => item.liveRecords), [1, 1]);
assert.equal(splitResults.find((item) => item.payload.instrument === 'NQ').totalPnl, 20);
assert.equal(splitResults.find((item) => item.payload.instrument === 'ES').totalPnl, -25);
assert.equal(
  splitResults.find((item) => item.payload.instrument === 'NQ').payload.liveRecords[0].result.exitType,
  'profit'
);
assert.equal(
  splitResults.find((item) => item.payload.instrument === 'NQ').payload.liveRecords[0].execution.targets[0].role,
  'targetInternal1'
);
assert.equal(
  splitResults.find((item) => item.payload.instrument === 'NQ').payload.liveRecords[0].execution.targets[0].price,
  29330
);
const splitWithBalance = buildTradovateLiveRecordArchives(mixedCsv, {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
  accountBalanceHistoryText: [
    'Account ID,Account Name,Trade Date,Total Amount,Total Realized PNL',
    '1,acct,2026-06-12,"24,995.00",-5.00',
  ].join('\n'),
});
splitWithBalance.forEach((item) => {
  assert.equal(item.reconciliation.balance.provided, true, 'mixed auto balance input is acknowledged');
  assert.equal(item.reconciliation.balance.skipped, true, 'mixed auto skips account-wide balance per instrument');
  assert.equal(item.reconciliation.balance.ok, true, 'mixed auto balance skip does not produce false warnings');
});

const breakevenResult = buildTradovateLiveRecordArchive([
  'symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration',
  'MNQM6,-2,0,0.25,be-buy,be-sell,1,29320.00,29320.00,$0.00,06/12/2026 09:49:42,06/12/2026 09:50:11,29sec',
].join('\n'), {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
});
assert.equal(breakevenResult.payload.liveRecords[0].result.status, 'breakeven');
assert.equal(breakevenResult.payload.liveRecords[0].result.exitType, 'breakeven');

const performanceWithEnhancements = [
  'symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration',
  'MESU6,-2,0,0.25,509681603418,509681603431,1,7594.75,7591.75,$(15.00),06/17/2026 09:29:32,06/17/2026 09:30:01,29sec',
  'MNQU6,-2,0,0.25,509681603502,509681603527,1,30448.50,30523.50,$150.00,06/17/2026 09:41:04,06/17/2026 09:43:57,2min 52sec',
].join('\n');

const ordersCsv = [
  'orderId,Account,Order ID,B/S,Contract,Product,Product Description,avgPrice,filledQty,Fill Time,lastCommandId,Status,_priceFormat,_priceFormatType,_tickSize,spreadDefinitionId,Version ID,Timestamp,Date,Quantity,Text,Type,Limit Price,Stop Price,decimalLimit,decimalStop,Filled Qty,Avg Fill Price,decimalFillAvg,Venue,Notional Value,Currency',
  '509681603415,acct,509681603415, Buy,MESU6,MES,Micro E-mini S&P 500,7594.75,1,06/17/2026 09:29:32,509681603415, Filled,-2,0,0.25,,509681603415,06/17/2026 09:29:32,6/17/26,1,Chart, Market,,,,,1,7594.75,7594.75,,37973.75,USD',
  '509681603421,acct,509681603421, Sell,MESU6,MES,Micro E-mini S&P 500,7591.75,1,06/17/2026 09:30:01,509681603424, Filled,-2,0,0.25,,509681603424,06/17/2026 09:29:37,6/17/26,1,Chart, Stop,,7591.75,,7591.75,1,7591.75,7591.75,,37958.75,USD',
  '509681603428,acct,509681603428, Sell,MESU6,MES,Micro E-mini S&P 500,,,,509681603428, Canceled,-2,0,0.25,,509681603428,06/17/2026 09:29:42,6/17/26,1,Chart, Limit,7607.75,,7607.75,,,,,,,USD',
  '509681603499,acct,509681603499, Buy,MNQU6,MNQ,Micro E-mini NASDAQ-100,30448.5,1,06/17/2026 09:41:04,509681603499, Filled,-2,0,0.25,,509681603499,06/17/2026 09:41:04,6/17/26,1,Chart, Market,,,,,1,30448.50,30448.5,,30448.50,USD',
  '509681603505,acct,509681603505, Sell,MNQU6,MNQ,Micro E-mini NASDAQ-100,,,,509681603505, Canceled,-2,0,0.25,,509681603505,06/17/2026 09:41:54,6/17/26,1,Chart, Stop,,30449.00,,30449.00,,,,,,,USD',
  '509681603508,acct,509681603508, Sell,MNQU6,MNQ,Micro E-mini NASDAQ-100,30523.5,1,06/17/2026 09:43:57,509681603508, Filled,-2,0,0.25,,509681603508,06/17/2026 09:43:33,6/17/26,1,Chart, Limit,30523.50,,30523.50,,1,30523.50,30523.50,,30523.50,USD',
].join('\n');

const fillsCsv = [
  '_id,_orderId,_contractId,_timestamp,_tradeDate,_action,_qty,_price,_active,_accountId,Fill ID,Order ID,Timestamp,Date,Account,B/S,Quantity,Price,_priceFormat,_priceFormatType,_tickSize,Contract,Product,Product Description,commission',
  '509681603418,509681603415,1,2026-06-17 13:29:32.166Z,2026-06-17,0,1,7594.75,true,1,509681603418,509681603415,06/17/2026 09:29:32,6/17/26,acct, Buy,1,7594.75,-2,0,0.25,MESU6,MES,Micro E-mini S&P 500,0.5',
  '509681603431,509681603421,1,2026-06-17 13:30:01.742Z,2026-06-17,1,1,7591.75,true,1,509681603431,509681603421,06/17/2026 09:30:01,6/17/26,acct, Sell,1,7591.75,-2,0,0.25,MESU6,MES,Micro E-mini S&P 500,0.5',
  '509681603502,509681603499,1,2026-06-17 13:41:04.905Z,2026-06-17,0,1,30448.5,true,1,509681603502,509681603499,06/17/2026 09:41:04,6/17/26,acct, Buy,1,30448.50,-2,0,0.25,MNQU6,MNQ,Micro E-mini NASDAQ-100,0.5',
  '509681603527,509681603508,1,2026-06-17 13:43:57.000Z,2026-06-17,1,1,30523.5,true,1,509681603527,509681603508,06/17/2026 09:43:57,6/17/26,acct, Sell,1,30523.50,-2,0,0.25,MNQU6,MNQ,Micro E-mini NASDAQ-100,0.5',
].join('\n');

const cashHistoryCsv = [
  'Account,Transaction ID,Timestamp,Date,Delta,Amount,Cash Change Type,Currency,Contract',
  'acct,cash-1,06/17/2026 09:29:32,2026-06-17,-0.50,"25,000.00", Commission,USD,MESU6',
  'acct,cash-2,06/17/2026 09:30:01,2026-06-17,-0.50,"24,984.50", Commission,USD,MESU6',
  'acct,cash-3,06/17/2026 09:30:01,2026-06-17,-15.00,"24,969.50", Trade Paired,USD,MESU6',
  'acct,cash-4,06/17/2026 09:41:04,2026-06-17,-0.50,"24,969.00", Commission,USD,MNQU6',
  'acct,cash-5,06/17/2026 09:43:57,2026-06-17,-0.50,"25,118.50", Commission,USD,MNQU6',
  'acct,cash-6,06/17/2026 09:43:57,2026-06-17,150.00,"25,268.50", Trade Paired,USD,MNQU6',
].join('\n');

assert.equal(parseTradovateCashHistoryCsv(cashHistoryCsv).length, 6, 'Cash History parser reads rows');
const enhancedResults = buildTradovateLiveRecordArchives(performanceWithEnhancements, {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
  ordersText: ordersCsv,
  fillsText: fillsCsv,
  cashHistoryText: cashHistoryCsv,
});

const enhancedEs = enhancedResults.find((item) => item.payload.instrument === 'ES').payload.liveRecords[0];
assert.equal(enhancedEs.execution.stopLoss.price, 7591.75, 'losing ES trade uses filled stop order');
assert.equal(enhancedEs.execution.stopLoss.complete, true, 'filled stop is complete');
assert.equal(enhancedEs.execution.targets[0].price, 7607.75, 'losing ES trade keeps cancelled target order');
assert.equal(enhancedEs.execution.targets[0].complete, false, 'cancelled target is not complete');
assert.equal(enhancedEs.execution.orders.length, 3, 'ES enhanced record includes entry/stop/target orders');
assert.equal(enhancedEs.execution.fills[0].commission, 0.5, 'fills include commission');
const normalizedEnhancedEs = normalizeLiveRecord(enhancedEs, { now: 1781529365000 });
assert.equal(normalizedEnhancedEs.execution.orders[1].type, 'stop', 'normalized enhanced orders preserve order type');
assert.equal(normalizedEnhancedEs.execution.orders[1].status, 'filled', 'normalized enhanced orders preserve order status');
assert.equal(normalizedEnhancedEs.execution.orders[1].stopPrice, 7591.75, 'normalized enhanced orders preserve stop price');
assert.equal(normalizedEnhancedEs.execution.fills[0].orderId, '509681603415', 'normalized enhanced fills preserve order id');
assert.equal(normalizedEnhancedEs.execution.fills[0].commission, 0.5, 'normalized enhanced fills preserve commission');
const enhancedEsReport = enhancedResults.find((item) => item.payload.instrument === 'ES').reconciliation.cash;
assert.equal(enhancedEsReport.provided, true, 'cash reconciliation is enabled when provided');
assert.equal(enhancedEsReport.ok, true, 'ES cash reconciliation matches after instrument filtering');
assert.equal(enhancedEsReport.commissionTotal, -1, 'cash reconciliation filters cash commission rows to archive instrument');
assert.equal(enhancedEsReport.fillsCommissionTotal, 1, 'cash reconciliation filters fill commission rows to archive instrument');
assert.equal(enhancedEsReport.performancePnlTotal, -15, 'cash reconciliation filters performance P/L to archive instrument');
assert.equal(enhancedEsReport.tradePairedTotal, -15, 'cash reconciliation filters Trade Paired rows to archive instrument');
assert.equal(enhancedEsReport.tradePairedDifference, 0, 'cash reconciliation reports no P/L difference when filtered');

const enhancedNq = enhancedResults.find((item) => item.payload.instrument === 'NQ').payload.liveRecords[0];
assert.equal(enhancedNq.execution.stopLoss.price, 30449, 'winning NQ trade keeps cancelled stop order');
assert.equal(enhancedNq.execution.stopLoss.complete, false, 'cancelled stop is not complete');
assert.equal(enhancedNq.execution.targets[0].price, 30523.5, 'winning NQ trade uses filled limit target');
assert.equal(enhancedNq.execution.targets[0].complete, true, 'filled target is complete');

console.log('tradovate performance importer smoke passed');
