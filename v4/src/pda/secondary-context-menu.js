// Secondary chart context menu MVP. Step 120 keeps it read-only; PDA writes are
// enabled later through explicit secondary chart actions.

import * as bus from '../event-bus.js';
import { getSecondaryChartContext } from '../chart/chart-context.js';
import * as secondaryChart from '../chart/secondary-chart-manager.js';
import * as viewport from '../chart/viewport-controller.js';
import { timeframeToString } from '../config.js';
import { recordHistory } from '../history/history-manager.js';
import { clampMenuPosition } from './manual-context-menu.js';
import {
  addManualFib,
  addManualFvg,
  addManualObLastBar,
  addManualPoint,
  addManualRange,
  addManualWickCe,
  findDisplayBarInContext,
  getBarChartTime,
} from './manual-pda-actions.js';
import { getPdaType } from './pda-types.js';
import {
  addPointSetPoint,
  cancelPointSet,
  clearPointSetSelection,
  finishPointSet,
  getPointSetSelectionSummary,
  startPointSet,
} from './point-set-annotation.js';
import {
  finishSegmentInContext,
  startSegmentInContext,
} from '../segment/manual-segment.js';

let controlsEl = null;
let contextMenuBar = null;
let contextMenuPrice = null;
let secondaryRangeSelection = null;
let secondaryFibSelection = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatContextTime(bar) {
  if (!bar) return 'No secondary bar';
  return bar.tradingDay || bar.time || String(bar.timestamp || '');
}

function formatPrice(price) {
  return Number.isFinite(Number(price)) ? Number(price).toFixed(2) : '';
}

function formatDraftTime(bar) {
  if (!bar) return '';
  return bar.tradingDay || bar.time || String(bar.timestamp || '');
}

function clearSecondaryRangeSelection() {
  secondaryRangeSelection = null;
}

function clearSecondaryFibSelection() {
  secondaryFibSelection = null;
}

function hasSecondaryPdaDraft() {
  return Boolean(secondaryRangeSelection || secondaryFibSelection);
}

function cancelSecondaryPdaDraft() {
  if (secondaryRangeSelection) {
    const pdaType = getPdaType(secondaryRangeSelection.type);
    clearSecondaryRangeSelection();
    bus.emit('status:update', {
      text: `副图 ${pdaType?.label || 'Range PDA'} 选择已取消`,
      isError: false,
    });
    return true;
  }

  if (secondaryFibSelection) {
    clearSecondaryFibSelection();
    bus.emit('status:update', { text: '副图 Fib 选择已取消', isError: false });
    return true;
  }

  return false;
}

function startSecondaryRange(type, direction, bar) {
  if (!bar) return false;
  const pdaType = getPdaType(type);
  if (!pdaType) return false;

  clearSecondaryFibSelection();
  secondaryRangeSelection = {
    type,
    direction,
    startBar: bar,
  };
  bus.emit('status:update', {
    text: `副图 ${direction} ${pdaType.label} 起点已选择，再右键选择终点`,
    isError: false,
  });
  return true;
}

function finishSecondaryRange(endBar, context) {
  if (!secondaryRangeSelection || !endBar) return false;
  const added = addManualRange(secondaryRangeSelection, endBar, context);
  clearSecondaryRangeSelection();
  return added;
}

function startSecondaryFib(bar) {
  if (!bar) return false;
  clearSecondaryRangeSelection();
  secondaryFibSelection = { startBar: bar };
  bus.emit('status:update', {
    text: '副图 Fib 起点已选择，再右键选择终点',
    isError: false,
  });
  return true;
}

function finishSecondaryFib(endBar, context) {
  if (!secondaryFibSelection || !endBar) return false;
  const added = addManualFib(secondaryFibSelection, endBar, context);
  clearSecondaryFibSelection();
  return added;
}

function finishSecondaryPdaDraft(bar, context) {
  if (secondaryRangeSelection) return finishSecondaryRange(bar, context);
  if (secondaryFibSelection) return finishSecondaryFib(bar, context);
  return false;
}

