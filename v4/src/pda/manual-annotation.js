// Manual PDA annotation entry points. The first pass supports BSL/SSL via chart context menu.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';
import { buildCePrice } from '../price-utils.js';
import { addAnnotation, clearAnnotations, getAnnotationById } from './pda-store.js';
import { buildPointContexts, formatContextLabel, getPointCanonicalTimestamp } from './pda-context.js';
import { clearPdaContextDataCache, fetchTradingDaySourceBars } from './pda-context-data.js';
import { identifyFvg } from './fvg-identifier.js';
import { validateManualSwing } from './pda-swing-validator.js';
import { getPdaType } from './pda-types.js';
import { hitTestPdaAnnotations } from './pda-hit-test.js';
import { toggleThisWeekNwog, toggleTodayNdog } from './objective-gaps.js';
import {
  cancelSegmentSelection,
  clearManualSegments,
  finishSegment,
  getSegmentSelectionSummary,
  startSegment,
} from '../segment/manual-segment.js';
import { getSelectedSegment } from '../segment/segment-selection.js';
import { linkPdaResponse } from '../segment/segment-store.js';
import {
  appendPointToPointSet,
  addPointSetPoint,
  cancelPointSet,
  clearPointSetSelection,
  finishPointSet,
  getPointSetSelectionSummary,
  startPointSet,
} from './point-set-annotation.js';
import { getSelectedPda } from './pda-selection.js';

let controlsEl = null;
let contextMenuBar = null;
let contextMenuPdaHit = null;
let obSelectionState = null;
let fibSelectionState = null;

const DEFAULT_FIB_LEVELS = [
  { value: 1, visible: true, color: '#60636f' },
  { value: 0.79, visible: true, color: '#00a6b4' },
  { value: 0.705, visible: true, color: '#ffa726' },
  { value: 0.62, visible: true, color: '#4caf50' },
  { value: 0.5, visible: true, color: '#ff4d5d' },
  { value: 0.236, visible: true, color: '#ab47bc' },
  { value: 0, visible: true, color: '#60636f' },
];

function normalizeTimeKey(time) {
  if (time && typeof time === 'object') {
    const month = String(time.month).padStart(2, '0');
    const day = String(time.day).padStart(2, '0');
    return `${time.year}-${month}-${day}`;
  }
  return time;
}

function getBarChartTime(bar) {
  return store.getCurrentTimeframe() === 1440 ? bar.tradingDay : bar.timestamp;
}

function findDisplayBar(time) {
  if (time === undefined || time === null) return null;
  const target = normalizeTimeKey(time);
  return (
    store
      .getDisplayBars()
      .find((bar) => normalizeTimeKey(getBarChartTime(bar)) === target) || null
  );
}

async function addManualPoint(type, bar) {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return;

  const timeframe = store.getCurrentTimeframe();
  let contextBars = store.getDisplayBars();
  try {
    contextBars = await fetchTradingDaySourceBars(bar.timestamp);
  } catch (err) {
    bus.emit('status:update', {
      text: `PDA 1M context source 加载失败，暂用当前显示区间: ${err.message}`,
      isError: true,
    });
  }

  const contexts = buildPointContexts(type, bar, timeframe, contextBars);
  const price = bar[pdaType.priceField];
  const canonicalTimestamp = getPointCanonicalTimestamp(type, bar, timeframe, contextBars);
  const validation = validateManualSwing(type, bar, timeframe, store.getDisplayBars());
  const annotation = {
    id: `manual_${type}_${canonicalTimestamp}_${Date.now()}`,
    type,
    source: 'manual',
    anchorTime: getBarChartTime(bar),
    canonicalTimestamp,
    timestamp: bar.timestamp,
    barTime: bar.time,
    price,
    contexts,
    validation,
  };

  addAnnotation(annotation);
  hideContextMenu();

  const contextLabel = formatContextLabel(contexts);
  const validationPrefix =
    validation.checked && !validation.valid ? `Warning: ${validation.message}; marked anyway. ` : '';
  bus.emit('status:update', {
    text: `${validationPrefix}${pdaType.label}: ${price.toFixed(2)} ${bar.tradingDay || bar.time}${
      contextLabel ? ` · ${contextLabel}` : ''
    }`,
    isError: validation.checked && !validation.valid,
  });
}

