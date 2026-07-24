import { addDateInputDays, parseDateInput } from './refresh-range-panel.js';
import { appendOutput, extract, setValue, value } from './output-panel.js';

export const ROLL_PRESETS = {
  ES_JUN: {
    instrument: 'ES',
    oldContract: 'ESM6',
    newContract: 'ESU6',
    rollDate: '2026-06-15',
    note: 'Manual trading system switched to ESU6 on 2026-06-15.',
  },
  NQ_JUN: {
    instrument: 'NQ',
    oldContract: 'NQM6',
    newContract: 'NQU6',
    rollDate: '2026-06-15',
    note: 'Manual trading system switched to NQU6 on 2026-06-15.',
  },
};

let lastRollCandidateDate = '';

export function clearRollCandidate() {
  lastRollCandidateDate = '';
}

export function setRollScanRangeAroundRollDate() {
  const rollDate = value('rollDate');
  if (!parseDateInput(rollDate)) return;
  setValue('rollScanStart', addDateInputDays(rollDate, -5));
  setValue('rollScanEnd', addDateInputDays(rollDate, 4));
}

export function rollPayload(action) {
  return {
    action,
    instrument: value('instrument'),
    oldContract: value('oldContract'),
    newContract: value('newContract'),
    rollDate: value('rollDate'),
    status: value('status'),
    note: value('note'),
  };
}

export function rollScanPayload() {
  return {
    action: 'roll_scan_volume',
    instrument: value('instrument'),
    oldContract: value('oldContract'),
    newContract: value('newContract'),
    scanStart: value('rollScanStart'),
    scanEnd: value('rollScanEnd'),
  };
}

function applyPreset(presetKey) {
  const preset = ROLL_PRESETS[presetKey];
  clearRollCandidate();
  if (!preset) return;
  setValue('instrument', preset.instrument);
  setValue('oldContract', preset.oldContract);
  setValue('newContract', preset.newContract);
  setValue('rollDate', preset.rollDate);
  setValue('note', preset.note);
  setValue('refreshInstrument', preset.instrument);
  setValue('confirmText', '');
  setRollScanRangeAroundRollDate();
}

export function initRollCalendarPanel({ run }) {
  document.getElementById('preset').addEventListener('change', (event) => {
    applyPreset(event.target.value);
  });
  document.getElementById('scanRollVolume').addEventListener('click', async () => {
    lastRollCandidateDate = '';
    const data = await run(rollScanPayload());
    const candidate = extract(data?.output || '', /^candidate_roll_date:\s*(.+)$/m);
    lastRollCandidateDate = candidate && candidate !== 'n/a' ? candidate : '';
  });
  document.getElementById('useRollCandidate').addEventListener('click', () => {
    if (!lastRollCandidateDate) {
      appendOutput('No roll volume candidate date is available yet. Run Scan Volume first.');
      return;
    }
    setValue('rollDate', lastRollCandidateDate);
    appendOutput(`Roll date set to candidate ${lastRollCandidateDate}. Preview before writing.`);
  });
  document.getElementById('previewRoll').addEventListener('click', () => run(rollPayload('confirm_roll_preview')));
  document.getElementById('rollDate').addEventListener('change', () => {
    clearRollCandidate();
    setRollScanRangeAroundRollDate();
  });
  ['instrument', 'oldContract', 'newContract', 'rollScanStart', 'rollScanEnd'].forEach((id) => {
    document.getElementById(id).addEventListener('change', clearRollCandidate);
  });
  setRollScanRangeAroundRollDate();
}
