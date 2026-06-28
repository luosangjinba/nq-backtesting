import {
  getLiveRecordAllowedNextStatuses,
  getLiveRecordStatusLabel,
  needsLiveRecordReview,
} from '../../live-record/live-record-lifecycle.js';
import {
  escapeHtml,
  formatDateTimeMs,
  formatTime,
} from './render-utils.js';

export function formatDirection(direction) {
  if (direction === 'long') return 'Long';
  if (direction === 'short') return 'Short';
  return 'Unknown';
}

function getLifecycleActionLabel(status) {
  if (status === 'active') return 'Reopen';
  if (status === 'cancelled') return 'Cancel';
  if (status === 'closed') return 'Close';
  if (status === 'reviewed') return 'Mark Reviewed';
  return getLiveRecordStatusLabel(status);
}

function renderLifecycleControls(record) {
  const nextStatuses = getLiveRecordAllowedNextStatuses(record.status);
  if (!nextStatuses.length) return '';
  return `
    <div class="order-review-actions order-review-compact-actions">
      ${nextStatuses.map((status) => (
        `<button
          class="inspector-secondary"
          data-inspector-action="live-record-status"
          data-live-record-id="${escapeHtml(record.id)}"
          data-live-record-status="${escapeHtml(status)}"
          type="button"
        >${escapeHtml(getLifecycleActionLabel(status))}</button>`
      )).join('')}
    </div>
  `;
}

export function renderActiveHeader(record, liveSet) {
  const anchor = liveSet?.anchor || {};
  const state = record.display?.hidden ? 'Hidden' : 'Visible';
  const title = [
    formatDirection(liveSet?.direction),
    formatTime(anchor.timestamp),
    anchor.timeframe || '—',
  ].filter(Boolean).join(' · ');

  return `
    <div class="inspector-evidence-row order-review-row active">
      <div class="inspector-evidence-header">
        <span>${escapeHtml(title)}</span>
        <span>${escapeHtml(record.instrument || liveSet?.instrument || 'NQ')} · ${escapeHtml(getLiveRecordStatusLabel(record.status))}</span>
      </div>
      <div class="drawing-set-meta">${escapeHtml([
        needsLiveRecordReview(record) ? 'Needs Review' : 'Live Record',
        state,
        `Updated ${formatDateTimeMs(record.updatedAt)}`,
      ].join(' · '))}</div>
      ${renderLifecycleControls(record)}
    </div>
  `;
}
