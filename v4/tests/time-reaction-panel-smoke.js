import assert from 'node:assert/strict';

import { normalizeDailyTimeReview } from '../src/time-reaction/daily-time-review-store.js';
import { renderDailyTimeReviewPanel } from '../src/ui/inspector/time-reaction-panel.js';

const review = normalizeDailyTimeReview({
  date: '2024-01-10',
  bias: {
    weeklyBias: 'Weekly bullish.',
    dailyBias: 'Daily expects continuation.',
    biasReview: 'Bias was correct.',
  },
  openingThesisReview: {
    preOpenThesis: '09:30前 discount, liquidity above ONH.',
    morningSummary0930To1100: 'ONH sweep held.',
    fullDaySummary: 'Closed higher.',
    thesisReview: 'Opening thesis worked.',
  },
  fixedTimeState: {
    items: [
      { id: 'fixed_0930', time: '09:30', note: 'Open state.' },
    ],
  },
}, { preserveUpdatedAt: true });

const html = renderDailyTimeReviewPanel(review);

assert.match(html, /Bias/, 'main panel renders Bias block');
assert.match(html, /Opening Thesis Review/, 'main panel renders Opening Thesis Review block');
assert.match(html, /固定时点状态/, 'main panel keeps Fixed Time State block');
assert.match(html, /daily-time-bias-field/, 'Bias fields use new save action');
assert.match(html, /daily-time-opening-thesis-field/, 'Opening Thesis fields use new save action');
assert.match(html, /After-the-fact bias validation/, 'Bias review textarea is present');
assert.match(html, /09:30-11:00 summary/, 'Morning summary textarea is present');
assert.match(html, /Full day summary/, 'Full day summary textarea is present');
assert.match(html, /daily-time-fixed-item-note/, 'Fixed Time State editing remains available');

console.log('time reaction panel smoke ok');
