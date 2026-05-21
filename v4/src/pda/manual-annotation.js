// Manual PDA annotation entry points. The first pass supports BSL/SSL via chart context menu.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { addAnnotation, clearAnnotations } from './pda-store.js';
import { buildPointContexts, formatContextLabel } from './pda-context.js';
import { clearPdaContextDataCache, fetchTradingDaySourceBars } from './pda-context-data.js';
import { getPdaType } from './pda-types.js';

let controlsEl = null;
let contextMenuBar = null;

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
  const annotation = {
    id: `manual_${type}_${bar.timestamp}_${Date.now()}`,
    type,
    source: 'manual',
    anchorTime: getBarChartTime(bar),
    timestamp: bar.timestamp,
    barTime: bar.time,
    price,
    contexts,
  };

  addAnnotation(annotation);
  hideContextMenu();

  const contextLabel = formatContextLabel(contexts);
  bus.emit('status:update', {
    text: `${pdaType.label}: ${price.toFixed(2)} ${bar.tradingDay || bar.time}${
      contextLabel ? ` · ${contextLabel}` : ''
    }`,
    isError: false,
  });
}

function clampMenuPosition(x, y) {
  const rect = controlsEl.parentElement.getBoundingClientRect();
  const menuWidth = 150;
  const menuHeight = 112;
  return {
    x: Math.min(Math.max(4, x), rect.width - menuWidth - 4),
    y: Math.min(Math.max(4, y), rect.height - menuHeight - 4),
  };
}

function showContextMenu(x, y, bar) {
  if (!controlsEl) return;
  contextMenuBar = bar;
  const { x: left, y: top } = clampMenuPosition(x, y);
  const disabled = bar ? '' : 'disabled';
  const timeLabel = bar ? bar.tradingDay || bar.time : 'No bar';

  controlsEl.innerHTML = `
    <div class="pda-menu" style="left: ${left}px; top: ${top}px;">
      <div class="pda-menu-title">${timeLabel}</div>
      <button class="pda-menu-item" data-pda-action="bsl" ${disabled}>Mark BSL</button>
      <button class="pda-menu-item" data-pda-action="ssl" ${disabled}>Mark SSL</button>
      <div class="pda-menu-divider"></div>
      <button class="pda-menu-item" data-pda-action="clear">Clear PDA</button>
    </div>
  `;
}

function hideContextMenu() {
  contextMenuBar = null;
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
  showContextMenu(x, y, bar);
}

function handleControlClick(e) {
  const action = e.target.closest('[data-pda-action]')?.dataset.pdaAction;
  if (!action) return;
  e.stopPropagation();

  if (action === 'bsl' || action === 'ssl') {
    addManualPoint(action, contextMenuBar);
  } else if (action === 'clear') {
    clearAnnotations();
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
  bus.on('bars:loaded', hideContextMenu);
  bus.on('bars:cleared', () => {
    clearPdaContextDataCache();
    hideContextMenu();
  });
}