function getFvgColors(direction) {
  return direction === 'bullish'
    ? { fillColor: '#26a69a33', borderColor: 'transparent', midlineColor: '#26a69a', textColor: '#b2dfdb' }
    : { fillColor: '#ef535033', borderColor: 'transparent', midlineColor: '#ef5350', textColor: '#ffcdd2' };
}

function addManualFvg(bar) {
  const pdaType = getPdaType('fvg');
  if (!pdaType || !bar) return;

  const result = identifyFvg(store.getDisplayBars(), bar);
  if (!result) {
    hideContextMenu();
    bus.emit('status:update', { text: '未识别到 FVG 结构', isError: true });
    return;
  }

  const tfLabel = timeframeToString(store.getCurrentTimeframe());
  const contexts = [`${tfLabel} FVG`];
  const colors = getFvgColors(result.direction);
  const annotation = {
    id: `manual_fvg_${result.anchorBar.timestamp}_${Date.now()}`,
    type: 'fvg',
    source: 'manual',
    direction: result.direction,
    anchorTime: getBarChartTime(result.anchorBar),
    canonicalTimestamp: result.anchorBar.timestamp,
    timestamp: result.anchorBar.timestamp,
    barTime: result.anchorBar.time,
    startTime: getBarChartTime(result.startBar),
    endTime: getBarChartTime(result.endBar),
    topPrice: result.topPrice,
    bottomPrice: result.bottomPrice,
    ce: buildCePrice(result.topPrice, result.bottomPrice),
    contexts,
    ...colors,
  };

  addAnnotation(annotation);
  hideContextMenu();

  bus.emit('status:update', {
    text: `${pdaType.label}: ${result.direction} ${result.bottomPrice.toFixed(2)}-${result.topPrice.toFixed(2)} ${result.anchorBar.tradingDay || result.anchorBar.time}`,
    isError: false,
  });
}

function getObColors(direction) {
  return direction === 'bullish'
    ? { fillColor: '#26a69a24', borderColor: 'transparent', textColor: '#ffcc80' }
    : { fillColor: '#ef535024', borderColor: 'transparent', textColor: '#ffcc80' };
}

function getDisplayBarIndex(bar) {
  if (!bar) return -1;
  return store.getDisplayBars().findIndex((candidate) => candidate.timestamp === bar.timestamp);
}

function getSelectedRangeBars(startBar, endBar) {
  const displayBars = store.getDisplayBars();
  const startIndex = getDisplayBarIndex(startBar);
  const endIndex = getDisplayBarIndex(endBar);

  if (startIndex < 0 || endIndex < 0) return [];

  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return displayBars.slice(from, to + 1);
}

function startManualOb(direction, bar) {
  if (!bar) return;

  fibSelectionState = null;
  obSelectionState = {
    direction,
    startBar: bar,
  };

  hideContextMenu();
  bus.emit('status:update', {
    text: `${direction} OB 起点已选择，Shift + 右键选择终点`,
    isError: false,
  });
}

function addManualOb(endBar) {
  if (!obSelectionState || !endBar) return;

  const rangeBars = getSelectedRangeBars(obSelectionState.startBar, endBar);
  if (!rangeBars.length) {
    obSelectionState = null;
    hideContextMenu();
    bus.emit('status:update', { text: 'OB 区间选择失败：未找到 K 线', isError: true });
    return;
  }

  const timeframe = store.getCurrentTimeframe();
  const tfLabel = timeframeToString(timeframe);
  const direction = obSelectionState.direction;
  const startBar = rangeBars[0];
  const lastBar = rangeBars[rangeBars.length - 1];
  const topPrice = Math.max(...rangeBars.map((bar) => bar.high));
  const bottomPrice = Math.min(...rangeBars.map((bar) => bar.low));
  const contexts = [`${tfLabel} ${direction} OB`];
  const annotation = {
    id: `manual_ob_${startBar.timestamp}_${lastBar.timestamp}_${Date.now()}`,
    type: 'ob',
    source: 'manual',
    direction,
    anchorTime: getBarChartTime(startBar),
    canonicalTimestamp: startBar.timestamp,
    timestamp: startBar.timestamp,
    barTime: startBar.time,
    startTime: getBarChartTime(startBar),
    endTime: getBarChartTime(lastBar),
    startTimeTimestamp: startBar.timestamp,
    endTimeTimestamp: lastBar.timestamp,
    topPrice,
    bottomPrice,
    priceHigh: topPrice,
    priceLow: bottomPrice,
    ce: buildCePrice(topPrice, bottomPrice),
    contexts,
    ...getObColors(direction),
  };

  addAnnotation(annotation);
  obSelectionState = null;
  hideContextMenu();

  bus.emit('status:update', {
    text: `OB: ${direction} ${bottomPrice.toFixed(2)}-${topPrice.toFixed(2)} (${rangeBars.length}根${tfLabel})`,
    isError: false,
  });
}

