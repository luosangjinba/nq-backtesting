import assert from 'node:assert/strict';

import {
  formatPdaChartLabel,
  formatPdaDisplayLabel,
  formatPdaSourceBadge,
} from '../src/pda/pda-source-format.js';

const annotation = {
  sourceChartId: 'comparison-window',
  sourceChartLabel: 'Comparison',
  sourceInstrument: 'NQ',
  sourceTimeframe: 1,
};

assert.equal(formatPdaSourceBadge(annotation), 'Pane 2 NQ 1M');
assert.equal(formatPdaDisplayLabel(annotation, 'BSL'), 'BSL · Pane 2 NQ 1M');
assert.equal(formatPdaChartLabel(annotation, 'BSL'), 'BSL · NQ 1M');

console.log('pda-source-format-smoke passed');
