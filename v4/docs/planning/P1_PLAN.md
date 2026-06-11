# V4 P1 Level Improvement Plan

Target: Extract duplicated code, add comments for complex modules, establish basic test infrastructure.

Priority: Important (affects code quality)

---

## Issue 1: Chart Time Mapping Duplication

### Current State
**11 files** implement similar `getBarChartTime` logic:
- `pda/manual-pda-actions.js`
- `pda/manual-annotation.js`
- `time-overlays/time-coordinate.js`
- `segment/manual-segment.js`
- `order/order-setup-projection.js`
- And 6 more...

**Duplicated patterns**:
```javascript
// Pattern A: inline
return timeframe === 1440 ? bar.tradingDay : bar.timestamp;

// Pattern B: with context
function getBarChartTime(context, bar) {
  return Number(context?.timeframe) === 1440 ? bar.tradingDay : bar.timestamp;
}

// Pattern C: parameter order variation
function getBarChartTime(bar, timeframe) {
  return Number(timeframe) === 1440 ? bar?.tradingDay : bar?.timestamp;
}
```

### Solution

Create unified projection utilities:

```
v4/src/chart/
  └── projection-utils.js  (new, 150-200 lines)
      - getBarChartTime(bar, timeframe)
      - findDisplayBarByTime(bars, time, timeframe)
      - mapTimestampToChartTime(timestamp, timeframe, bars)
      - getBarIndex(bars, time, timeframe)
      - getBucketStart(timestamp, timeframe)
```

### Steps

**Step 1: Create projection-utils.js**
```javascript
// v4/src/chart/projection-utils.js
import { getBucketStart } from '../pda/pda-context.js';

export function getBarChartTime(bar, timeframe) {
  if (!bar) return null;
  return Number(timeframe) === 1440 ? bar.tradingDay : bar.timestamp;
}

export function mapTimestampToChartTime(timestamp, timeframe, bars = []) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return null;

  const bucketStart = getBucketStart(parsed, timeframe);

  if (timeframe === 1440) {
    const exactBar = bars.find(b => Number(b.timestamp) === parsed);
  if (exactBar?.tradingDay) return exactBar.tradingDay;

    const date = new Date((bucketStart + 86400) * 1000);
    return date.toISOString().slice(0, 10);
  }

  return bucketStart;
}

export function findDisplayBarByTime(bars, time, timeframe) {
  if (!Array.isArray(bars) || time == null) return null;

  const normalizeTime = (t) => {
    if (typeof t === 'object' && t.year && t.month && t.day) {
      return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
    }
    return String(t);
  };

  const target = normalizeTime(time);
  return bars.find(bar => normalizeTime(getBarChartTime(bar, timeframe)) === target) || null;
}

export function getDisplayBarIndex(bars, time, timeframe) {
  const bar = findDisplayBarByTime(bars, time, timeframe);
  return bar ? bars.indexOf(bar) : -1;
}
```

**Step 2: Migrate order-setup-projection.js**
- Replace `mapTimestampToOrderSetupChartTime` with `mapTimestampToChartTime`
- Keep order-specific constants (LINE_LENGTH_BARS, ZONE_WIDTH_BARS)
- Update renderer and hit-test imports

**Step 3: Migrate PDA modules**
- Update `manual-pda-actions.js`
- Update `manual-annotation.js`
- Update `pda-swing-validator.js`

**Step 4: Migrate other modules**
- Update `time-overlays/time-coordinate.js`
- Update `segment/manual-segment.js`
- Update remaining 6 files

**Step 5: Create unit tests**
```javascript
// v4/tests/projection-utils.test.js
import { getBarChartTime, mapTimestampToChartTime } from '../src/chart/projection-utils.js';

// Test daily timeframe
const dailyBar = { timestamp: 1641139200, tradingDay: '2022-01-03' };
console.assert(getBarChartTime(dailyBar, 1440) === '2022-01-03');

// Test intraday timeframe
const intradayBar = { timestamp: 1641139200 };
console.assert(getBarChartTime(intradayBar, 60) === 1641139200);

console.log('All projection utils tests passed');
```

### Estimated Effort
- Step 1: 2-3 hours
- Step 2-4: 4-6 hours (11 files migration)
- Step 5: 1-2 hours
- **Total**: 7-11 hours

