import {
  buildTradovateLiveRecordArchives,
} from '../live-record/tradovate-performance-importer.js';
import { formatTradovateImportPreview } from '../live-record/tradovate-import-preview.js';
import { readTradovateImportInputs } from '../live-record/tradovate-zip-import.js';
import { appendOutput, setStatusPill } from './output-panel.js';

export function slugForFilename(value, fallback = 'performance') {
  const slug = String(value || '')
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

export function ymdFromEpochSeconds(epochSeconds) {
  const date = new Date(Number(epochSeconds) * 1000);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function dateRangeForPayload(payload) {
  const dates = (payload.liveRecords || [])
    .flatMap((record) => [
      record.anchor?.timestamp,
      record.result?.exitTimestamp,
    ])
    .map(ymdFromEpochSeconds)
    .filter(Boolean)
    .sort();
  if (!dates.length) return '';
  return dates[0] === dates[dates.length - 1]
    ? dates[0]
    : `${dates[0]}-${dates[dates.length - 1]}`;
}

export function filenameForResults(results, sourceFileName, instrument = '') {
  const resultList = Array.isArray(results) ? results : [results];
  const sourceSlug = slugForFilename(sourceFileName);
  const instruments = instrument
    ? [instrument]
    : [...new Set(resultList.map((result) => result.payload.instrument).filter(Boolean))];
  const instrumentSlug = instruments.map((item) => slugForFilename(item, '')).filter(Boolean).join('-');
  const range = resultList.map((result) => dateRangeForPayload(result.payload)).filter(Boolean).sort()[0] || '';
  return [
    'tradovate-live-records',
    instrumentSlug,
    range,
    sourceSlug,
  ].filter(Boolean).join('-') + '.json';
}

function getDomRefs() {
  return {
    zipFileInput: document.getElementById('tradovateZip'),
    fileInput: document.getElementById('tradovateCsv'),
    ordersFileInput: document.getElementById('tradovateOrdersCsv'),
    fillsFileInput: document.getElementById('tradovateFillsCsv'),
    positionFileInput: document.getElementById('tradovatePositionCsv'),
    cashFileInput: document.getElementById('tradovateCashCsv'),
    balanceFileInput: document.getElementById('tradovateBalanceCsv'),
    instrumentInput: document.getElementById('tradovateInstrument'),
    timezoneInput: document.getElementById('tradovateTimezone'),
    filenameInput: document.getElementById('tradovateFilename'),
  };
}

function getTradovateFile(refs) {
  const file = refs.fileInput.files?.[0];
  if (!file && !refs.zipFileInput.files?.[0]) {
    throw new Error('Choose a Tradovate Performance CSV or CSV ZIP package first.');
  }
  return file;
}

async function getTradovateInputTexts(refs) {
  return readTradovateImportInputs({
    zipFile: refs.zipFileInput.files?.[0] || null,
    performanceFile: refs.fileInput.files?.[0] || null,
    ordersFile: refs.ordersFileInput.files?.[0] || null,
    fillsFile: refs.fillsFileInput.files?.[0] || null,
    positionFile: refs.positionFileInput.files?.[0] || null,
    cashFile: refs.cashFileInput.files?.[0] || null,
    balanceFile: refs.balanceFileInput.files?.[0] || null,
  });
}

async function buildArchivesFromSelectedFile(refs) {
  const input = await getTradovateInputTexts(refs);
  const results = buildTradovateLiveRecordArchives(input.performanceText, {
    instrument: refs.instrumentInput.value,
    timeZone: refs.timezoneInput.value,
    ordersText: input.ordersText,
    fillsText: input.fillsText,
    positionHistoryText: input.positionHistoryText,
    cashHistoryText: input.cashHistoryText,
    accountBalanceHistoryText: input.accountBalanceHistoryText,
  });
  return { results, input };
}

function updateFilenameFromSourceFile(refs, file) {
  refs.filenameInput.value = filenameForResults([], file?.name || '');
}

function updateFilenameFromResults(refs, results, sourceFileName) {
  refs.filenameInput.value = filenameForResults(results, sourceFileName);
}

function outputFilenameForPayload(refs, payload, totalFiles = 1) {
  const rawName = refs.filenameInput.value.trim() || `tradovate-live-records-${payload.instrument}.json`;
  const baseName = rawName.endsWith('.json') ? rawName.slice(0, -5) : rawName;
  return totalFiles > 1
    ? filenameForResults(
        [{ payload }],
        refs.fileInput.files?.[0]?.name || refs.zipFileInput.files?.[0]?.name || baseName,
        payload.instrument
      )
    : `${baseName}.json`;
}

function downloadJson(refs, payload, totalFiles = 1) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = outputFilenameForPayload(refs, payload, totalFiles);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function initTradovateImportPanel() {
  const refs = getDomRefs();
  refs.fileInput.addEventListener('change', () => {
    const file = refs.fileInput.files?.[0];
    if (file) updateFilenameFromSourceFile(refs, file);
  });

  refs.zipFileInput.addEventListener('change', () => {
    const file = refs.zipFileInput.files?.[0];
    if (file && !refs.fileInput.files?.[0]) updateFilenameFromSourceFile(refs, file);
  });

  document.getElementById('tradovatePreview').addEventListener('click', async () => {
    try {
      setStatusPill('running', 'warn');
      getTradovateFile(refs);
      const { results, input } = await buildArchivesFromSelectedFile(refs);
      updateFilenameFromResults(refs, results, input.sourceFileName);
      appendOutput(formatTradovateImportPreview(results, input));
      setStatusPill('ok', 'ok');
    } catch (error) {
      appendOutput(`> tradovate_live_record_preview\n\nfailed: ${error.message}`);
      setStatusPill('failed', 'fail');
    }
  });

  document.getElementById('tradovateDownload').addEventListener('click', async () => {
    try {
      setStatusPill('running', 'warn');
      getTradovateFile(refs);
      const { results, input } = await buildArchivesFromSelectedFile(refs);
      updateFilenameFromResults(refs, results, input.sourceFileName);
      results.forEach((result) => downloadJson(refs, result.payload, results.length));
      appendOutput(`${formatTradovateImportPreview(results, input)}\n\nwrite_status: downloaded ${results.length} review JSON file${results.length === 1 ? '' : 's'}`);
      setStatusPill('ok', 'ok');
    } catch (error) {
      appendOutput(`> tradovate_live_record_download\n\nfailed: ${error.message}`);
      setStatusPill('failed', 'fail');
    }
  });
}