function startManualFib(bar) {
  if (!bar) return;

  obSelectionState = null;
  fibSelectionState = { startBar: bar };
  hideContextMenu();
  bus.emit('status:update', {
    text: 'Fib 起点已选择，Shift + 右键选择终点',
    isError: false,
  });
}

function addManualFib(endBar) {
  if (!fibSelectionState || !endBar) return;

  const startBar = fibSelectionState.startBar;
  const bullishMove = Math.abs(Number(endBar.high) - Number(startBar.low));
  const bearishMove = Math.abs(Number(startBar.high) - Number(endBar.low));
  const direction = bullishMove >= bearishMove ? 'bullish' : 'bearish';
  const startPrice = direction === 'bullish' ? Number(startBar.low) : Number(startBar.high);
  const endPrice = direction === 'bullish' ? Number(endBar.high) : Number(endBar.low);
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice) || startBar.timestamp === endBar.timestamp) {
    fibSelectionState = null;
    hideContextMenu();
    bus.emit('status:update', { text: 'Fib 选择失败：起点/终点无效', isError: true });
    return;
  }

  const tfLabel = timeframeToString(store.getCurrentTimeframe());
  const annotation = {
    id: `manual_fib_${startBar.timestamp}_${endBar.timestamp}_${Date.now()}`,
    type: 'fib',
    source: 'manual',
    direction,
    anchorTime: getBarChartTime(startBar),
    canonicalTimestamp: startBar.timestamp,
    timestamp: startBar.timestamp,
    barTime: startBar.time,
    startTime: getBarChartTime(startBar),
    endTime: getBarChartTime(endBar),
    startTimeTimestamp: startBar.timestamp,
    endTimeTimestamp: endBar.timestamp,
    start: {
      time: getBarChartTime(startBar),
      timestamp: startBar.timestamp,
      price: startPrice,
      kind: direction === 'bullish' ? 'low' : 'high',
    },
    end: {
      time: getBarChartTime(endBar),
      timestamp: endBar.timestamp,
      price: endPrice,
      kind: direction === 'bullish' ? 'high' : 'low',
    },
    levels: DEFAULT_FIB_LEVELS.map((level) => ({ ...level })),
    display: {
      showLabels: true,
      showTrendLine: false,
      extend: 'none',
    },
    contexts: [`${tfLabel} ${direction} Fib`],
  };

  addAnnotation(annotation);
  fibSelectionState = null;
  hideContextMenu();

  bus.emit('status:update', {
    text: `Fib: ${direction} ${startPrice.toFixed(2)} → ${endPrice.toFixed(2)}`,
    isError: false,
  });
}

function clampMenuPosition(x, y) {
  const rect = controlsEl.parentElement.getBoundingClientRect();
  const menuWidth = 170;
  const menuHeight = 520;
  return {
    x: Math.min(Math.max(4, x), rect.width - menuWidth - 4),
    y: Math.min(Math.max(4, y), rect.height - menuHeight - 4),
  };
}

function getPdaLabel(annotation) {
  if (!annotation) return 'PDA';
  return getPdaType(annotation.type)?.label || annotation.type?.toUpperCase() || 'PDA';
}

function getSegmentPdaLinkItems(pdaHit) {
  const selectedSegment = getSelectedSegment();
  if (!selectedSegment || !pdaHit) return '';

  const annotation = getAnnotationById(pdaHit.id);
  const pdaLabel = getPdaLabel(annotation);
  return `
    <div class="pda-menu-title">Link ${pdaLabel} to selected segment</div>
    <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="respected">Respected</button>
    <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="swept">Swept</button>
    <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="approached">Approached</button>
    <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="rejected">Rejected</button>
    <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="delivered-through">Delivered Through</button>
    <div class="pda-menu-divider"></div>
  `;
}

