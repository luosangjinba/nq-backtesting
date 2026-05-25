// 工具栏 UI — 时间输入、周期选择、加载按钮、状态文本

import * as bus from '../event-bus.js';
import { DEFAULT_TIMEFRAME, TIMEFRAME_MAP } from '../config.js';
import { fetchBars } from '../api.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { formatTimeInput } from '../utils.js';
import { getDisplayMode, updateDisplayMode } from '../display/display-mode.js';

function renderSecondaryTimeframeOptions(selectedTimeframe) {
  return Object.entries(TIMEFRAME_MAP)
    .map(
      ([value, label]) =>
        `<option value="${value}"${Number(value) === Number(selectedTimeframe) ? ' selected' : ''}>${label}</option>`
    )
    .join('\n        ');
}

function renderSplitScreenControls() {
  const enabled = secondaryStore.isSecondaryEnabled();
  const timeframe = secondaryStore.getSecondaryTimeframe();
  const layout = secondaryStore.getSplitLayout();
  return `
    <div class="toolbar-separator"></div>
    <label class="toolbar-toggle" title="Show readonly secondary chart">
      <input id="splitScreenToggle" type="checkbox"${enabled ? ' checked' : ''} />
      <span>Split</span>
    </label>
    <div class="toolbar-group">
      <span class="toolbar-label">Sub TF:</span>
      <select id="secondaryTfSelect" class="toolbar-select" title="Secondary chart timeframe" ${enabled ? '' : 'disabled'}>
        ${renderSecondaryTimeframeOptions(timeframe)}
      </select>
    </div>
    <div class="toolbar-group">
      <span class="toolbar-label">Layout:</span>
      <select id="splitLayoutSelect" class="toolbar-select toolbar-layout-select" title="Split screen layout" ${enabled ? '' : 'disabled'}>
        <option value="stack"${layout === 'stack' ? ' selected' : ''}>Stack</option>
        <option value="side"${layout === 'side' ? ' selected' : ''}>Side</option>
      </select>
    </div>
  `;
}

function renderDisplayControls(displayMode) {
  return `
    <div class="toolbar-separator"></div>
    <div class="toolbar-group">
      <span class="toolbar-label">Display:</span>
      <select id="displayModeSelect" class="toolbar-select toolbar-display-select" title="Chart display mode">
        <option value="all"${displayMode.mode === 'all' ? ' selected' : ''}>All</option>
        <option value="selected-pda"${displayMode.mode === 'selected-pda' ? ' selected' : ''}>Selected PDA</option>
        <option value="recent-workspace"${displayMode.mode === 'recent-workspace' ? ' selected' : ''}>Recent Workspace</option>
      </select>
    </div>
    <div class="toolbar-group">
      <span class="toolbar-label">N:</span>
      <input id="displayRecentCountInput" class="toolbar-input toolbar-number-input" type="number" min="1" max="50" step="1" value="${displayMode.recentCount}" title="Recent segment/composite count" />
    </div>
  `;
}

