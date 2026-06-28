import {
  TIMEFRAME_MAP,
} from '../../config.js';
import { getChartNotes } from '../../chart-notes/chart-note-store.js';
import { isChartNoteInDate } from '../../chart-notes/chart-note-visible-day.js';
import { compactUtcTime } from '../../utils.js';
import { escapeHtml } from './render-utils.js';

export const CHART_NOTES_SECTION_KEY = 'chartNotes';

function timeTextFromTimestamp(timestamp) {
  return compactUtcTime(timestamp, '—');
}

function getChartNoteTimeLabel(note) {
  if (note?.kind !== 'range') return timeTextFromTimestamp(note?.timestamp);
  return [
    timeTextFromTimestamp(note.startTimestamp || note.timestamp),
    timeTextFromTimestamp(note.endTimestamp || note.timestamp),
  ].join('-');
}

function getChartNotesForDate(dateKey, instrument = 'NQ') {
  return getChartNotes()
    .filter((note) => note.instrument === instrument)
    .filter((note) => isChartNoteInDate(note, dateKey))
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

export function renderChartNotesSection(review) {
  const notes = getChartNotesForDate(review.date, review.instrument || 'NQ');
  const canSelectObject = Boolean(review.pendingReasonRefPick);
  const rows = notes.map((note) => {
    const timeframe = TIMEFRAME_MAP[Number(note.timeframe)] || `${note.timeframe || '—'}M`;
    return `
      <div class="time-reaction-chart-note-row">
        <div class="time-reaction-chart-note-header">
          <div class="time-reaction-chart-note-meta">
            <span>${escapeHtml(getChartNoteTimeLabel(note))}</span>
            <span>${escapeHtml(timeframe)}</span>
            <label class="inspector-toggle time-reaction-chart-note-toggle">
              <input
                data-inspector-action="chart-note-toggle-guides"
                data-chart-note-id="${escapeHtml(note.id)}"
                type="checkbox"
                ${note.display?.showGuides ? 'checked' : ''}
              />
              <span>Guides</span>
            </label>
          </div>
          <details class="order-review-ref-menu chart-note-action-menu">
            <summary class="order-review-ref-menu-trigger" aria-label="Chart note actions">...</summary>
            <div class="order-review-ref-menu-panel">
              <button
                class="order-review-ref-menu-item"
                data-inspector-action="chart-note-locate"
                data-chart-note-id="${escapeHtml(note.id)}"
                type="button"
              >Locate</button>
              <button
                class="order-review-ref-menu-item"
                data-inspector-action="chart-note-edit-focus"
                data-chart-note-id="${escapeHtml(note.id)}"
                type="button"
              >Edit</button>
              ${
                canSelectObject
                  ? `<button
                      class="order-review-ref-menu-item"
                      data-inspector-action="chart-note-select-object"
                      data-chart-note-id="${escapeHtml(note.id)}"
                      type="button"
                    >Select Object</button>`
                  : ''
              }
              <button
                class="order-review-ref-menu-item danger"
                data-inspector-action="chart-note-delete"
                data-chart-note-id="${escapeHtml(note.id)}"
                type="button"
              >Delete</button>
            </div>
          </details>
        </div>
        <textarea
          class="inspector-textarea time-reaction-chart-note-edit"
          data-inspector-action="chart-note-edit"
          data-chart-note-id="${escapeHtml(note.id)}"
          rows="2"
        >${escapeHtml(note.text)}</textarea>
      </div>
    `;
  });
  return `
    <div class="time-reaction-subsection time-reaction-chart-notes">
      <div class="time-reaction-subsection-title">
        <span>Chart Notes</span>
        <span class="time-reaction-chart-note-count">${notes.length}</span>
      </div>
      <div class="time-reaction-chart-note-list">
        ${rows.join('') || '<div class="drawing-set-empty">No chart notes for this day.</div>'}
      </div>
    </div>
  `;
}
