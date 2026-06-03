import {
  ORDER_DIRECTIONS,
  ORDER_DIRECTION_ALIASES,
  ORDER_EVENT_TYPES,
  ORDER_ENTRY_MODEL_DEFINITIONS,
  ORDER_REF_TYPES,
  ORDER_RESULTS,
  VALID_ORDER_DIRECTIONS,
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
assert(ORDER_RESULTS.STOP_LOSS === 'stop-loss', 'result enum should derive STOP_LOSS');
assert(VALID_ORDER_DIRECTIONS.has('long'), 'valid direction set should include long');
assert(!VALID_ORDER_DIRECTIONS.has('buy'), 'valid direction set should not include aliases');
assert(ORDER_DIRECTION_ALIASES.get('buy') === 'long', 'direction alias map should resolve buy');
assert(VALID_ORDER_REF_TYPES.has('pda'), 'valid ref type set should include pda');
assert(
  getActiveDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS).every((definition) => definition.active !== false),
  'getActiveDefinitions should filter inactive definitions'
);

console.log('order review types smoke ok');