function renderSecondaryDraftItems(disabled) {
  if (secondaryRangeSelection) {
    const pdaType = getPdaType(secondaryRangeSelection.type);
    const label = `${secondaryRangeSelection.direction} ${pdaType?.label || secondaryRangeSelection.type}`;
    return `
        <div class="pda-menu-subtitle">Draft: ${escapeHtml(label)} from ${escapeHtml(formatDraftTime(secondaryRangeSelection.startBar))}</div>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-range-finish" ${disabled}>End Range Here</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-draft-cancel">Cancel Draft</button>
    `;
  }

  if (secondaryFibSelection) {
    return `
        <div class="pda-menu-subtitle">Draft: Fib from ${escapeHtml(formatDraftTime(secondaryFibSelection.startBar))}</div>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-fib-finish" ${disabled}>End Fib Here</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-draft-cancel">Cancel Draft</button>
    `;
  }

  return `
        <button class="pda-menu-item" data-secondary-action="secondary-pda-ob-bullish" ${disabled}>Start Bullish OB</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-ob-bearish" ${disabled}>Start Bearish OB</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-breaker-bullish" ${disabled}>Start Bullish Breaker</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-breaker-bearish" ${disabled}>Start Bearish Breaker</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-fib-start" ${disabled}>Start Fib</button>
  `;
}

function getSecondaryPointSetOptions(context) {
  const tfLabel = timeframeToString(context?.timeframe);
  const instrument = context?.instrument || 'NQ';
  const chartId = context?.chartId || context?.id || 'secondary';
  const contextLabel = `${instrument} ${tfLabel}`;
  return {
    scope: 'secondary',
    timeframe: context?.timeframe,
    contextLabel,
    metadata: {
      sourceChartId: chartId,
      sourceChartLabel: context?.label || 'Secondary',
      sourceInstrument: instrument,
      sourceTimeframe: context?.timeframe,
      sourceTimeframeLabel: tfLabel,
      sourceContext: contextLabel,
    },
  };
}

function getSecondaryPointSetChartTime(bar) {
  return getBarChartTime(getSecondaryChartContext(), bar);
}

function renderSecondaryPointSetItems(disabled, context) {
  const activeSet = getPointSetSelectionSummary(getSecondaryPointSetOptions(context));
  if (activeSet) {
    return `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">${escapeHtml(activeSet.label)} set · ${activeSet.count} point${activeSet.count === 1 ? '' : 's'}</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-secondary-action="secondary-pointset-add" ${disabled}>Add ${escapeHtml(activeSet.label)} Point</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pointset-finish">Finish ${escapeHtml(activeSet.label)}</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pointset-cancel">Cancel Set</button>
        </div>
      </div>
    `;
  }

  return `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Point Sets</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-secondary-action="secondary-eqh-start" ${disabled}>Start EQH Set</button>
        <button class="pda-menu-item" data-secondary-action="secondary-eql-start" ${disabled}>Start EQL Set</button>
        </div>
      </div>
  `;
}

function formatPrimaryLocateRange(bar, context) {
  const timestamp = Number(bar?.timestamp);
  const timeframe = Number(context?.timeframe);
  if (!Number.isFinite(timestamp) || !Number.isFinite(timeframe) || timeframe <= 0) {
    return null;
  }
  const durationSeconds = timeframe * 60;
  return {
    start: timestamp,
    end: timestamp + Math.max(60, durationSeconds) - 60,
  };
}

async function copyText(value, label) {
  const text = String(value || '').trim();
  if (!text) {
    bus.emit('status:update', { text: `${label} 不可用`, isError: true });
    return;
  }

  try {
    await navigator.clipboard?.writeText(text);
    bus.emit('status:update', { text: `已复制副图 ${label}: ${text}`, isError: false });
  } catch (err) {
    bus.emit('status:update', { text: `副图 ${label}: ${text}`, isError: false });
  }
}

function renderSecondaryContextMenu({ left, top, maxHeight, submenuDirection, bar, price, context }) {
  const disabled = bar ? '' : 'disabled';
  const priceDisabled = Number.isFinite(Number(price)) ? '' : 'disabled';
  const title = `${context.instrument} ${timeframeToString(context.timeframe)} · ${formatContextTime(bar)}`;
  const priceLabel = formatPrice(price);

  return `
    <div class="pda-menu pda-menu-submenu-${submenuDirection}" style="left: ${left}px; top: ${top}px; max-height: ${maxHeight}px;">
      <div class="pda-menu-title">${escapeHtml(title)}</div>
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">PDA</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-secondary-action="secondary-pda-bsl" ${disabled}>Mark BSL</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-ssl" ${disabled}>Mark SSL</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-wick-ce-upper" ${disabled}>Mark Upper Wick CE</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-wick-ce-lower" ${disabled}>Mark Lower Wick CE</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-fvg" ${disabled}>Mark FVG</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-ifvg" ${disabled}>Mark IFVG</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-ob-last-bar" ${priceDisabled}>Mark OB Last Bar</button>
        ${renderSecondaryDraftItems(disabled)}
        </div>
      </div>
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Navigation</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-secondary-action="secondary-show-cursor" ${disabled}>Show Cursor Here</button>
        <button class="pda-menu-item" data-secondary-action="secondary-locate-primary" ${disabled}>Locate Time in Primary</button>
        <button class="pda-menu-item" data-secondary-action="secondary-copy-time" ${disabled}>Copy Secondary Time</button>
        <button class="pda-menu-item" data-secondary-action="secondary-copy-price" ${priceDisabled}>Copy Price ${escapeHtml(priceLabel)}</button>
        </div>
      </div>
      ${renderSecondaryPointSetItems(disabled, context)}
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Segments</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-secondary-action="secondary-segment-start-low" ${disabled}>Start Segment from Low</button>
        <button class="pda-menu-item" data-secondary-action="secondary-segment-start-high" ${disabled}>Start Segment from High</button>
        <button class="pda-menu-item" data-secondary-action="secondary-segment-finish-low" ${disabled}>End Segment at Low</button>
        <button class="pda-menu-item" data-secondary-action="secondary-segment-finish-high" ${disabled}>End Segment at High</button>
        </div>
      </div>
    </div>
  `;
}