### Risk Control
- Low risk: pure utility functions
- Backward compatible: existing logic preserved
- Testable: no external dependencies

---

## Issue 2: Result Derivation Logic Duplication

### Current State

Result calculation scattered across:
- `order/setup-set.js` (183-249): deriveResultExit, deriveResultPoints, deriveResultR
- `order/order-review-store.js` (removed in P0, but pattern exists)
- Inspector panels manually recalculate

### Solution

Create dedicated result derivation module:

```
v4/src/order/
  └── result-derivation.js  (new, 100-150 lines)
      - deriveExitPrice(result, entry, stop, targets)
      - derivePoints(exitPrice, entryPrice, direction)
      - deriveR(points, risk)
      - deriveRisk(entryPrice, stopPrice)
      - deriveHoldingDuration(exitTime, entryTime)
      - deriveResultSummary(order, elements)
```

### Steps

**Step 1: Extract from setup-set.js**
```javascript
// v4/src/order/result-derivation.js

export function deriveExitPrice(status, entryElement, stopLossElement, targetElements) {
  if (status === 'target1' || status === 'target2' || status === 'target3') {
    const target = targetElements.find(t => t.role === status);
    return target?.price ?? null;
  }
  if (status === 'stop-loss') return stopLossElement?.price ?? null;
  if (status === 'breakeven') return entryElement?.price ?? null;
  return null;
}

export function derivePoints(exitPrice, entryPrice, direction) {
  const exit = Number(exitPrice);
  const entry = Number(entryPrice);
  if (!Number.isFinite(exit) || !Number.isFinite(entry)) return null;

  if (direction === 'long') return exit - entry;
  if (direction === 'short') return entry - exit;
  return null;
}

export function deriveRisk(entryPrice, stopPrice) {
  const entry = Number(entryPrice);
  const stop = Number(stopPrice);
  if (!Number.isFinite(entry) || !Number.isFinite(stop)) return null;
  return Math.abs(entry - stop);
}

export function deriveR(points, risk) {
  const p = Number(points);
  const r = Number(risk);
  if (!Number.isFinite(p) || !Number.isFinite(r) || r === 0) return null;
  return p / r;
}

export function deriveHoldingDuration(exitTimestamp, entryTimestamp) {
  const exit = Number(exitTimestamp);
  const entry = Number(entryTimestamp);
  if (!Number.isFinite(exit) || !Number.isFinite(entry) || exit < entry) return null;

  const seconds = exit - entry;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function deriveResultSummary(resultStatus, entryElement, stopLossElement, targetElements, exitTimestamp) {
  const exitPrice = deriveExitPrice(resultStatus, entryElement, stopLossElement, targetElements);
  const points = derivePoints(exitPrice, entryElement?.price, entryElement?.direction);
  const risk = deriveRisk(entryElement?.price, stopLossElement?.price);
  const r = deriveR(points, risk);
  const duration = deriveHoldingDuration(exitTimestamp, entryElement?.timestamp);

  return {
    status: resultStatus,
    exitPrice,
    points,
    risk,
    r,
    holdingDuration: duration,
  };
}
```

**Step 2: Update setup-set.js**
```javascript
import { deriveResultSummary } from './result-derivation.js';

function createResultElement(order, orderElements) {
  const result = order.resultReview || {};
  const summary = deriveResultSummary(
    result.result,
    orderElements.entry,
    orderElements.stopLoss,
    orderElements.targets,
    result.exitTimestamp
  );

  return {
    type: SETUP_ELEMENT_TYPES.RESULT,
    timestamp: result.exitTimestamp,
    ...summary,
    complete: summary.exitPrice !== null || result.result !== 'unknown',
  };
}
```

**Step 3: Update Inspector panels**
```javascript
// order-review-panel.js
import { deriveResultSummary } from '../../order/result-derivation.js';

// Use shared calculation instead of inline
const summary = deriveResultSummary(...);
```