function showContextMenu(x, y, bar, pdaHit = null) {
  if (!controlsEl) return;
  contextMenuBar = bar;
  contextMenuPdaHit = pdaHit;
  const { x: left, y: top } = clampMenuPosition(x, y);
  const disabled = bar ? '' : 'disabled';
  const timeLabel = bar ? bar.tradingDay || bar.time : 'No bar';
  const activeSet = getPointSetSelectionSummary();
  const activeSegment = getSegmentSelectionSummary();
  const selected = getSelectedPda();
  const selectedAnnotation = selected ? getAnnotationById(selected.id) : null;
  const selectedPdaType = selectedAnnotation ? getPdaType(selectedAnnotation.type) : null;
  const segmentPdaLinkItems = getSegmentPdaLinkItems(pdaHit);
  const selectedSetItem =
    !activeSet && selectedPdaType?.pointSet
      ? `<button class="pda-menu-item" data-pda-action="selected-pointset-add" ${disabled}>Add to Selected ${selectedPdaType.label}</button>`
      : '';
  const pointSetItems = activeSet
    ? `
      <div class="pda-menu-title">${activeSet.label} set · ${activeSet.count} point${activeSet.count === 1 ? '' : 's'}</div>
      <button class="pda-menu-item" data-pda-action="pointset-add" ${disabled}>Add ${activeSet.label} Point</button>
      <button class="pda-menu-item" data-pda-action="pointset-finish">Finish ${activeSet.label}</button>
      <button class="pda-menu-item" data-pda-action="pointset-cancel">Cancel Set</button>
      <div class="pda-menu-divider"></div>
    `
    : `
      ${selectedSetItem}
      <button class="pda-menu-item" data-pda-action="eqh-start" ${disabled}>Start EQH Set</button>
      <button class="pda-menu-item" data-pda-action="eql-start" ${disabled}>Start EQL Set</button>
      <div class="pda-menu-divider"></div>
    `;
  const segmentItems = activeSegment
    ? `
      <div class="pda-menu-title">${activeSegment.label} · from ${activeSegment.startTime}</div>
      <button class="pda-menu-item" data-pda-action="segment-finish" ${disabled}>End 1H Segment</button>
      <button class="pda-menu-item" data-pda-action="segment-cancel">Cancel 1H Segment</button>
      <div class="pda-menu-divider"></div>
    `
    : `
      <button class="pda-menu-item" data-pda-action="segment-start" ${disabled}>Start 1H Segment</button>
      <button class="pda-menu-item" data-pda-action="segment-clear">Clear 1H Segments</button>
      <div class="pda-menu-divider"></div>
    `;

  controlsEl.innerHTML = `
    <div class="pda-menu" style="left: ${left}px; top: ${top}px;">
      <div class="pda-menu-title">${timeLabel}</div>
      <button class="pda-menu-item" data-pda-action="bsl" ${disabled}>Mark BSL</button>
      <button class="pda-menu-item" data-pda-action="ssl" ${disabled}>Mark SSL</button>
      <button class="pda-menu-item" data-pda-action="fvg" ${disabled}>Mark FVG</button>
      <button class="pda-menu-item" data-pda-action="ob-bullish" ${disabled}>Mark Bullish OB</button>
      <button class="pda-menu-item" data-pda-action="ob-bearish" ${disabled}>Mark Bearish OB</button>
      <button class="pda-menu-item" data-pda-action="fib-start" ${disabled}>Start Fib</button>
      <div class="pda-menu-divider"></div>
      ${segmentPdaLinkItems}
      ${segmentItems}
      ${pointSetItems}
      <button class="pda-menu-item" data-pda-action="toggle-ndog" ${disabled}>Show/Hide Today NDOG</button>
      <button class="pda-menu-item" data-pda-action="toggle-nwog" ${disabled}>Show/Hide This Week NWOG</button>
      <div class="pda-menu-divider"></div>
      <button class="pda-menu-item" data-pda-action="clear">Clear PDA</button>
    </div>
  `;
}

function hideContextMenu() {
  contextMenuBar = null;
  contextMenuPdaHit = null;
  if (controlsEl) {
    controlsEl.innerHTML = '';
  }
}

function handleContextMenu(e) {
  if (e.target.closest('#viewport-controls') || e.target.closest('.pda-menu')) return;

  e.preventDefault();
  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  const rect = chartEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const time = chart.coordinateToTime(x);
  const bar = findDisplayBar(time);
  const price = chart.coordinateToPrice(y);
  const pdaHit = hitTestPdaAnnotations({ x, y, time, price });

  if (e.shiftKey && fibSelectionState) {
    addManualFib(bar);
    return;
  }

  if (e.shiftKey && obSelectionState) {
    addManualOb(bar);
    return;
  }

  showContextMenu(x, y, bar, pdaHit);
}