export function initToolbar() {
  const container = document.getElementById('toolbar');
  const displayMode = getDisplayMode();

  container.innerHTML = `
    <div class="toolbar-group">
      <span class="toolbar-label">开始:</span>
      <input type="text" id="startInput" class="toolbar-input" placeholder="2025-01-02 09:30" />
    </div>
    <div class="toolbar-group">
      <span class="toolbar-label">结束:</span>
      <input type="text" id="endInput" class="toolbar-input" placeholder="2025-01-02 16:00" />
    </div>
    <div class="toolbar-group">
      <span class="toolbar-label">周期:</span>
      <select id="tfSelect" class="toolbar-select">
        ${Object.entries(TIMEFRAME_MAP)
          .map(
            ([v, l]) =>
              `<option value="${v}"${parseInt(v) === DEFAULT_TIMEFRAME ? ' selected' : ''}>${l}</option>`
          )
          .join('\n        ')}
      </select>
    </div>
    <button id="loadBtn" class="toolbar-btn">加载</button>
    <button id="archiveBtn" class="toolbar-btn" type="button">Archive</button>
    ${renderSplitScreenControls()}
    ${renderDisplayControls(displayMode)}
    <div class="status-bar">
      <span id="statusText">就绪</span>
    </div>
  `;

  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  const tfSelect = document.getElementById('tfSelect');
  const loadBtn = document.getElementById('loadBtn');
  const archiveBtn = document.getElementById('archiveBtn');
  const splitScreenToggle = document.getElementById('splitScreenToggle');
  const secondaryTfSelect = document.getElementById('secondaryTfSelect');
  const splitLayoutSelect = document.getElementById('splitLayoutSelect');
  const displayModeSelect = document.getElementById('displayModeSelect');
  const displayRecentCountInput = document.getElementById('displayRecentCountInput');

  syncSplitScreenLayout();
  loadBtn.addEventListener('click', handleLoad);
  archiveBtn.addEventListener('click', () => {
    bus.emit('inspector:open-archive');
  });
  startInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLoad();
  });
  endInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLoad();
  });

  // 失焦自动格式化时间输入
  [startInput, endInput].forEach((input) => {
    input.addEventListener('blur', (e) => {
      const formatted = formatTimeInput(e.target.value);
      if (formatted !== e.target.value) {
        e.target.value = formatted;
      }
    });
  });

  // 周期切换时自动重新加载
  tfSelect.addEventListener('change', () => {
    if (store.getBars().length > 0) {
      handleLoad();
    }
  });

  displayModeSelect.addEventListener('change', (e) => {
    updateDisplayMode({ mode: e.target.value });
  });
  displayRecentCountInput.addEventListener('change', (e) => {
    updateDisplayMode({ recentCount: e.target.value });
    e.target.value = getDisplayMode().recentCount;
  });

  splitScreenToggle.addEventListener('change', (e) => {
    secondaryStore.setSecondaryEnabled(e.target.checked);
    syncSplitScreenLayout();
  });
  secondaryTfSelect.addEventListener('change', (e) => {
    secondaryStore.setSecondaryTimeframe(e.target.value);
    syncSplitScreenLayout();
  });
  splitLayoutSelect.addEventListener('change', (e) => {
    secondaryStore.setSplitLayout(e.target.value);
    syncSplitScreenLayout();
  });

  // 监听状态更新
  bus.on('status:update', ({ text, isError }) => {
    const el = document.getElementById('statusText');
    if (el) {
      el.textContent = text;
      el.style.color = isError ? '#ef5350' : '#b2b5be';
    }
  });
}

function syncSplitScreenLayout() {
  const enabled = secondaryStore.isSecondaryEnabled();
  const chartArea = document.getElementById('chart-area');
  const secondaryPanel = document.getElementById('secondary-chart-panel');
  const secondaryTfSelect = document.getElementById('secondaryTfSelect');
  const splitLayoutSelect = document.getElementById('splitLayoutSelect');
  const layout = secondaryStore.getSplitLayout();

  chartArea?.classList.toggle('split-screen-enabled', enabled);
  chartArea?.classList.toggle('split-screen-side', enabled && layout === 'side');
  chartArea?.classList.toggle('split-screen-stack', enabled && layout === 'stack');
  if (secondaryPanel) {
    secondaryPanel.hidden = !enabled;
  }
  if (secondaryTfSelect) {
    secondaryTfSelect.disabled = !enabled;
    secondaryTfSelect.value = String(secondaryStore.getSecondaryTimeframe());
  }
  if (splitLayoutSelect) {
    splitLayoutSelect.disabled = !enabled;
    splitLayoutSelect.value = layout;
  }
}

async function handleLoad() {
  const startEl = document.getElementById('startInput');
  const endEl = document.getElementById('endInput');
  startEl.value = formatTimeInput(startEl.value.trim());
  endEl.value = formatTimeInput(endEl.value.trim());
  const start = startEl.value;
  const end = endEl.value;
  const tf = parseInt(document.getElementById('tfSelect').value);

  if (!start || !end) {
    bus.emit('status:update', { text: '请输入开始和结束时间', isError: true });
    return;
  }

  bus.emit('status:update', { text: '加载中...', isError: false });

  try {
    const result = await fetchBars(start, end, tf);
    store.setBars(result.bars, start, end, tf, result.requestedRange);
    bus.emit('status:update', { text: `已加载 ${result.bars.length} 根K线`, isError: false });
  } catch (err) {
    bus.emit('status:update', { text: `加载失败: ${err.message}`, isError: true });
  }
}