function hideSecondaryContextMenu() {
  contextMenuBar = null;
  contextMenuPrice = null;
  if (controlsEl) controlsEl.innerHTML = '';
}

function showSecondaryContextMenu(x, y, bar, price) {
  if (!controlsEl) return;
  const context = getSecondaryChartContext();
  const { x: left, y: top, maxHeight, submenuDirection } = clampMenuPosition(controlsEl, x, y);
  contextMenuBar = bar;
  contextMenuPrice = price;
  document.getElementById('pda-context-menu')?.replaceChildren();
  controlsEl.innerHTML = renderSecondaryContextMenu({
    left,
    top,
    maxHeight,
    submenuDirection,
    bar,
    price,
    context,
  });
}

function handleSecondaryContextMenu(e) {
  if (e.target.closest('#secondary-viewport-controls') || e.target.closest('.pda-menu')) return;

  e.preventDefault();
  const chartEl = document.getElementById('secondary-chart');
  if (!chartEl) return;
  const context = getSecondaryChartContext();
  if (!context.enabled) return;

  const rect = chartEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const time = context.coordinateToTime(x);
  const bar = findDisplayBarInContext(context, time);
  const price = context.coordinateToPrice(y);

  if (e.shiftKey && hasSecondaryPdaDraft()) {
    finishSecondaryPdaDraft(bar, context);
    hideSecondaryContextMenu();
    return;
  }

  showSecondaryContextMenu(x, y, bar, price);
}