function handleControlClick(e) {
  const action = e.target.closest('[data-pda-action]')?.dataset.pdaAction;
  if (!action) return;
  e.stopPropagation();

  if (action === 'bsl' || action === 'ssl') {
    addManualPoint(action, contextMenuBar);
  } else if (action === 'fvg') {
    addManualFvg(contextMenuBar);
  } else if (action === 'ob-bullish' || action === 'ob-bearish') {
    startManualOb(action === 'ob-bullish' ? 'bullish' : 'bearish', contextMenuBar);
  } else if (action === 'fib-start') {
    startManualFib(contextMenuBar);
  } else if (action === 'eqh-start' || action === 'eql-start') {
    startPointSet(action === 'eqh-start' ? 'eqh' : 'eql', contextMenuBar, getBarChartTime);
    hideContextMenu();
  } else if (action === 'pointset-add') {
    addPointSetPoint(contextMenuBar, getBarChartTime);
    hideContextMenu();
  } else if (action === 'pointset-finish') {
    finishPointSet();
    hideContextMenu();
  } else if (action === 'pointset-cancel') {
    cancelPointSet();
    hideContextMenu();
  } else if (action === 'selected-pointset-add') {
    const selected = getSelectedPda();
    if (selected) appendPointToPointSet(selected.id, contextMenuBar, getBarChartTime);
    hideContextMenu();
  } else if (action === 'segment-start') {
    startSegment(contextMenuBar);
    hideContextMenu();
  } else if (action === 'segment-finish') {
    finishSegment(contextMenuBar);
    hideContextMenu();
  } else if (action === 'segment-cancel') {
    cancelSegmentSelection();
    hideContextMenu();
  } else if (action === 'segment-clear') {
    clearManualSegments();
    hideContextMenu();
  } else if (action === 'segment-link-pda') {
    const selectedSegment = getSelectedSegment();
    const annotation = contextMenuPdaHit ? getAnnotationById(contextMenuPdaHit.id) : null;
    const relation = e.target.closest('[data-relation]')?.dataset.relation;
    if (selectedSegment && annotation && relation) {
      linkPdaResponse(selectedSegment.id, {
        pdaId: annotation.id,
        pdaType: annotation.type,
        relation,
      });
      bus.emit('status:update', {
        text: `${getPdaLabel(annotation)} linked to selected segment as ${relation}`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'toggle-ndog') {
    toggleTodayNdog(contextMenuBar);
    hideContextMenu();
  } else if (action === 'toggle-nwog') {
    toggleThisWeekNwog(contextMenuBar);
    hideContextMenu();
  } else if (action === 'clear') {
    clearAnnotations();
    obSelectionState = null;
    fibSelectionState = null;
    clearPointSetSelection({ silent: true });
    hideContextMenu();
    bus.emit('status:update', { text: 'PDA 标注已清除', isError: false });
  }
}

function handleGlobalClick(e) {
  if (!e.target.closest('.pda-menu')) {
    hideContextMenu();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (obSelectionState) {
      obSelectionState = null;
      bus.emit('status:update', { text: 'OB 选择已取消', isError: false });
    } else if (fibSelectionState) {
      fibSelectionState = null;
      bus.emit('status:update', { text: 'Fib 选择已取消', isError: false });
    } else if (getPointSetSelectionSummary()) {
      clearPointSetSelection();
    } else if (getSegmentSelectionSummary()) {
      cancelSegmentSelection();
    }
    hideContextMenu();
  }
}

export function initManualAnnotation() {
  controlsEl = document.getElementById('pda-context-menu');
  if (!controlsEl) return;

  controlsEl.addEventListener('click', handleControlClick);
  document.getElementById('chart')?.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleKeydown);
  bus.on('bars:loaded', () => {
    obSelectionState = null;
    fibSelectionState = null;
    clearPointSetSelection({ silent: true });
    hideContextMenu();
  });
  bus.on('bars:cleared', () => {
    obSelectionState = null;
    fibSelectionState = null;
    clearPointSetSelection({ silent: true });
    clearPdaContextDataCache();
    hideContextMenu();
  });
}
