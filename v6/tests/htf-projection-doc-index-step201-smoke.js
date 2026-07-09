import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile('v6/docs/INDEX.md', 'utf8');
const review = await readFile('v6/docs/V6_HTF_PROJECTION_INTEGRATION_REVIEW_STEP201.md', 'utf8');

[
  'V6_MANUAL_NEXT_HTF_VISIBLE_LATENCY_STEP197.md',
  'V6_AUTO_PLAY_HTF_PROJECTION_AUDIT_STEP199.md',
  'V6_RESET_VIEW_HTF_PROJECTION_AUDIT_STEP200.md',
  'V6_HTF_PROJECTION_INTEGRATION_REVIEW_STEP201.md',
].forEach((fileName) => assert.equal(index.includes(fileName), true));

[
  'runtime.chart-data-projection',
  'Auto-play and reset view intentionally stay outside this list',
  'pane identity consistency',
  'Step 202 Recommendation',
].forEach((text) => assert.equal(review.includes(text), true));

console.log('v6 HTF projection doc index step 201 smoke passed');
