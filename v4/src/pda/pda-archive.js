// JSON archive import/export for manual PDA annotations.

import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';
import { getAnnotations, loadAnnotations } from './pda-store.js';

const ARCHIVE_VERSION = 1;
const ARCHIVE_APP = 'trading-v4';
const DEFAULT_INSTRUMENT = 'NQ';

function getExportableAnnotations() {
  return getAnnotations().filter((annotation) => annotation.source !== 'draft' && !annotation.draft);
}

function formatDateForFile(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

function getArchiveRange() {
  const range = store.getCurrentRange();
  const requestedRange = store.getRequestedRange();
  return {
    start: range.start,
    end: range.end,
    requestedStartTs: requestedRange?.startTs ?? null,
    requestedEndTs: requestedRange?.endTs ?? null,
  };
}

function buildArchivePayload() {
  return {
    app: ARCHIVE_APP,
    version: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    instrument: DEFAULT_INSTRUMENT,
    timeframe: timeframeToString(store.getCurrentTimeframe()),
    range: getArchiveRange(),
    annotations: getExportableAnnotations(),
  };
}

function downloadJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `v4-pda-${payload.instrument}-${payload.timeframe}-${formatDateForFile()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function validateArchivePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('archive payload must be an object');
  }
  if (payload.app !== ARCHIVE_APP) {
    throw new Error(`unsupported archive app: ${payload.app || 'unknown'}`);
  }
  if (payload.version !== ARCHIVE_VERSION) {
    throw new Error(`unsupported archive version: ${payload.version || 'unknown'}`);
  }
  if (!Array.isArray(payload.annotations)) {
    throw new Error('archive annotations must be an array');
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('file read failed'));
    reader.readAsText(file);
  });
}

function getImportableAnnotations(payload) {
  return payload.annotations.filter(
    (annotation) => annotation && typeof annotation === 'object' && !annotation.draft && annotation.source !== 'draft'
  );
}

function renameConflictingIds(existingAnnotations, importedAnnotations) {
  const usedIds = new Set(existingAnnotations.map((annotation) => annotation.id).filter(Boolean));
  const importStamp = Date.now();

  return importedAnnotations.map((annotation, index) => {
    if (!annotation.id || !usedIds.has(annotation.id)) {
      if (annotation.id) usedIds.add(annotation.id);
      return annotation;
    }

    const nextId = `${annotation.id}-import-${importStamp}-${index + 1}`;
    usedIds.add(nextId);
    return {
      ...annotation,
      id: nextId,
      importedFromId: annotation.id,
      updatedAt: Date.now(),
    };
  });
}

export function exportPdaArchive() {
  const payload = buildArchivePayload();
  if (payload.annotations.length === 0) {
    bus.emit('status:update', { text: '没有可导出的 PDA 标注', isError: true });
    return;
  }

  downloadJson(payload);
  bus.emit('status:update', {
    text: `已导出 ${payload.annotations.length} 条 PDA 标注`,
    isError: false,
  });
}

export async function importPdaArchive(file) {
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    const payload = JSON.parse(text);
    validateArchivePayload(payload);

    const existing = getAnnotations();
    const imported = renameConflictingIds(existing, getImportableAnnotations(payload));
    loadAnnotations([...existing, ...imported]);

    bus.emit('status:update', {
      text: `已导入 ${imported.length} 条 PDA 标注`,
      isError: false,
    });
  } catch (err) {
    bus.emit('status:update', {
      text: `PDA 导入失败: ${err.message}`,
      isError: true,
    });
  }
}
