import assert from 'node:assert/strict';

import { normalizeDailyTimeReview } from '../src/time-reaction/daily-time-review-store.js';
import {
  renderDailyTimeReviewPanel,
  renderDailyTimeReviewSectionPanel,
} from '../src/ui/inspector/time-reaction-panel.js';

const review = normalizeDailyTimeReview({
  date: '2024-01-10',
  bias: {
    dailyBiasPrediction: 'Daily expects continuation.',
    dailyBiasReview: 'Daily bias was correct.',
    weeklyBiasPrediction: 'Weekly bullish.',
    weeklyBiasReview: 'Weekly bias validated on Friday.',
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
assert.match(html, /日 Bias 预判/, 'Daily bias prediction title is visible');
assert.match(html, /日 Bias 验证/, 'Daily bias review title is visible');
assert.match(html, /周 Bias 预判（周一填写）/, 'Weekly bias prediction title is visible');
assert.match(html, /周 Bias 验证（周一可改）/, 'Weekly bias review title is visible');
assert.match(html, /data-daily-time-field="dailyBiasPrediction"/, 'Daily bias prediction field is present');
assert.match(html, /data-daily-time-field="dailyBiasReview"/, 'Daily bias review field is present');
assert.match(html, /data-daily-time-field="weeklyBiasPrediction"/, 'Weekly bias prediction field is present');
assert.match(html, /data-daily-time-field="weeklyBiasReview"/, 'Weekly bias review field is present');
assert.match(html, /预判（09:30 前）/, 'Opening thesis prediction title is visible');
assert.match(html, /验证（09:30-11:00）/, 'Morning summary title is visible');
assert.match(html, /验证（全天）/, 'Full day summary title is visible');
assert.match(html, /结论（Opening Thesis Review）/, 'Opening thesis validation title is visible');
assert.match(html, /daily-time-fixed-item-note/, 'Fixed Time State editing remains available');
assert.equal(
  html.match(/<section class="inspector-section time-reaction-panel"/g).length,
  1,
  'main Daily Time panel does not nest section panels inside cards'
);

const biasHtml = renderDailyTimeReviewSectionPanel(review, 'bias');
assert.match(biasHtml, /日 Bias 预判/, 'Bias section shows Bias fields');
assert.doesNotMatch(biasHtml, /Opening Thesis Review/, 'Bias section does not show Opening Thesis');
assert.doesNotMatch(biasHtml, /固定时点状态/, 'Bias section does not show Fixed Time State');

const openingHtml = renderDailyTimeReviewSectionPanel(review, 'openingThesisReview');
assert.match(openingHtml, /预判（09:30 前）/, 'Opening section shows Opening Thesis fields');
assert.doesNotMatch(openingHtml, /日 Bias 预判/, 'Opening section does not show Bias fields');
assert.doesNotMatch(openingHtml, /固定时点状态/, 'Opening section does not show Fixed Time State');

const fixedTimeHtml = renderDailyTimeReviewSectionPanel(review, 'fixedTimeState');
assert.match(fixedTimeHtml, /固定时点状态/, 'Fixed Time section shows Fixed Time State');
assert.match(fixedTimeHtml, /daily-time-fixed-item-note/, 'Fixed Time section keeps fixed time editing');
assert.doesNotMatch(fixedTimeHtml, /日 Bias 预判/, 'Fixed Time section does not show Bias fields');
assert.doesNotMatch(fixedTimeHtml, /Opening Thesis Review/, 'Fixed Time section does not show Opening Thesis');

const mondayReview = normalizeDailyTimeReview({
  ...review,
  date: '2024-01-08',
}, { preserveUpdatedAt: true });
const mondayBiasHtml = renderDailyTimeReviewSectionPanel(mondayReview, 'bias');
assert.match(
  mondayBiasHtml,
  /data-daily-time-field="weeklyBiasPrediction"(?![^>]*disabled)/,
  'Weekly bias prediction is editable on Monday'
);

const wednesdayBiasHtml = renderDailyTimeReviewSectionPanel(review, 'bias');
assert.match(
  wednesdayBiasHtml,
  /data-daily-time-field="weeklyBiasPrediction"[^>]*disabled/,
  'Weekly bias prediction is disabled outside Monday'
);
assert.match(
  wednesdayBiasHtml,
  /data-daily-time-field="weeklyBiasReview"[^>]*disabled/,
  'Weekly bias review is disabled outside Monday'
);

console.log('time reaction panel smoke ok');
