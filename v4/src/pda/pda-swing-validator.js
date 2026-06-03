// Mechanical BSL/SSL validation for manual annotations.
// This is advisory only: invalid points are still allowed to be marked.

import { timeframeToString } from '../config.js';
import {
  getBarChartTime,
  normalizeChartTime,
} from '../chart/time-projection.js';
import { getPdaType } from './pda-types.js';

export const SWING_VALIDATION_RULES = {
  1440: { left: 1, right: 1 },
  240: { left: 1, right: 1 },
  60: { left: 2, right: 2 },
  30: { left: 3, right: 3 },
  15: { left: 4, right: 4 },
};

function normalizeTimeKey(time) {
  return normalizeChartTime(time);
}

function findBarIndex(displayBars, selectedBar, timeframe) {
  const selectedKey = normalizeTimeKey(getBarChartTime(selectedBar, timeframe));
  return displayBars.findIndex(
    (bar) => normalizeTimeKey(getBarChartTime(bar, timeframe)) === selectedKey
  );
}

function isSwingHigh(anchor, leftSlice, rightSlice) {
  return (
    leftSlice.every((bar) => anchor.high >= bar.high) &&
    rightSlice.every((bar) => anchor.high > bar.high)
  );
}

function isSwingLow(anchor, leftSlice, rightSlice) {
  return (
    leftSlice.every((bar) => anchor.low <= bar.low) &&
    rightSlice.every((bar) => anchor.low < bar.low)
  );
}

export function validateManualSwing(type, selectedBar, timeframe, displayBars) {
  const pdaType = getPdaType(type);
  const tfLabel = timeframeToString(timeframe);
  const rule = SWING_VALIDATION_RULES[timeframe];

  if (!pdaType || !selectedBar) {
    return {
      checked: false,
      valid: true,
      rule: null,
      message: 'No swing validation rule applied',
    };
  }

  if (!rule) {
    return {
      checked: false,
      valid: true,
      rule: `${tfLabel} unsupported`,
      message: `${tfLabel} swing validation not configured`,
    };
  }

  const index = findBarIndex(displayBars, selectedBar, timeframe);
  if (index < 0) {
    return {
      checked: false,
      valid: true,
      rule: `${tfLabel} ${rule.left}/${rule.right}`,
      message: 'Selected bar not found in display data',
    };
  }

  if (index < rule.left || index + rule.right >= displayBars.length) {
    return {
      checked: true,
      valid: false,
      rule: `${tfLabel} ${rule.left}/${rule.right}`,
      message: `Not enough neighboring bars to confirm ${tfLabel} swing`,
    };
  }

  const leftSlice = displayBars.slice(index - rule.left, index);
  const rightSlice = displayBars.slice(index + 1, index + 1 + rule.right);
  const side = pdaType.priceField === 'high' ? 'high' : 'low';
  const valid =
    pdaType.priceField === 'high'
      ? isSwingHigh(selectedBar, leftSlice, rightSlice)
      : isSwingLow(selectedBar, leftSlice, rightSlice);

  return {
    checked: true,
    valid,
    rule: `${tfLabel} ${rule.left}/${rule.right}`,
    message: valid
      ? `${tfLabel} swing ${side}`
      : `Not a ${tfLabel} swing ${side} by ${rule.left}/${rule.right} rule`,
  };
}
