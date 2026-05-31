// UI workflow state for manual PDA creation from the primary chart context menu.

import * as bus from '../event-bus.js';
import { getPdaType } from './pda-types.js';
import {
  addManualFib,
  addManualFvg,
  addManualPoint,
  addManualRange,
  addManualWickCe,
} from './manual-pda-actions.js';

let rangeSelectionState = null;
let fibSelectionState = null;

function clearRangeSelection() {
  rangeSelectionState = null;
}

function clearFibSelection() {
  fibSelectionState = null;
}

function startManualRange(type, direction, bar, hideContextMenu) {
  if (!bar) return false;
  const pdaType = getPdaType(type);
  if (!pdaType) return false;

  clearFibSelection();
  rangeSelectionState = {
    type,
    direction,
    startBar: bar,
  };

  hideContextMenu?.();
  bus.emit('status:update', {
    text: `${direction} ${pdaType.label} 起点已选择，Shift + 右键选择终点`,
    isError: false,
  });
  return true;
}

function finishManualRange(endBar, context, hideContextMenu) {
  if (!rangeSelectionState || !endBar) return false;
  addManualRange(rangeSelectionState, endBar, context);
  clearRangeSelection();
  hideContextMenu?.();
  return true;
}

function startManualFib(bar, hideContextMenu) {
  if (!bar) return false;

  clearRangeSelection();
  fibSelectionState = { startBar: bar };
  hideContextMenu?.();
  bus.emit('status:update', {
    text: 'Fib 起点已选择，Shift + 右键选择终点',
    isError: false,
  });
  return true;
}

function finishManualFib(endBar, context, hideContextMenu) {
  if (!fibSelectionState || !endBar) return false;
  addManualFib(fibSelectionState, endBar, context);
  clearFibSelection();
  hideContextMenu?.();
  return true;
}

export function clearManualPdaWorkflowState() {
  clearRangeSelection();
  clearFibSelection();
}

export function cancelManualPdaWorkflow() {
  if (rangeSelectionState) {
    const pdaType = getPdaType(rangeSelectionState.type);
    clearRangeSelection();
    bus.emit('status:update', { text: `${pdaType?.label || 'Range PDA'} 选择已取消`, isError: false });
    return true;
  }

  if (fibSelectionState) {
    clearFibSelection();
    bus.emit('status:update', { text: 'Fib 选择已取消', isError: false });
    return true;
  }

  return false;
}

export function handleManualPdaShiftContext({ bar, context, hideContextMenu } = {}) {
  if (fibSelectionState) return finishManualFib(bar, context, hideContextMenu);
  if (rangeSelectionState) return finishManualRange(bar, context, hideContextMenu);
  return false;
}

export async function handleManualPdaAction(action, { bar, context, hideContextMenu } = {}) {
  if (action === 'bsl' || action === 'ssl') {
    await addManualPoint(action, bar, context);
    hideContextMenu?.();
    return true;
  }

  if (action === 'wick-ce-upper' || action === 'wick-ce-lower') {
    addManualWickCe(action === 'wick-ce-upper' ? 'upper' : 'lower', bar, context);
    hideContextMenu?.();
    return true;
  }

  if (action === 'fvg') {
    addManualFvg(bar, context);
    hideContextMenu?.();
    return true;
  }

  if (action === 'ifvg') {
    addManualFvg(bar, context, 'ifvg');
    hideContextMenu?.();
    return true;
  }

  if (action === 'ob-bullish' || action === 'ob-bearish') {
    return startManualRange('ob', action === 'ob-bullish' ? 'bullish' : 'bearish', bar, hideContextMenu);
  }

  if (action === 'breaker-bullish' || action === 'breaker-bearish') {
    return startManualRange('breaker', action === 'breaker-bullish' ? 'bullish' : 'bearish', bar, hideContextMenu);
  }

  if (action === 'fib-start') {
    return startManualFib(bar, hideContextMenu);
  }

  return false;
}