**Step 4: Add unit tests**
```javascript
// v4/tests/result-derivation.test.js
import { derivePoints, deriveR, deriveRisk } from '../src/order/result-derivation.js';

// Test long position
console.assert(derivePoints(100, 95, 'long') === 5);
console.assert(derivePoints(95, 100, 'long') === -5);

// Test short position
console.assert(derivePoints(95, 100, 'short') === 5);
console.assert(derivePoints(100, 95, 'short') === -5);

// Test R calculation
console.assert(deriveRisk(100, 95) === 5);
console.assert(deriveR(10, 5) === 2);

console.log('All result derivation tests passed');
```

### Estimated Effort
- Step 1: 2-3 hours
- Step 2-3: 2-3 hours
- Step 4: 1-2 hours
- **Total**: 5-8 hours

---

## Issue 3: Complex Logic Documentation

### Current State

Complex modules lack inline comments:
- `pda-context.js` (308 lines): session windows, bucket calculation, D/4H context
- `setup-set.js` (386 lines): order review to setup set adapter
- `segment-review-metrics.js` (674 lines): fluency scoring, PDA reaction metrics

### Solution

Add structured comments for:
1. **Module purpose** (at top)
2. **Non-obvious algorithms** (bucket alignment, session detection)
3. **Business rules** (why 18:00 ET anchor, why skip CME break)
4. **Gotchas** (timezone handling, look-ahead bias)

### Steps

**Step 1: Document pda-context.js**
```javascript
// Realtime context tags for manually selected PDA points.
//
// Context Computation Strategy:
// - Daily (D) context: Uses CME trading day boundary (18:00 ET)
// - Session context: Maps timestamp to Asia/London/NY sessions
// - Premium/Discount: Compares price to session high/low
//
// Design Principles:
// - All timestamps are UTC epoch seconds with ET wall-clock semantics
// - 18:00 ET anchor ensures daily buckets align with CME session boundaries
// - Session extrema computed from full trading day 1M data
//
// Gotchas:
// - Do not use this for backtesting order placement (look-ahead bias risk)
// - BSL/SSL default extend uses current chart timeframe, not source timeframe

export const CONTEXT_TIMEFRAMES = [1440];

// Session windows defined in ET minutes from midnight.
// 18:00-01:59 = Asia Session (crosses midnight)
// 09:30-09:59 = NY Open (primary focus window)
export const SESSION_WINDOWS = [
  { id: 'asia', label: 'Asia Session', start: 18 * 60, end: 1 * 60 + 59, crossesMidnight: true },
  // ... rest
];

// getBucketStart: Align timestamp to timeframe bucket boundary
// For 4H: uses 02:00/06:00/.../22:00 alignment to match backend bars
// For D: uses 18:00 ET trading day boundary
export function getBucketStart(timestamp, timeframe) {
  // Implementation with inline comments for non-obvious math
}
```

**Step 2: Document setup-set.js**
```javascript
// Setup Set tree adapter over the existing OrderReview store.
//
// Architecture:
// - Storage: orderReviews (localStorage schema, flat structure)
// - Presentation: Setup Set (runtime tree, rich derivation)
//
// Adapter Responsibilities:
// - Map orderReview fields to setup elements (reversal, entry, stop, targets)
// - Derive result summary (points, R, holding duration)
// - Compute risk/reward box coordinates
// - Normalize time ranges and visibility flags
//
// Design Decision (Phase 8G):
// - Keep orderReviews as storage to avoid migration
// - Derive all display fields here, not in store
// - Single source of truth for result calculation

export function createSetupSetFromOrderReview(order) {
  // Build element tree from flat order structure
  const reversal = createReversalElement(order);  // Primary event anchor
  const entry = createEntryElement(order);        // Entry time + price
  const stop = createStopLossElement(order);      // Risk boundary
  const targets = createTargetElements(order);    // target1/2/3 + final target
  const result = createResultElement(order, { entry, stop, targets });  // Derived outcome

  // ... rest
}

// deriveResultExit: Map result status to actual exit price
// target1/2/3 -> lookup target price
// stop-loss -> use stop price
// breakeven -> use entry price
function deriveResultExit(status, entryElement, stopLossElement, targetElements) {
  // Implementation
}
```

