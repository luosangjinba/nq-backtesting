import assert from 'node:assert/strict';
import {
  LEFTWARD_MAX_SOURCE_BAR_LIMIT,
  resolveLeftwardSourceWindowPolicy,
} from '../src/chart-history/leftward-source-window-policy.js';

assert.deepEqual(resolveLeftwardSourceWindowPolicy({
  displayTimeframe: 15,
  sourceTimeframe: 1,
}), {
  displaySourceBars: 15,
  prefetchSourceBars: 0,
  sourceBarLimit: 2500,
  targetDisplayBars: 0,
});

assert.deepEqual(resolveLeftwardSourceWindowPolicy({
  displayTimeframe: 240,
  sourceTimeframe: 1,
}), {
  displaySourceBars: 240,
  prefetchSourceBars: 4800,
  sourceBarLimit: 4800,
  targetDisplayBars: 20,
});

assert.deepEqual(resolveLeftwardSourceWindowPolicy({
  displayTimeframe: 480,
  sourceTimeframe: 1,
}), {
  displaySourceBars: 480,
  prefetchSourceBars: 9600,
  sourceBarLimit: 9600,
  targetDisplayBars: 20,
});

assert.deepEqual(resolveLeftwardSourceWindowPolicy({
  displayTimeframe: 720,
  sourceTimeframe: 1,
}), {
  displaySourceBars: 720,
  prefetchSourceBars: 14400,
  sourceBarLimit: 14400,
  targetDisplayBars: 20,
});

assert.deepEqual(resolveLeftwardSourceWindowPolicy({
  displayTimeframe: '1D',
  sourceTimeframe: 1,
}), {
  displaySourceBars: 1440,
  prefetchSourceBars: 17280,
  sourceBarLimit: 20000,
  targetDisplayBars: 12,
});

assert.deepEqual(resolveLeftwardSourceWindowPolicy({
  displayTimeframe: '1W',
  sourceTimeframe: 1,
}), {
  displaySourceBars: 10080,
  prefetchSourceBars: LEFTWARD_MAX_SOURCE_BAR_LIMIT,
  sourceBarLimit: LEFTWARD_MAX_SOURCE_BAR_LIMIT,
  targetDisplayBars: 4,
});

assert.deepEqual(resolveLeftwardSourceWindowPolicy({
  displayTimeframe: '1M',
  sourceTimeframe: 1,
}), {
  displaySourceBars: LEFTWARD_MAX_SOURCE_BAR_LIMIT,
  prefetchSourceBars: LEFTWARD_MAX_SOURCE_BAR_LIMIT,
  sourceBarLimit: LEFTWARD_MAX_SOURCE_BAR_LIMIT,
  targetDisplayBars: 1,
});

console.log('v6 leftward source window policy step277 smoke passed');
