// Live Record runtime definitions. This object family intentionally mirrors
// Order Setups at the UI boundary while keeping storage and events separate.

export const LIVE_RECORD_VERSION = 1;
export const DEFAULT_LIVE_RECORD_INSTRUMENT = 'NQ';

export const LIVE_RECORD_DIRECTIONS = Object.freeze({
  LONG: 'long',
  SHORT: 'short',
  UNKNOWN: 'unknown',
});

export const LIVE_RECORD_STATUSES = Object.freeze({
  DRAFT: 'draft',
  PLANNED: 'planned',
  ACTIVE: 'active',
  SUBMITTED: 'submitted',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  CLOSED: 'closed',
  REVIEWED: 'reviewed',
});

export const LIVE_RECORD_RESULT_STATUSES = Object.freeze({
  UNKNOWN: 'unknown',
  WIN: 'win',
  LOSS: 'loss',
  BREAKEVEN: 'breakeven',
  SCRATCH: 'scratch',
  MISSED: 'missed',
  INVALID: 'invalid',
});

export const LIVE_RECORD_EXIT_TYPES = Object.freeze({
  UNKNOWN: 'unknown',
  PROFIT: 'profit',
  MANUAL_PROFIT: 'manualProfit',
  STOP_LOSS: 'stopLoss',
  MANUAL_LOSS: 'manualLoss',
  BREAKEVEN: 'breakeven',
});

export const LIVE_RECORD_REASON_CATEGORIES = Object.freeze({
  OTHER: 'other',
  MACROS: 'macros',
  STRUCTURE: 'structure',
  LIQUIDITY: 'liquidity',
  ENTRY_MODEL: 'entry-model',
  EXECUTION: 'execution',
  DISCIPLINE: 'discipline',
});

export const LIVE_RECORD_REF_TYPES = Object.freeze({
  ORDER_SETUP: 'order-setup',
  PDA: 'pda',
  SEGMENT: 'segment',
  COMPOSITE: 'composite',
  SMT: 'smt',
  CHART_NOTE: 'chart-note',
  TIME_REACTION: 'time-reaction',
});

export const LIVE_RECORD_REF_ROLES = Object.freeze({
  CONTEXT: 'context',
  SETUP: 'setup',
  TRIGGER: 'trigger',
  EXECUTION: 'execution',
  REVIEW: 'review',
});

export const LIVE_RECORD_TARGET_ROLES = Object.freeze({
  INTERNAL_1: 'targetInternal1',
  INTERNAL_2: 'targetInternal2',
  INTERNAL_3: 'targetInternal3',
  SWING_POINT: 'targetSwingPoint',
  EXTERNAL_1: 'targetExternal1',
  EXTERNAL_2: 'targetExternal2',
  FINAL: 'finalTarget',
});

export const LIVE_RECORD_TARGET_TYPES = Object.freeze({
  INTERNAL: 'internal',
  SWING: 'swing',
  EXTERNAL: 'external',
  FINAL: 'final',
});

export const LIVE_RECORD_TIMEFRAMES = Object.freeze({
  '1M': '1M',
  '2M': '2M',
  '3M': '3M',
  '4M': '4M',
  '5M': '5M',
  '10M': '10M',
  '15M': '15M',
  '30M': '30M',
  '1H': '1H',
  '4H': '4H',
  D: 'D',
  MANUAL: 'manual',
});

export const VALID_LIVE_RECORD_DIRECTIONS = new Set(Object.values(LIVE_RECORD_DIRECTIONS));
export const VALID_LIVE_RECORD_STATUSES = new Set(Object.values(LIVE_RECORD_STATUSES));
export const VALID_LIVE_RECORD_RESULT_STATUSES = new Set(Object.values(LIVE_RECORD_RESULT_STATUSES));
export const VALID_LIVE_RECORD_EXIT_TYPES = new Set(Object.values(LIVE_RECORD_EXIT_TYPES));
export const VALID_LIVE_RECORD_REASON_CATEGORIES = new Set(Object.values(LIVE_RECORD_REASON_CATEGORIES));
export const VALID_LIVE_RECORD_REF_TYPES = new Set(Object.values(LIVE_RECORD_REF_TYPES));
export const VALID_LIVE_RECORD_REF_ROLES = new Set(Object.values(LIVE_RECORD_REF_ROLES));
export const VALID_LIVE_RECORD_TARGET_ROLES = new Set(Object.values(LIVE_RECORD_TARGET_ROLES));
export const VALID_LIVE_RECORD_TARGET_TYPES = new Set(Object.values(LIVE_RECORD_TARGET_TYPES));
export const VALID_LIVE_RECORD_TIMEFRAMES = new Set(Object.values(LIVE_RECORD_TIMEFRAMES));

