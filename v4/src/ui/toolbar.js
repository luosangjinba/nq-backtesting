// 工具栏 UI — 时间输入、周期选择、加载按钮、状态文本

import * as bus from '../event-bus.js';
import { DEFAULT_TIMEFRAME, TIMEFRAME_MAP } from '../config.js';
import { fetchBars } from '../api.js';
import * as store from '../data/bar-store.js';
import { formatTimeInput } from '../utils.js';

export function initToolbar() {
  const container = document.getElementById('toolbar');

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
    <div class="status-bar">
      <span id="statusText">就绪</span>
    </div>
  `;

  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  const tfSelect = document.getElementById('tfSelect');
  const loadBtn = document.getElementById('loadBtn');

  loadBtn.addEventListener('click', handleLoad);
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

  // 监听状态更新
  bus.on('status:update', ({ text, isError }) => {
    const el = document.getElementById('statusText');
    if (el) {
      el.textContent = text;
      el.style.color = isError ? '#ef5350' : '#b2b5be';
    }
  });
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