**Step 3: Document segment-review-metrics.js**
```javascript
// Segment review metrics foundation (read-only).
//
// Metrics Categories:
// 1. Segment Identity: direction, start/end time, price range
// 2. Previous Segment Comparison: displacement, holding time
// 3. Terminal Reaction: reversal bar OHLC facts
// 4. PDA Reaction: range wick depth, liquidity sweep/approach
// 5. Fluency Components: alignment, structure quality (NOT final score)
//
// Design Principles (Phase 7):
// - Only display component metrics, do not synthesize final fluency score
// - PDA reaction metrics depend on selected segment-pda links
// - All metrics are derived from immutable segment/PDA data
//
// Verification: Test with 5-10 real samples before adding controlled review selection

export function buildSegmentReviewMetrics(segment, pdaResponses, allSegments) {
  // Collect identity + previous segment comparison
  const identity = buildSegmentIdentity(segment);
  const comparison = buildPreviousSegmentComparison(segment, allSegments);

  // Terminal bar facts
  const terminal = buildTerminalBarFacts(segment);

  // PDA-specific reaction metrics
  const pdaReactions = pdaResponses.map(response =>
    buildPdaReactionMetrics(response.pda, response.reactionType, segment)
  );

  // Fluency component indicators (not final score)
  const fluency = buildFluencyComponents(segment, pdaReactions);

  return { identity, comparison, terminal, pdaReactions, fluency };
}
```

**Step 4: Add architecture overview**
```markdown
// v4/docs/ARCHITECTURE.md

# V4 Architecture Overview
## Module Layers

### Data Layer
- `data/bar-store.js`: 1M OHLCV bars with padding
- `pda/pda-store.js`: Manual PDA annotations
- `segment/segment-store.js`: 1H market segments
- `order/order-review-store.js`: Order setup records

### Presentation Layer
- `order/setup-set.js`: Derive display tree from order storage
- `segment/segment-review-metrics.js`: Derive review metrics

### UI Layer
- `ui/inspector-sidebar.js`: Multi-panel inspector
- `ui/toolbar.js`: Date range, timeframe, controls
- `chart/chart-manager.js`: LightweightCharts integration

### Persistence Layer
- `persistence/`: localStorage adapters (after P0 refactor)

## Data Flow

User Action → Event Bus → Store Update → Bus Emit → Renderer Update → Chart

Example: Create PDA
1. User right-clicks chart
2. `manual-annotation.js` handles context menu
3. `pda-store.js` adds annotation
4. Emits `pda:changed`
5. `pda-renderer.js` redraws primitives
6. `pda-persistence.js` saves to localStorage

## Extension Points

- Add new PDA type: Update `v4_config.yaml` + `pda-types.js`
- Add new review metric: Extend `segment-review-metrics.js`
- Add new time overlay: Create primitive in `time-overlays/`
```

### Estimated Effort
- Step 1: 2-3 hours (pda-context.js comments)
- Step 2: 2-3 hours (setup-set.js comments)
- Step 3: 3-4 hours (segment-review-metrics.js comments)
- Step 4: 2-3 hours (ARCHITECTURE.md)
- **Total**: 9-13 hours

---

## Issue 4: Minimal Test Infrastructure

### Current State
- 26,828 lines of frontend code
- **Zero** automated tests
- Only manual smoke testing

### Solution

Establish Node.js-based test infrastructure:

```
v4/tests/
  ├── test-runner.js        (simple test harness)
  ├── projection-utils.test.js
  ├── result-derivation.test.js
  ├── setup-set.test.js
  └── smoke-test.js         (integration smoke)
```

### Steps