async function handleSecondaryMenuClick(e) {
  const action = e.target.closest('[data-secondary-action]')?.dataset.secondaryAction;
  if (!action) return;
  e.stopPropagation();

  if (action === 'secondary-pda-bsl' || action === 'secondary-pda-ssl') {
    const context = getSecondaryChartContext();
    await addManualPoint(
      action === 'secondary-pda-bsl' ? 'bsl' : 'ssl',
      contextMenuBar,
      context,
      {
        source: 'manual',
        sourceChartLabel: context.label,
      }
    );
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pda-fvg') {
    const context = getSecondaryChartContext();
    addManualFvg(contextMenuBar, context);
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pda-ifvg') {
    const context = getSecondaryChartContext();
    addManualFvg(contextMenuBar, context, 'ifvg');
    hideSecondaryContextMenu();
  } else if (
    action === 'secondary-pda-wick-ce-upper' ||
    action === 'secondary-pda-wick-ce-lower'
  ) {
    const context = getSecondaryChartContext();
    addManualWickCe(action === 'secondary-pda-wick-ce-upper' ? 'upper' : 'lower', contextMenuBar, context);
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pda-ob-last-bar') {
    const context = getSecondaryChartContext();
    await addManualObLastBar(contextMenuBar, context, contextMenuPrice);
    hideSecondaryContextMenu();
  } else if (
    action === 'secondary-pda-ob-bullish' ||
    action === 'secondary-pda-ob-bearish'
  ) {
    startSecondaryRange('ob', action === 'secondary-pda-ob-bullish' ? 'bullish' : 'bearish', contextMenuBar);
    hideSecondaryContextMenu();
  } else if (
    action === 'secondary-pda-breaker-bullish' ||
    action === 'secondary-pda-breaker-bearish'
  ) {
    startSecondaryRange(
      'breaker',
      action === 'secondary-pda-breaker-bullish' ? 'bullish' : 'bearish',
      contextMenuBar
    );
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pda-range-finish') {
    finishSecondaryRange(contextMenuBar, getSecondaryChartContext());
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pda-fib-start') {
    startSecondaryFib(contextMenuBar);
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pda-fib-finish') {
    finishSecondaryFib(contextMenuBar, getSecondaryChartContext());
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pda-draft-cancel') {
    cancelSecondaryPdaDraft();
    hideSecondaryContextMenu();
  } else if (
    action === 'secondary-segment-start-low' ||
    action === 'secondary-segment-start-high'
  ) {
    const context = getSecondaryChartContext();
    recordHistory('Start Secondary Segment', () =>
      startSegmentInContext(
        contextMenuBar,
        action === 'secondary-segment-start-high' ? 'swing-high' : 'swing-low',
        context
      )
    );
    hideSecondaryContextMenu();
  } else if (
    action === 'secondary-segment-finish-low' ||
    action === 'secondary-segment-finish-high'
  ) {
    const context = getSecondaryChartContext();
    await recordHistory('Finish Secondary Segment', () =>
      finishSegmentInContext(
        contextMenuBar,
        action === 'secondary-segment-finish-high' ? 'swing-high' : 'swing-low',
        context
      )
    );
    hideSecondaryContextMenu();
  } else if (action === 'secondary-eqh-start' || action === 'secondary-eql-start') {
    const context = getSecondaryChartContext();
    const options = getSecondaryPointSetOptions(context);
    recordHistory(`Start Secondary ${action === 'secondary-eqh-start' ? 'EQH' : 'EQL'} Set`, () =>
      startPointSet(
        action === 'secondary-eqh-start' ? 'eqh' : 'eql',
        contextMenuBar,
        getSecondaryPointSetChartTime,
        options
      )
    );
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pointset-add') {
    const context = getSecondaryChartContext();
    recordHistory('Add Secondary Point Set Point', () =>
      addPointSetPoint(contextMenuBar, getSecondaryPointSetChartTime, getSecondaryPointSetOptions(context))
    );
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pointset-finish') {
    const context = getSecondaryChartContext();
    recordHistory('Finish Secondary Point Set', () =>
      finishPointSet(getSecondaryPointSetOptions(context))
    );
    hideSecondaryContextMenu();
  } else if (action === 'secondary-pointset-cancel') {
    const context = getSecondaryChartContext();
    recordHistory('Cancel Secondary Point Set', () =>
      cancelPointSet(getSecondaryPointSetOptions(context))
    );
    hideSecondaryContextMenu();
  } else if (action === 'secondary-show-cursor') {
    if (contextMenuBar) {
      secondaryChart.showSecondaryHoverCursor(getBarChartTime(getSecondaryChartContext(), contextMenuBar));
      bus.emit('status:update', { text: `副图 cursor: ${formatContextTime(contextMenuBar)}`, isError: false });
    }
    hideSecondaryContextMenu();
  } else if (action === 'secondary-locate-primary') {
    const context = getSecondaryChartContext();
    const range = formatPrimaryLocateRange(contextMenuBar, context);
    if (!range) {
      bus.emit('status:update', { text: '主图定位失败：副图时间不可用', isError: true });
      hideSecondaryContextMenu();
      return;
    }
    viewport.locateTimestampRange(range.start, range.end);
    bus.emit('status:update', { text: `主图已定位到 ${formatContextTime(contextMenuBar)}`, isError: false });
    hideSecondaryContextMenu();
  } else if (action === 'secondary-copy-time') {
    await copyText(formatContextTime(contextMenuBar), '时间');
    hideSecondaryContextMenu();
  } else if (action === 'secondary-copy-price') {
    await copyText(formatPrice(contextMenuPrice), '价格');
    hideSecondaryContextMenu();
  }
}

function handleGlobalClick(e) {
  if (!e.target.closest('.pda-menu')) hideSecondaryContextMenu();
}

function handleKeydown(e) {
  if (e.key !== 'Escape') return;
  cancelSecondaryPdaDraft();
  hideSecondaryContextMenu();
}

export function initSecondaryContextMenu() {
  controlsEl = document.getElementById('secondary-context-menu');
  const chartEl = document.getElementById('secondary-chart');
  if (!controlsEl || !chartEl) return;

  controlsEl.addEventListener('click', handleSecondaryMenuClick);
  chartEl.addEventListener('contextmenu', handleSecondaryContextMenu);
  document.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleKeydown);
  bus.on('secondary-bars:cleared', () => {
    clearSecondaryRangeSelection();
    clearSecondaryFibSelection();
    clearPointSetSelection({ silent: true, scope: 'secondary' });
    hideSecondaryContextMenu();
  });
  bus.on('secondary-chart:reset', () => {
    clearSecondaryRangeSelection();
    clearSecondaryFibSelection();
    clearPointSetSelection({ silent: true, scope: 'secondary' });
    hideSecondaryContextMenu();
  });
}
