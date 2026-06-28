import { setValue, value } from './output-panel.js';

export function getEasternParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
}

export function formatEasternDateTimeInput(date) {
  const parts = getEasternParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`;
}

export function parseDateInput(dateText) {
  const match = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function formatDateInputFromUtc(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function addDateInputDays(dateText, days) {
  const date = parseDateInput(dateText);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateInputFromUtc(date);
}

export function setEndToNow() {
  setValue('end', formatEasternDateTimeInput(new Date()));
}

export function setEndToSessionClose() {
  const parts = getEasternParts(new Date());
  setValue('end', `${parts.year}-${parts.month}-${parts.day}T17:00:00`);
}

export function refreshPayload(action) {
  return {
    action,
    instrument: value('refreshInstrument'),
    start: value('start'),
    end: value('end'),
    chunkDays: value('chunkDays'),
    confirmText: value('confirmText'),
  };
}

export function initRefreshRangePanel({ run }) {
  document.getElementById('endNow').addEventListener('click', setEndToNow);
  document.getElementById('endSessionClose').addEventListener('click', setEndToSessionClose);
  document.getElementById('preflight').addEventListener('click', () => run(refreshPayload('preflight')));
  document.getElementById('dryRun').addEventListener('click', () => run(refreshPayload('dry_run')));
  document.getElementById('writeData').addEventListener('click', () => run(refreshPayload('write')));
  document.getElementById('smokeEs').addEventListener('click', () => run({ action: 'api_smoke', instrument: 'ES' }));
  document.getElementById('smokeNq').addEventListener('click', () => run({ action: 'api_smoke', instrument: 'NQ' }));
  setEndToNow();
}