**Step 1: Create test runner**
```javascript
// v4/tests/test-runner.js
import { readdirSync } from 'fs';
import { pathToFileURL } from 'url';

const testFiles = readdirSync('./tests').filter(f => f.endsWith('.test.js'));

let passed = 0;
let failed = 0;

for (const file of testFiles) {
  try {
    console.log(`\n Running ${file}...`);
    await import(pathToFileURL(`./tests/${file}`).href);
    passed++;
  } catch (err) {
    console.error(` FAILED: ${err.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

**Step 2: Create assertion helpers**
```javascript
// v4/tests/test-utils.js
export function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

export function assertDeepEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`Deep equal failed: ${message}\n  Expected: ${e}\n  Actual: ${a}`);
  }
}

export function assertNotNull(value, message = '') {
  if (value === null || value === undefined) {
    throw new Error(`Assertion failed: ${message} - value is null/undefined`);
  }
}
```

**Step 3: Write setup-set tests**
```javascript
// v4/tests/setup-set.test.js
import { createSetupSetFromOrderReview } from '../src/order/setup-set.js';
import { assertEqual, assertNotNull } from './test-utils.js';

// Test: Basic setup set creation
const orderReview = {
  id: 'test-1',
  setupThesis: {
    primaryEventTimestamp: 1641139200,
    primaryEventTimeframe: '1H',
    primaryEventType: 'sweep-liquidity',
  },
  entryPlan: {
    direction: 'long',
    entryTimestamp: 1641142800,
    entryPrice: 15000,
  },
};

const setupSet = createSetupSetFromOrderReview(orderReview);

assertNotNull(setupSet, 'Setup set should be created');
assertEqual(setupSet.reversal.timestamp, 1641139200, 'Reversal timestamp');
assertEqual(setupSet.entry.direction, 'long', 'Entry direction');
assertEqual(setupSet.entry.price, 15000, 'Entry price');

console.log(' setup-set.test.js passed');
```

**Step 4: Write integration smoke test**
```javascript
// v4/tests/smoke-test.js
// Requires headless browser or jsdom for DOM APIs

import { addOrderReview, getOrderReviews } from '../src/order/order-review-store.js';
import { assertEqual } from './test-utils.js';

// Mock localStorage
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = String(value); },
  removeItem(key) { delete this.data[key]; },
};

// Test: Create order setup
const order = addOrderReview({
  setupThesis: {
    primaryEventTimestamp: 1641139200,
  },
  entryPlan: {
    direction: 'long',
  },
});

assertEqual(getOrderReviews().length, 1, 'Should have 1 order');

console.log(' smoke-test.js passed');
```

**Step 5: Add npm scripts**
```json
// package.json
{
  "name": "v4-backtesting",
  "version": "4.0.0",
  "type": "module",
  "scripts": {
    "test": "node tests/test-runner.js",
    "test:watch": "nodemon --watch src --watch tests --exec 'npm test'"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### Estimated Effort
- Step 1-2: 2-3 hours (runner + helpers)
- Step 3: 2-3 hours (setup-set tests)
- Step 4: 2-3 hours (smoke test)
- Step 5: 1 hour (npm setup)
- **Total**: 7-10 hours

---

## Execution Plan

### Phase Order (Recommended)

**Phase 1: Extract Helpers (Issue 1-2)** - 12-19 hours
- Most immediate value
- Reduces duplication
- Low risk

**Phase 2: Documentation (Issue 3)** - 9-13 hours
- Can be done in parallel
- Improves maintainability
- No code changes

**Phase 3: Test Infrastructure (Issue 4)** - 7-10 hours
- Enables confident refactoring
- Validates Issue 1-2 changes
- Foundation for future tests

### Total Effort
- **Minimum**: 28 hours (12 + 9 + 7)
- **Maximum**: 42 hours (19 + 13 + 10)
- **Recommended**: 35 hours (4-5 days)

### Success Criteria
1. Chart time mapping logic in one place
2. Result derivation logic extracted
3. Complex modules have inline comments
4. ARCHITECTURE.md documents data flow
5. Basic test coverage for helpers
6. npm test runs successfully

---

## Integration with P0

These P1 improvements **depend on P0 completion**:
- Issue 1 uses refactored `order-setup-projection.js`
- Issue 2 uses cleaned `setup-set.js`
- Issue 4 tests refactored modules

**Recommended sequence**:
1. Complete P0 Phase 2 (split order-review-actions)
2. Start P1 Phase 1 (extract helpers)
3. Complete P0 Phase 3-4 (adapters + persistence)
4. Start P1 Phase 2-3 (docs + tests)

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|---------|
| Breaking existing logic | Medium | Unit tests before migration |
| Incorrect result calculation | Medium | Validate against known cases |
| Documentation drift | Low | Link comments to actual code |
| Test maintenance burden | Low | Start small, expand gradually |

---

## Next Steps After P1

**P2 - Service Layer**: Create service layer between UI and stores
**P3 - Full Test Coverage**: Expand to integration and E2E tests
**P4 - Performance**: Optimize rendering and hit-test algorithms
