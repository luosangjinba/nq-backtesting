// Secondary chart context menu MVP. Step 120 keeps it read-only; PDA writes are
// enabled later through explicit secondary chart actions.

import * as bus from '../event-bus.js';
import { getSecondaryChartContext } from '../chart/chart-context.js';
import * as secondaryChart from '../chart/secondary-chart-manager.js';
import { timeframeToString } from '../config.js';
import { recordHistory } from '../history/history-manager.js';
import { clampMenuPosition } from './manual-context-menu.js';
import {
  addManualPoint,
  findDisplayBarInContext,
  getBarChartTime,
} from './manual-pda-actions.js';
import {
  finishSegmentInContext,
  startSegmentInContext,
} from '../segment/manual-segment.js';

let controlsEl = null;
let contextMenuBar = null;
let contextMenuPrice = null;

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
        <button class="pda-menu-item" data-secondary-action="secondary-pda-fvg" disabled>Mark FVG</button>
        <button class="pda-menu-item" data-secondary-action="secondary-pda-range" disabled>Mark Range PDA</button>
        </div>
      </div>
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Navigation</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-secondary-action="secondary-show-cursor" ${disabled}>Show Cursor Here</button>
        <button class="pda-menu-item" data-secondary-action="secondary-copy-time" ${disabled}>Copy Secondary Time</button>
        <button class="pda-menu-item" data-secondary-action="secondary-copy-price" ${priceDisabled}>Copy Price ${escapeHtml(priceLabel)}</button>
        </div>
      </div>
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
  } else if (action === 'secondary-show-cursor') {
    if (contextMenuBar) {
      secondaryChart.showSecondaryHoverCursor(getBarChartTime(getSecondaryChartContext(), contextMenuBar));
      bus.emit('status:update', { text: `副图 cursor: ${formatContextTime(contextMenuBar)}`, isError: false });
    }
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
  if (e.key === 'Escape') hideSecondaryContextMenu();
}

export function initSecondaryContextMenu() {
  controlsEl = document.getElementById('secondary-context-menu');
  const chartEl = document.getElementById('secondary-chart');
  if (!controlsEl || !chartEl) return;

  controlsEl.addEventListener('click', handleSecondaryMenuClick);
  chartEl.addEventListener('contextmenu', handleSecondaryContextMenu);
  document.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleKeydown);
  bus.on('secondary-bars:cleared', hideSecondaryContextMenu);
  bus.on('secondary-chart:reset', hideSecondaryContextMenu);
}
