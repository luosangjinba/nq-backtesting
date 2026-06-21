import assert from 'node:assert/strict';

import { formatTradovateImportPreview } from '../src/live-record/tradovate-import-preview.js';
import { classifyTradovateCsvEntry } from '../src/live-record/tradovate-zip-import.js';

assert.equal(
  classifyTradovateCsvEntry({
    name: 'nested/Performance.csv',
    text: 'symbol,buyFillId,sellFillId',
  }),
  'performanceText',
  'Performance CSV is classified from filename'
);
assert.equal(
  classifyTradovateCsvEntry({
    name: 'export.csv',
    text: 'Order ID,B/S,Contract,Product,Status,Timestamp,Type,Limit Price,Stop Price',
  }),
  'ordersText',
  'Orders CSV is classified from header'
);
assert.equal(
  classifyTradovateCsvEntry({
    name: 'Account_Balance_History.csv',
    text: 'Trade Date,Total Amount,Total Realized PNL',
  }),
  'accountBalanceHistoryText',
  'Account Balance CSV is classified before generic balance/history names'
);

const preview = formatTradovateImportPreview([{
  payload: {
    instrument: 'NQ',
    source: { timezone: 'UTC' },
  },
  sourceRows: 1,
  ordersRows: 2,
  fillsRows: 2,
  liveRecords: 1,
  skippedRows: 0,
  wins: 1,
  losses: 0,
  breakeven: 0,
  totalPnl: 20,
  fileAlignment: {
    ok: true,
    performanceRows: 1,
    ordersRows: 2,
    fillsRows: 2,
    positionRows: 0,
    cashRows: 0,
    balanceRows: 0,
    warnings: [],
  },
  reconciliation: {},
}], {
  sourceFileName: 'tradovate.zip',
  zipFileName: 'tradovate.zip',
  zipMatches: ['Performance.csv -> performance'],
});

assert.match(preview, /ZIP package: tradovate\.zip/);
assert.match(preview, /File alignment: ok/);
assert.match(preview, /Live Records: 1/);

console.log('tradovate import UI modules smoke passed');
