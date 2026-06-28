import { formatReplayTime } from './replay-time-utils.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatHistoryTime(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return '--';
  const date = new Date(Number(timestamp) * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function formatHistoryDateRange(start, end) {
  const startDate = String(start || '').slice(0, 10);
  const endDate = String(end || '').slice(0, 10);
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return start || end || '--';
}

function renderHistoryPanel(history) {
  const rows = history.length
    ? history.map((item) => `
      <div class="replay-history-row" data-history-id="${escapeHtml(item.id)}">
        <div class="replay-history-summary">
          <div class="replay-history-title">${escapeHtml(item.label || formatHistoryTime(item.replay.cursorTimestamp))}</div>
          <div class="replay-history-meta">${escapeHtml(formatHistoryDateRange(item.primary.start, item.primary.end))}</div>
        </div>
        <button class="replay-history-action" data-action="history-load" type="button">Load</button>
        <button class="replay-history-action" data-action="history-delete" type="button">Delete</button>
      </div>
    `).join('')
    : '<div class="replay-history-empty">No replay history.</div>';

  return `
    <div class="replay-history-panel">
      <div class="replay-history-header">
        <span>Replay History</span>
        <button class="replay-history-clear" data-action="history-clear" type="button" ${history.length ? '' : 'disabled'}>Clear</button>
      </div>
      <div class="replay-history-list">${rows}</div>
    </div>
  `;
}

export function renderReplayControlsView({
  hasData,
  enabled,
  currentBar,
  cursorIndex,
  dataCount,
  isPlaying,
  tfLabel,
  mode,
  speedIndex,
  lastDisabled,
  historyOpen,
  history,
  speeds,
  replayDisabledOverride = null,
  closeDisabledOverride = null,
  toggleDisabledOverride = null,
  actionDisabled = {},
}) {
  const replayDisabled = replayDisabledOverride ?? (!hasData || !enabled);
  const closeDisabled = closeDisabledOverride ?? replayDisabled;
  const toggleDisabled = toggleDisabledOverride ?? !hasData;
  const historyPanel = historyOpen ? renderHistoryPanel(history) : '';

  return `
    <div class="replay-main">
      <button class="replay-btn replay-toggle ${enabled ? 'active' : ''}" data-action="toggle" ${toggleDisabled ? 'disabled' : ''}>
        Replay Bar ${enabled ? 'On' : 'Off'}
      </button>
      <span class="replay-divider"></span>
      <button class="replay-btn replay-action" data-action="first" title="回退到区间第一根K线" ${actionDisabled.first ?? replayDisabled ? 'disabled' : ''}>First</button>
      <button class="replay-btn replay-action" data-action="last" title="回到上次操作位置" ${actionDisabled.last ?? lastDisabled ? 'disabled' : ''}>Last Pos</button>
      <button class="replay-btn replay-action ${mode === 'picking' ? 'active' : ''}" data-action="pick" title="点击图表选择回退位置" ${actionDisabled.pick ?? replayDisabled ? 'disabled' : ''}>Pick</button>
      <button class="replay-btn replay-action" data-action="next-0929" title="跳转到下一日 09:29" ${actionDisabled.next0929 ?? replayDisabled ? 'disabled' : ''}>Next 09:29</button>
      <span class="replay-divider"></span>
      <button class="replay-icon-btn" data-action="back" title="上一根" ${actionDisabled.back ?? replayDisabled ? 'disabled' : ''}>&lt;</button>
      <button class="replay-icon-btn replay-play" data-action="play" title="${isPlaying ? '暂停' : '播放'}" ${actionDisabled.play ?? replayDisabled ? 'disabled' : ''}>
        ${isPlaying ? '||' : '▶'}
      </button>
      <button class="replay-icon-btn" data-action="forward" title="下一根" ${actionDisabled.forward ?? replayDisabled ? 'disabled' : ''}>&gt;</button>
      <span class="replay-divider"></span>
      <select class="replay-speed" ${replayDisabled ? 'disabled' : ''}>
        ${speeds.map(
          (s, i) => `<option value="${i}"${i === speedIndex ? ' selected' : ''}>${s.label}</option>`
        ).join('')}
      </select>
      <input
        class="replay-jump-input"
        data-replay-jump-input
        type="text"
        placeholder="YYYY-MM-DD HH:mm"
        title="跳转到指定时间"
        ${actionDisabled.jump ?? replayDisabled ? 'disabled' : ''}
      />
      <button class="replay-btn replay-jump-btn" data-action="jump" title="跳转到指定时间" ${actionDisabled.jump ?? replayDisabled ? 'disabled' : ''}>Go</button>
      <button class="replay-btn replay-history-toggle ${historyOpen ? 'active' : ''}" data-action="history-toggle" title="Replay History">History</button>
      <span class="replay-tf">${tfLabel}</span>
      <span class="replay-info">${enabled && currentBar ? `${cursorIndex + 1}/${dataCount} ${formatReplayTime(currentBar)}` : 'Replay Trading'}</span>
      <button class="replay-close" data-action="close" title="退出 Replay" ${closeDisabled ? 'disabled' : ''}>X</button>
    </div>
    ${historyPanel}
  `;
}
