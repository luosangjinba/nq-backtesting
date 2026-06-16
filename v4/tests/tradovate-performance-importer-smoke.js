import assert from 'node:assert/strict';

import {
  buildTradovateLiveRecordArchive,
  buildTradovateLiveRecordArchives,
  mapTradovateSymbolToInstrument,
  parseTradovateMoney,
  tradovateTimestampToEpochSeconds,
} from '../src/live-record/tradovate-performance-importer.js';

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

console.log('tradovate performance importer smoke passed');
