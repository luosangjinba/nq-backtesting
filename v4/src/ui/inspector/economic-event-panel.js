import { getEconomicEventNote } from '../../economic-calendar/economic-event-note-store.js';
import { escapeHtml, field, section } from './render-utils.js';

function getImpactLabel(event = {}) {
  if (event.allDay || event.eventType === 'holiday') return 'Holiday';
  return event.impact || 'Event';
}

function getTimeLabel(event = {}) {
  return event.allDay ? 'All Day' : event.displayTime || event.locateTime || '—';
}

export function renderEconomicEventDetailPanel(event = {}) {
  const note = getEconomicEventNote(event.id)?.note || '';
  return section('Economic Event', `
    <div class="order-review-compact">
      <div class="order-review-compact-title">${escapeHtml(event.title || 'Economic Event')}</div>
      ${field('Date', event.eventDate || '—')}
      ${field('Time', getTimeLabel(event))}
      ${field('Impact', getImpactLabel(event))}
      ${field('Currency', event.currency || 'USD')}
    </div>
    <textarea
      class="inspector-textarea"
      data-inspector-action="economic-event-note"
      data-economic-event-id="${escapeHtml(event.id || '')}"
      rows="8"
      placeholder="Add note"
    >${escapeHtml(note)}</textarea>
  `);
}
