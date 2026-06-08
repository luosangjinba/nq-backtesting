// Chart-based manual SMT annotation workflow.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { findDisplayBarFast } from '../chart/display-bar-lookup.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { getBarChartTime } from '../chart/time-projection.js';
import { timeframeToString } from '../config.js';
import { identifyFvg } from '../pda/fvg-identifier.js';
import { addSmtRecord, SMT_DIRECTIONS, SMT_TYPES } from './smt-store.js';
import { recordHistory } from '../history/history-manager.js';
import { createRafThrottle } from '../utils/raf-throttle.js';

let pickState = null;

function getPrimaryChartTime(bar) {
  return getBarChartTime(bar, store.getCurrentTimeframe());
}

function findPrimaryBarByChartTime(time) {
  return findDisplayBarFast(store.getDisplayBars(), time, store.getCurrentTimeframe());
}

function findSecondaryBar(timestamp) {
  return secondaryStore.getSecondaryDisplayBars().find((bar) => Number(bar.timestamp) === Number(timestamp)) || null;
}

function assertCanMarkSmt() {
  if (!secondaryStore.isSecondaryEnabled() || secondaryStore.getSecondaryInstrument() !== 'ES') {
    throw new Error('SMT requires Split on with Sub=ES');
  }
  if (secondaryStore.getSecondaryTimeframe() !== store.getCurrentTimeframe()) {
    throw new Error('SMT requires primary TF and Sub TF to match');
  }
  if (!store.getDisplayBars().length || !secondaryStore.getSecondaryDisplayBars().length) {
    throw new Error('SMT requires loaded NQ and ES bars');
  }
}

function getDirectionPrice(bar, direction) {
  return direction === SMT_DIRECTIONS.BULLISH ? Number(bar.low) : Number(bar.high);
}

function validateLiquidity(direction, primaryLeft, primaryRight, compareLeft, compareRight) {
  if (direction === SMT_DIRECTIONS.BULLISH) {
    return primaryRight.low >= primaryLeft.low && compareRight.low < compareLeft.low;
  }
  return primaryRight.high <= primaryLeft.high && compareRight.high > compareLeft.high;
}

function createLiquidityRecord(leftBar, rightBar, direction) {
  const compareLeft = findSecondaryBar(leftBar.timestamp);
  const compareRight = findSecondaryBar(rightBar.timestamp);
  if (!compareLeft || !compareRight) {
    throw new Error('Could not find matching ES bars for selected NQ times');
  }
  if (!validateLiquidity(direction, leftBar, rightBar, compareLeft, compareRight)) {
    throw new Error('Selected bars do not match NQ no-sweep / ES sweep SMT rules');
  }

  return addSmtRecord({
    type: SMT_TYPES.LIQUIDITY,
    direction,
    timeframe: timeframeToString(store.getCurrentTimeframe()),
    leftTimestamp: leftBar.timestamp,
    rightTimestamp: rightBar.timestamp,
    primaryLeftPrice: getDirectionPrice(leftBar, direction),
    primaryRightPrice: getDirectionPrice(rightBar, direction),
    compareLeftPrice: getDirectionPrice(compareLeft, direction),
    compareRightPrice: getDirectionPrice(compareRight, direction),
  });
}

function findSecondaryFvg(timestamp, direction) {
  const bars = secondaryStore.getSecondaryDisplayBars();
  const index = bars.findIndex((bar) => Number(bar.timestamp) === Number(timestamp));
  if (index < 0) return null;

  const candidates = [index - 2, index - 1, index, index + 1, index + 2]
    .filter((candidateIndex) => candidateIndex >= 0 && candidateIndex < bars.length)
    .map((candidateIndex) => identifyFvg(bars, bars[candidateIndex]))
    .filter(Boolean)
    .filter((fvg) => fvg.direction === direction)
    .filter((fvg) => timestamp >= fvg.startBar.timestamp && timestamp <= fvg.endBar.timestamp);

  return candidates[0] || null;
}

function createFvgRecord(bar, direction) {
  const fvg = findSecondaryFvg(bar.timestamp, direction);
  if (!fvg) {
    throw new Error(`No ${direction} ES FVG found at the selected NQ time`);
  }

  return addSmtRecord({
    type: SMT_TYPES.FVG,
    direction,
    timeframe: timeframeToString(store.getCurrentTimeframe()),
    timestamp: bar.timestamp,
    fvgStartTimestamp: fvg.startBar.timestamp,
    fvgEndTimestamp: fvg.endBar.timestamp,
    fvgTop: fvg.topPrice,
    fvgBottom: fvg.bottomPrice,
  });
}

export function isSmtPicking() {
  return Boolean(pickState);
}

function clearPickState({ silent = false } = {}) {
  if (!pickState) return;
  pickState = null;
  chart.hidePickPreviewCursor();
  if (!silent) bus.emit('status:update', { text: 'SMT pick cancelled', isError: false });
}

function handlePickClick(param) {
  if (!pickState) return;
  const bar = findPrimaryBarByChartTime(param?.time);
  if (!bar) return;

  try {
    if (pickState.type === SMT_TYPES.LIQUIDITY && pickState.step === 'right') {
      const record = recordHistory('Create Liquidity SMT', () =>
        createLiquidityRecord(pickState.leftBar, bar, pickState.direction)
      );
      clearPickState({ silent: true });
      bus.emit('status:update', { text: `Created ${record.direction} Liquidity SMT`, isError: false });
      return;
    }

    if (pickState.type === SMT_TYPES.FVG) {
      const record = recordHistory('Create FVG SMT', () => createFvgRecord(bar, pickState.direction));
      clearPickState({ silent: true });
      bus.emit('status:update', { text: `Created ${record.direction} FVG SMT`, isError: false });
    }
  } catch (err) {
    bus.emit('status:update', { text: `SMT failed: ${err.message}`, isError: true });
  }
}

function handlePickHover(param) {
  if (!pickState) return;
  const bar = findPrimaryBarByChartTime(param?.time);
  if (!bar) {
    chart.hidePickPreviewCursor();
    return;
  }
  chart.showPickPreviewCursor(getPrimaryChartTime(bar));
}

const handlePickHoverThrottled = createRafThrottle(handlePickHover);

export function startLiquiditySmt(direction, leftBar) {
  try {
    assertCanMarkSmt();
  } catch (err) {
    bus.emit('status:update', { text: err.message, isError: true });
    return;
  }
  if (!leftBar) return;
  pickState = {
    type: SMT_TYPES.LIQUIDITY,
    direction,
    step: 'right',
    leftBar,
  };
  bus.emit('status:update', {
    text: `Select right bar for ${direction} Liquidity SMT`,
    isError: false,
  });
}

export function startFvgSmt(direction) {
  try {
    assertCanMarkSmt();
  } catch (err) {
    bus.emit('status:update', { text: err.message, isError: true });
    return;
  }
  pickState = {
    type: SMT_TYPES.FVG,
    direction,
  };
  bus.emit('status:update', {
    text: `Select the NQ bar at the matching ES FVG time for ${direction} FVG SMT`,
    isError: false,
  });
}

export function initManualSmt() {
  chart.onClick(handlePickClick);
  chart.onCrosshairMove(handlePickHoverThrottled);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') clearPickState();
  });
  bus.on('bars:loaded', () => clearPickState({ silent: true }));
  bus.on('bars:cleared', () => clearPickState({ silent: true }));
}
