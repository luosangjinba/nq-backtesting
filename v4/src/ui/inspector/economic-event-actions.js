import * as bus from '../../event-bus.js';
import { updateEconomicEventNote } from '../../economic-calendar/economic-event-note-store.js';

export function createEconomicEventActionController({
  recordInspectorHistory,
} = {}) {
  function handleChange(action, targetEl) {
    if (action !== 'economic-event-note') return false;
    const eventId = targetEl.dataset.economicEventId || '';
    const updated = recordInspectorHistory?.('Update Economic Event Note', () =>
      updateEconomicEventNote(eventId, { note: targetEl.value })
    );
    bus.emit('status:update', {
      text: updated ? 'Economic event note updated' : 'Economic event note update failed',
      isError: !updated,
    });
    return true;
  }

  return { handleChange };
}
