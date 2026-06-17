import {
  ORDER_DIRECTIONS,
  ORDER_DIRECTION_ALIASES,
  ORDER_EVENT_TYPES,
  ORDER_ENTRY_MODEL_DEFINITIONS,
  ORDER_REF_TYPES,
  ORDER_REASON_CATEGORIES,
  ORDER_REASON_CATEGORY_ALIASES,
  ORDER_RESULTS,
  ORDER_TIMEFRAME_ALIASES,
  ORDER_TIMEFRAMES,
  VALID_ORDER_DIRECTIONS,
  VALID_ORDER_TIMEFRAMES,
  VALID_ORDER_REASON_CATEGORIES,
  VALID_ORDER_REF_TYPES,
  getActiveDefinitions,
} from '../src/order/order-review-types.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(ORDER_DIRECTIONS.LONG === 'long', 'direction enum should expose LONG');
assert(ORDER_DIRECTIONS.SHORT === 'short', 'direction enum should expose SHORT');
assert(ORDER_EVENT_TYPES.SWEEP_LIQUIDITY === 'sweep-liquidity', 'event enum should derive key from value');
assert(ORDER_REF_TYPES.ORDER_SETUP === 'order-setup', 'ref enum should derive compound key');
assert(ORDER_REASON_CATEGORIES.MACROS === 'macros', 'reason category enum should expose macros');
assert(ORDER_REASON_CATEGORIES.MICROS === 'micros', 'reason category enum should expose micros');
assert(ORDER_REASON_CATEGORIES.OTHER === 'other', 'reason category enum should expose other');
assert(ORDER_RESULTS.STOP_LOSS === 'stop-loss', 'result enum should derive STOP_LOSS');
assert(ORDER_RESULTS.TARGETINTERNAL2 === 'targetInternal2', 'result enum should include Target Internal 2');
assert(ORDER_RESULTS.FINALTARGET === 'finalTarget', 'result enum should include Target External 3');
assert(ORDER_TIMEFRAMES['2M'] === '2M', 'timeframe enum should include 2M');
assert(ORDER_TIMEFRAMES['3M'] === '3M', 'timeframe enum should include 3M');
assert(ORDER_TIMEFRAMES['4M'] === '4M', 'timeframe enum should include 4M');
assert(ORDER_TIMEFRAMES['10M'] === '10M', 'timeframe enum should include 10M');
assert(VALID_ORDER_DIRECTIONS.has('long'), 'valid direction set should include long');
assert(!VALID_ORDER_DIRECTIONS.has('buy'), 'valid direction set should not include aliases');
assert(ORDER_DIRECTION_ALIASES.get('buy') === 'long', 'direction alias map should resolve buy');
assert(VALID_ORDER_TIMEFRAMES.has('10M'), 'valid timeframe set should include 10M');
assert(ORDER_TIMEFRAME_ALIASES.get('2m') === '2M', 'timeframe alias map should resolve 2m');
assert(ORDER_TIMEFRAME_ALIASES.get('10m') === '10M', 'timeframe alias map should resolve 10m');
assert(VALID_ORDER_REASON_CATEGORIES.has('macros'), 'valid reason category set should include macros');
assert(ORDER_REASON_CATEGORY_ALIASES.get('macro') === 'macros', 'reason category alias map should resolve macro');
assert(VALID_ORDER_REF_TYPES.has('pda'), 'valid ref type set should include pda');
assert(
  getActiveDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS).every((definition) => definition.active !== false),
  'getActiveDefinitions should filter inactive definitions'
);

console.log('order review types smoke ok');
