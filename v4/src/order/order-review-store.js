// Order Review store foundation. MVP starts with configurable definitions.

export const ORDER_REVIEW_VERSION = 1;
export const DEFAULT_ORDER_INSTRUMENT = 'NQ';

function keyFromValue(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function valuesFromDefinitions(definitions) {
  return Object.fromEntries(definitions.map((definition) => [keyFromValue(definition.value), definition.value]));
}

function validSetFromDefinitions(definitions) {
  return new Set(definitions.map((definition) => definition.value));
}

function aliasMapFromDefinitions(definitions) {
  return new Map(
    definitions.flatMap((definition) =>
      (definition.aliases || []).map((alias) => [alias, definition.value])
    )
  );
}

export function getActiveDefinitions(definitions) {
  return definitions.filter((definition) => definition.active !== false);
}

export const ORDER_EVENT_TYPE_DEFINITIONS = [
  {
    value: 'sweep-liquidity',
    label: 'Sweep Liquidity',
    group: 'liquidity',
    active: true,
    aliases: ['liquidity-sweep'],
    description: 'Sweep BSL/SSL/EQH/EQL or comparable liquidity.',
  },
  {
    value: 'touch-fvg',
    label: 'Touch FVG',
    group: 'pda',
    active: true,
    aliases: ['fvg-touch'],
    description: 'Touch an FVG without requiring a full respect judgment.',
  },
  {
    value: 'respect-fvg',
    label: 'Respect FVG',
    group: 'pda',
    active: true,
    aliases: ['fvg-respect'],
    description: 'React from an FVG in a way the reviewer considers valid.',
  },
  {
    value: 'touch-nwog',
    label: 'Touch NWOG',
    group: 'objective-gap',
    active: true,
    aliases: ['nwog-touch'],
    description: 'Touch or react from NWOG.',
  },
  {
    value: 'touch-ndog',
    label: 'Touch NDOG',
    group: 'objective-gap',
    active: true,
    aliases: ['ndog-touch'],
    description: 'Touch or react from NDOG.',
  },
  {
    value: 'wick-ce',
    label: 'Wick CE',
    group: 'pda',
    active: true,
    aliases: [],
    description: 'React from a Wick CE PDA.',
  },
  {
    value: 'ob',
    label: 'OB',
    group: 'pda',
    active: true,
    aliases: ['order-block'],
    description: 'React from an order block range.',
  },
  {
    value: 'breaker',
    label: 'Breaker',
    group: 'pda',
    active: true,
    aliases: [],
    description: 'React from a breaker range.',
  },
  {
    value: 'smt',
    label: 'SMT',
    group: 'smt',
    active: true,
    aliases: [],
    description: 'SMT evidence is the primary trigger.',
  },
  {
    value: 'other',
    label: 'Other',
    group: 'manual',
    active: true,
    aliases: [],
    description: 'Manual thesis outside the current event list.',
  },
];

export const ORDER_REF_TYPE_DEFINITIONS = [
  { value: 'segment', label: 'Segment', active: true, aliases: ['market-segment'] },
  { value: 'composite', label: 'Composite Move', active: true, aliases: ['segment-group', 'composite-move'] },
  { value: 'pda', label: 'PDA', active: true, aliases: ['annotation'] },
  { value: 'smt', label: 'SMT', active: true, aliases: ['smt-record'] },
  { value: 'reactionEvidence', label: 'Reaction Evidence', active: true, aliases: ['reaction-evidence'] },
];

export const ORDER_REF_ROLE_DEFINITIONS = [
  { value: 'trigger', label: 'Trigger', active: true, aliases: [] },
  { value: 'context', label: 'Context', active: true, aliases: [] },
  { value: 'confirmation', label: 'Confirmation', active: true, aliases: [] },
  { value: 'target', label: 'Target', active: true, aliases: [] },
  { value: 'invalidation', label: 'Invalidation', active: true, aliases: [] },
  { value: 'evidence', label: 'Evidence', active: true, aliases: [] },
];

export const ORDER_DIRECTION_DEFINITIONS = [
  { value: 'long', label: 'Long', active: true, aliases: ['buy'] },
  { value: 'short', label: 'Short', active: true, aliases: ['sell'] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_ENTRY_MODEL_DEFINITIONS = [
  { value: 'ob', label: 'OB', group: 'pda', active: true, aliases: ['order-block'] },
  { value: 'fvg', label: 'FVG', group: 'pda', active: true, aliases: [] },
  { value: 'ote', label: 'OTE', group: 'retracement', active: true, aliases: [] },
  { value: 'ote-ob', label: 'OTE + OB', group: 'retracement', active: true, aliases: ['ote+ob'] },
  { value: 'sweep', label: 'Sweep', group: 'liquidity', active: true, aliases: [] },
  { value: 'breaker', label: 'Breaker', group: 'pda', active: true, aliases: [] },
  { value: 'manual', label: 'Manual', group: 'manual', active: true, aliases: [] },
];

export const ORDER_TIMEFRAME_DEFINITIONS = [
  { value: '1M', label: '1M', active: true, aliases: ['1m'] },
  { value: '5M', label: '5M', active: true, aliases: ['5m'] },
  { value: '15M', label: '15M', active: true, aliases: ['15m'] },
  { value: '30M', label: '30M', active: true, aliases: ['30m'] },
  { value: '1H', label: '1H', active: true, aliases: ['60M', '60m', '1h'] },
  { value: '4H', label: '4H', active: true, aliases: ['240M', '240m', '4h'] },
  { value: 'D', label: 'D', active: true, aliases: ['1D', '1d', 'daily'] },
  { value: 'manual', label: 'Manual', active: true, aliases: [] },
];

export const ORDER_TARGET_TYPE_DEFINITIONS = [
  { value: 'internal', label: 'Internal', active: true, aliases: [] },
  { value: 'swing', label: 'Swing', active: true, aliases: [] },
  { value: 'external', label: 'External', active: true, aliases: [] },
  { value: 'custom', label: 'Custom', active: true, aliases: [] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_STOP_REASON_DEFINITIONS = [
  { value: 'beyond-swing', label: 'Beyond Swing', active: true, aliases: ['swing'] },
  { value: 'beyond-liquidity', label: 'Beyond Liquidity', active: true, aliases: ['liquidity'] },
  { value: 'beyond-fvg', label: 'Beyond FVG', active: true, aliases: ['fvg'] },
  { value: 'beyond-ob', label: 'Beyond OB', active: true, aliases: ['ob'] },
  { value: 'fixed-points', label: 'Fixed Points', active: true, aliases: ['fixed'] },
  { value: 'manual', label: 'Manual', active: true, aliases: [] },
];

export const ORDER_TARGET_REACHED_DEFINITIONS = [
  { value: 'yes', label: 'Yes', active: true, aliases: [] },
  { value: 'no', label: 'No', active: true, aliases: [] },
  { value: 'partial', label: 'Partial', active: true, aliases: [] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_RESULT_DEFINITIONS = [
  { value: 'win', label: 'Win', active: true, aliases: [] },
  { value: 'loss', label: 'Loss', active: true, aliases: [] },
  { value: 'breakeven', label: 'Breakeven', active: true, aliases: ['break-even', 'be'] },
  { value: 'missed', label: 'Missed', active: true, aliases: [] },
  { value: 'skipped', label: 'Skipped', active: true, aliases: [] },
  { value: 'invalidated', label: 'Invalidated', active: true, aliases: [] },
  { value: 'managed-out', label: 'Managed Out', active: true, aliases: ['managed'] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_EXIT_REASON_DEFINITIONS = [
  { value: 'target-hit', label: 'Target Hit', active: true, aliases: ['target'] },
  { value: 'stop-hit', label: 'Stop Hit', active: true, aliases: ['stop'] },
  { value: 'manual-close', label: 'Manual Close', active: true, aliases: ['manual'] },
  { value: 'time-exit', label: 'Time Exit', active: true, aliases: ['time'] },
  { value: 'model-invalidated', label: 'Model Invalidated', active: true, aliases: ['invalidated'] },
  { value: 'missed-entry', label: 'Missed Entry', active: true, aliases: ['missed'] },
  { value: 'skipped', label: 'Skipped', active: true, aliases: [] },
  { value: 'unknown', label: 'Unknown', active: true, aliases: [] },
];

export const ORDER_CONFIDENCE_DEFINITIONS = [
  { value: 'A', label: 'A', active: true, aliases: ['a'] },
  { value: 'B', label: 'B', active: true, aliases: ['b'] },
  { value: 'C', label: 'C', active: true, aliases: ['c'] },
  { value: 'review-only', label: 'Review Only', active: true, aliases: ['review'] },
];

export const ORDER_EVENT_TYPES = valuesFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS);
export const ORDER_REF_TYPES = valuesFromDefinitions(ORDER_REF_TYPE_DEFINITIONS);
export const ORDER_REF_ROLES = valuesFromDefinitions(ORDER_REF_ROLE_DEFINITIONS);
export const ORDER_DIRECTIONS = valuesFromDefinitions(ORDER_DIRECTION_DEFINITIONS);
export const ORDER_ENTRY_MODELS = valuesFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS);
export const ORDER_TIMEFRAMES = valuesFromDefinitions(ORDER_TIMEFRAME_DEFINITIONS);
export const ORDER_TARGET_TYPES = valuesFromDefinitions(ORDER_TARGET_TYPE_DEFINITIONS);
export const ORDER_STOP_REASONS = valuesFromDefinitions(ORDER_STOP_REASON_DEFINITIONS);
export const ORDER_TARGET_REACHED = valuesFromDefinitions(ORDER_TARGET_REACHED_DEFINITIONS);
export const ORDER_RESULTS = valuesFromDefinitions(ORDER_RESULT_DEFINITIONS);
export const ORDER_EXIT_REASONS = valuesFromDefinitions(ORDER_EXIT_REASON_DEFINITIONS);
export const ORDER_CONFIDENCE = valuesFromDefinitions(ORDER_CONFIDENCE_DEFINITIONS);

export const VALID_ORDER_EVENT_TYPES = validSetFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS);
export const VALID_ORDER_REF_TYPES = validSetFromDefinitions(ORDER_REF_TYPE_DEFINITIONS);
export const VALID_ORDER_REF_ROLES = validSetFromDefinitions(ORDER_REF_ROLE_DEFINITIONS);
export const VALID_ORDER_DIRECTIONS = validSetFromDefinitions(ORDER_DIRECTION_DEFINITIONS);
export const VALID_ORDER_ENTRY_MODELS = validSetFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS);
export const VALID_ORDER_TIMEFRAMES = validSetFromDefinitions(ORDER_TIMEFRAME_DEFINITIONS);
export const VALID_ORDER_TARGET_TYPES = validSetFromDefinitions(ORDER_TARGET_TYPE_DEFINITIONS);
export const VALID_ORDER_STOP_REASONS = validSetFromDefinitions(ORDER_STOP_REASON_DEFINITIONS);
export const VALID_ORDER_TARGET_REACHED = validSetFromDefinitions(ORDER_TARGET_REACHED_DEFINITIONS);
export const VALID_ORDER_RESULTS = validSetFromDefinitions(ORDER_RESULT_DEFINITIONS);
export const VALID_ORDER_EXIT_REASONS = validSetFromDefinitions(ORDER_EXIT_REASON_DEFINITIONS);
export const VALID_ORDER_CONFIDENCE = validSetFromDefinitions(ORDER_CONFIDENCE_DEFINITIONS);

export const ORDER_EVENT_TYPE_ALIASES = aliasMapFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS);
export const ORDER_REF_TYPE_ALIASES = aliasMapFromDefinitions(ORDER_REF_TYPE_DEFINITIONS);
export const ORDER_REF_ROLE_ALIASES = aliasMapFromDefinitions(ORDER_REF_ROLE_DEFINITIONS);
export const ORDER_DIRECTION_ALIASES = aliasMapFromDefinitions(ORDER_DIRECTION_DEFINITIONS);
export const ORDER_ENTRY_MODEL_ALIASES = aliasMapFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS);
export const ORDER_TIMEFRAME_ALIASES = aliasMapFromDefinitions(ORDER_TIMEFRAME_DEFINITIONS);
export const ORDER_TARGET_TYPE_ALIASES = aliasMapFromDefinitions(ORDER_TARGET_TYPE_DEFINITIONS);
export const ORDER_STOP_REASON_ALIASES = aliasMapFromDefinitions(ORDER_STOP_REASON_DEFINITIONS);
export const ORDER_TARGET_REACHED_ALIASES = aliasMapFromDefinitions(ORDER_TARGET_REACHED_DEFINITIONS);
export const ORDER_RESULT_ALIASES = aliasMapFromDefinitions(ORDER_RESULT_DEFINITIONS);
export const ORDER_EXIT_REASON_ALIASES = aliasMapFromDefinitions(ORDER_EXIT_REASON_DEFINITIONS);
export const ORDER_CONFIDENCE_ALIASES = aliasMapFromDefinitions(ORDER_CONFIDENCE_DEFINITIONS);
