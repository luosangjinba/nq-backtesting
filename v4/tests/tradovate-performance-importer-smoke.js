import assert from 'node:assert/strict';

import {
  buildTradovateLiveRecordArchive,
  buildTradovateLiveRecordArchives,
  mapTradovateSymbolToInstrument,
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

const enhancedResults = buildTradovateLiveRecordArchives(performanceWithEnhancements, {
  instrument: 'auto',
  timeZone: 'UTC',
  nowMs: 1781529365000,
  ordersText: ordersCsv,
  fillsText: fillsCsv,
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

const enhancedNq = enhancedResults.find((item) => item.payload.instrument === 'NQ').payload.liveRecords[0];
assert.equal(enhancedNq.execution.stopLoss.price, 30449, 'winning NQ trade keeps cancelled stop order');
assert.equal(enhancedNq.execution.stopLoss.complete, false, 'cancelled stop is not complete');
assert.equal(enhancedNq.execution.targets[0].price, 30523.5, 'winning NQ trade uses filled limit target');
assert.equal(enhancedNq.execution.targets[0].complete, true, 'filled target is complete');

console.log('tradovate performance importer smoke passed');
