import assert from 'node:assert/strict';

import { VIEWPORT_TARGETS, createViewportRouter } from '../src/chart/viewport-router.js';
import {
  PICK_CONTEXT_TARGETS,
  createPickContextRouter,
} from '../src/chart/pick-context-router.js';
import { formatPdaSourceBadge } from '../src/pda/pda-source-format.js';
import { locatePdaProjection } from '../src/pda/pda-locate-actions.js';
import { normalizeDailyTimeReview } from '../src/time-reaction/daily-time-review-store.js';

const dailyReview = normalizeDailyTimeReview({
  id: 'legacy-secondary-daily-time',
  date: '2026-06-03',
  fixedTimeState: {
    locate: {
      timestamp: 1780482600,
      timeframe: '60',
      chart: 'secondary',
    },
    items: [
      {
        id: 'legacy-secondary-fixed-item',
        time: '09:30',
        locate: {
          timestamp: 1780482600,
          timeframe: '60',
          chart: 'secondary',
        },
      },
    ],
  },
}, { preserveId: true });

assert.equal(
  dailyReview.fixedTimeState.locate.chart,
  VIEWPORT_TARGETS.COMPARISON,
  'legacy Daily Time Review section secondary locate migrates to comparison'
);
assert.equal(
  dailyReview.fixedTimeState.items[0].locate.chart,
  VIEWPORT_TARGETS.COMPARISON,
  'legacy Daily Time Review item secondary locate migrates to comparison'
);

assert.equal(
  formatPdaSourceBadge({
    sourceChartId: 'secondary',
    sourceChartLabel: 'Secondary',
    sourceInstrument: 'ES',
    sourceTimeframe: 60,
  }),
  'Sub ES 1H',
  'legacy secondary PDA source metadata remains displayable'
);

const locateResult = locatePdaProjection({
  sourceChartId: 'secondary',
  sourceInstrument: 'ES',
  sourceTimeframe: 60,
  type: 'bsl',
  timestamp: 1780482600,
  canonicalTimestamp: 1780482600,
  price: 7550,
});
assert.equal(locateResult.secondary.located, false, 'legacy PDA locate keeps skipped secondary result shape');

const viewportCalls = [];
const viewportRouter = createViewportRouter({
  [VIEWPORT_TARGETS.PRIMARY]: () => {
    viewportCalls.push(VIEWPORT_TARGETS.PRIMARY);
    return true;
  },
  [VIEWPORT_TARGETS.COMPARISON]: () => {
    viewportCalls.push(VIEWPORT_TARGETS.COMPARISON);
    return true;
  },
});
const secondaryRouteResult = viewportRouter.locateChartRange(
  VIEWPORT_TARGETS.SECONDARY,
  { start: 1, end: 2 }
);
assert.deepEqual(
  secondaryRouteResult.targets.secondary,
  { located: false, reason: 'unsupported-target' },
  'legacy secondary viewport target is unsupported without loading old runtime'
);
assert.deepEqual(viewportCalls, [], 'legacy secondary viewport target does not call primary/comparison handlers');

const pickRouter = createPickContextRouter({
  [PICK_CONTEXT_TARGETS.PRIMARY]: {
    label: 'primary',
    isEnabled: () => true,
  },
  [PICK_CONTEXT_TARGETS.COMPARISON]: {
    label: 'comparison',
    isEnabled: () => true,
  },
});
assert.equal(
  pickRouter.getPickContext({ currentTarget: { id: 'secondary-chart' } }).chartId,
  PICK_CONTEXT_TARGETS.PRIMARY,
  'legacy secondary chart DOM id falls back to primary pick context'
);

console.log('legacy secondary compatibility smoke ok');