export const LIVE_RECORD_DIRECTION_ALIASES = new Map([
  ['bullish', LIVE_RECORD_DIRECTIONS.LONG],
  ['bearish', LIVE_RECORD_DIRECTIONS.SHORT],
  ['buy', LIVE_RECORD_DIRECTIONS.LONG],
  ['sell', LIVE_RECORD_DIRECTIONS.SHORT],
]);

export const LIVE_RECORD_STATUS_ALIASES = new Map([
  ['open', LIVE_RECORD_STATUSES.ACTIVE],
  ['done', LIVE_RECORD_STATUSES.CLOSED],
  ['complete', LIVE_RECORD_STATUSES.CLOSED],
]);

export const LIVE_RECORD_RESULT_ALIASES = new Map([
  ['profit', LIVE_RECORD_RESULT_STATUSES.WIN],
  ['winner', LIVE_RECORD_RESULT_STATUSES.WIN],
  ['loser', LIVE_RECORD_RESULT_STATUSES.LOSS],
  ['be', LIVE_RECORD_RESULT_STATUSES.BREAKEVEN],
]);

export const LIVE_RECORD_EXIT_TYPE_ALIASES = new Map([
  ['win', LIVE_RECORD_EXIT_TYPES.PROFIT],
  ['winner', LIVE_RECORD_EXIT_TYPES.PROFIT],
  ['target', LIVE_RECORD_EXIT_TYPES.PROFIT],
  ['target-hit', LIVE_RECORD_EXIT_TYPES.PROFIT],
  ['target_hit', LIVE_RECORD_EXIT_TYPES.PROFIT],
  ['manual-profit', LIVE_RECORD_EXIT_TYPES.MANUAL_PROFIT],
  ['manual_profit', LIVE_RECORD_EXIT_TYPES.MANUAL_PROFIT],
  ['manual win', LIVE_RECORD_EXIT_TYPES.MANUAL_PROFIT],
  ['manual target', LIVE_RECORD_EXIT_TYPES.MANUAL_PROFIT],
  ['loss', LIVE_RECORD_EXIT_TYPES.MANUAL_LOSS],
  ['loser', LIVE_RECORD_EXIT_TYPES.MANUAL_LOSS],
  ['manual-loss', LIVE_RECORD_EXIT_TYPES.MANUAL_LOSS],
  ['manual_loss', LIVE_RECORD_EXIT_TYPES.MANUAL_LOSS],
  ['manual stop', LIVE_RECORD_EXIT_TYPES.MANUAL_LOSS],
  ['manual stop-loss', LIVE_RECORD_EXIT_TYPES.MANUAL_LOSS],
  ['stop-loss', LIVE_RECORD_EXIT_TYPES.STOP_LOSS],
  ['stop_loss', LIVE_RECORD_EXIT_TYPES.STOP_LOSS],
  ['sl', LIVE_RECORD_EXIT_TYPES.STOP_LOSS],
  ['breakeven', LIVE_RECORD_EXIT_TYPES.BREAKEVEN],
  ['break-even', LIVE_RECORD_EXIT_TYPES.BREAKEVEN],
  ['break_even', LIVE_RECORD_EXIT_TYPES.BREAKEVEN],
  ['be', LIVE_RECORD_EXIT_TYPES.BREAKEVEN],
]);

export const LIVE_RECORD_TIMEFRAME_ALIASES = new Map([
  ['1', LIVE_RECORD_TIMEFRAMES['1M']],
  ['1m', LIVE_RECORD_TIMEFRAMES['1M']],
  ['2', LIVE_RECORD_TIMEFRAMES['2M']],
  ['2m', LIVE_RECORD_TIMEFRAMES['2M']],
  ['3', LIVE_RECORD_TIMEFRAMES['3M']],
  ['3m', LIVE_RECORD_TIMEFRAMES['3M']],
  ['4', LIVE_RECORD_TIMEFRAMES['4M']],
  ['4m', LIVE_RECORD_TIMEFRAMES['4M']],
  ['5', LIVE_RECORD_TIMEFRAMES['5M']],
  ['5m', LIVE_RECORD_TIMEFRAMES['5M']],
  ['10', LIVE_RECORD_TIMEFRAMES['10M']],
  ['10m', LIVE_RECORD_TIMEFRAMES['10M']],
  ['15', LIVE_RECORD_TIMEFRAMES['15M']],
  ['15m', LIVE_RECORD_TIMEFRAMES['15M']],
  ['30', LIVE_RECORD_TIMEFRAMES['30M']],
  ['30m', LIVE_RECORD_TIMEFRAMES['30M']],
  ['60', LIVE_RECORD_TIMEFRAMES['1H']],
  ['1h', LIVE_RECORD_TIMEFRAMES['1H']],
  ['4h', LIVE_RECORD_TIMEFRAMES['4H']],
  ['daily', LIVE_RECORD_TIMEFRAMES.D],
  ['day', LIVE_RECORD_TIMEFRAMES.D],
]);
