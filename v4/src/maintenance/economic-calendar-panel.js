import {
  addDateInputDays,
  formatDateInputFromUtc,
  getEasternParts,
  parseDateInput,
} from './refresh-range-panel.js';
import { appendOutput, extract, setValue, value } from './output-panel.js';

export function formatEasternDateInput(date = new Date()) {
  const parts = getEasternParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getWeekRange(dateText, offsetWeeks = 0) {
  const date = parseDateInput(dateText);
  if (!date) return { from: dateText, to: dateText };
  const day = date.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - daysFromMonday + offsetWeeks * 7);
  const from = formatDateInputFromUtc(date);
  date.setUTCDate(date.getUTCDate() + 6);
  return { from, to: formatDateInputFromUtc(date) };
}

export function setEconomicDateRange(fromDate, toDate) {
  setValue('economicFrom', fromDate);
  setValue('economicTo', toDate);
}

export function setEconomicDatesToToday() {
  const today = formatEasternDateInput(new Date());
  setEconomicDateRange(today, today);
}

export function setEconomicDatesToThisWeek() {
  const today = formatEasternDateInput(new Date());
  const range = getWeekRange(today, 0);
  setEconomicDateRange(range.from, range.to);
}

export function setEconomicDatesToNextWeek() {
  const today = formatEasternDateInput(new Date());
  const range = getWeekRange(today, 1);
  setEconomicDateRange(range.from, range.to);
}

export async function setEconomicDatesToLatestGap({ run }) {
  const data = await run({ action: 'economic_status' });
  if (!data?.ok) return;
  const latest = extract(data.output || '', /^date_max:\s*(.+)$/m);
  const today = formatEasternDateInput(new Date());
  const nextDate = addDateInputDays(latest, 1);
  setEconomicDateRange(nextDate && nextDate <= today ? nextDate : today, today);
}

export function economicPayload(action) {
  return {
    action,
    fromDate: value('economicFrom'),
    toDate: value('economicTo'),
    confirmText: value('economicConfirmText'),
  };
}

export async function economicManualPayload(action) {
  const file = document.getElementById('economicManualCsv').files?.[0];
  if (!file) throw new Error('Choose a manual economic CSV first.');
  return {
    action,
    filename: file.name,
    csvText: await file.text(),
    currency: value('economicManualCurrency') || 'USD',
    timezone: value('economicManualTimezone') || 'America/New_York',
    confirmText: value('economicConfirmText'),
  };
}

export function initEconomicCalendarPanel({ run }) {
  document.getElementById('economicToday').addEventListener('click', setEconomicDatesToToday);
  document.getElementById('economicThisWeek').addEventListener('click', setEconomicDatesToThisWeek);
  document.getElementById('economicNextWeek').addEventListener('click', setEconomicDatesToNextWeek);
  document.getElementById('economicToToday').addEventListener('click', () => setEconomicDatesToLatestGap({ run }));
  document.getElementById('economicStatus').addEventListener('click', () => run({ action: 'economic_status' }));
  document.getElementById('economicVerify').addEventListener('click', () => run({ action: 'economic_verify' }));
  document.getElementById('economicDryRun').addEventListener('click', () => run(economicPayload('economic_dry_run')));
  document.getElementById('economicWrite').addEventListener('click', () => run(economicPayload('economic_write')));
  document.getElementById('economicManualPreview').addEventListener('click', async () => {
    try {
      await run(await economicManualPayload('economic_manual_preview'));
    } catch (error) {
      appendOutput(`Manual economic CSV error: ${error.message}`);
    }
  });
  document.getElementById('economicManualWrite').addEventListener('click', async () => {
    try {
      await run(await economicManualPayload('economic_manual_write'));
    } catch (error) {
      appendOutput(`Manual economic CSV error: ${error.message}`);
    }
  });
  setEconomicDatesToToday();
}
