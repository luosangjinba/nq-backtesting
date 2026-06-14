import * as bus from '../event-bus.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { recordHistory } from '../history/history-manager.js';
import { createLiveRecordFromAnchor } from './live-record-active.js';

export const LIVE_RECORD_CHART_ACTIONS = Object.freeze({
  NEW_HERE: 'live-record-new-here',
});

function getAnchorPrice(bar = {}, fallbackPrice = null) {
  const price = Number(fallbackPrice);
  if (Number.isFinite(price)) return price;
  const close = Number(bar.close);
  return Number.isFinite(close) ? close : null;
}

export function renderLiveRecordMenuItems({ bar } = {}) {
  const disabled = bar ? '' : 'disabled';
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Live Records</div>
      <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.NEW_HERE}" ${disabled}>New Live Record Here</button>
      </div>
    </div>
  `;
}

export function handleLiveRecordChartAction(action, {
  bar = null,
  price = null,
  timeframe = '',
} = {}) {
  if (action !== LIVE_RECORD_CHART_ACTIONS.NEW_HERE) return false;
  if (!bar || !Number.isFinite(Number(bar.timestamp))) {
    bus.emit('status:update', { text: 'Cannot create Live Record: no chart bar selected', isError: true });
    return true;
  }
  const anchorPrice = getAnchorPrice(bar, price);
  const created = recordHistory('Create Live Record', () => createLiveRecordFromAnchor({
    timestamp: Number(bar.timestamp),
    timeframe,
    price: anchorPrice,
  }, {
    instrument: getPrimaryInstrument(),
    summary: '',
  }));
  bus.emit('status:update', {
    text: created?.id ? `Live Record created: ${created.id}` : 'Live Record creation failed',
    isError: !created?.id,
  });
  return true;
}
