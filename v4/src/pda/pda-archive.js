// JSON archive import/export for manual PDA annotations.

import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { buildCePrice } from '../price-utils.js';
import { timeframeToString } from '../config.js';
import { getAnnotationIdentity, getAnnotations, loadAnnotations } from './pda-store.js';
import { getPdaType } from './pda-types.js';
import { recordHistory } from '../history/history-manager.js';
import { normalizeFibLevels } from './fib-levels.js';

const ARCHIVE_VERSION = 1;
const ARCHIVE_APP = 'trading-v4';

export function getExportableAnnotations() {
  return getAnnotations().filter((annotation) => annotation.source !== 'draft' && !annotation.draft);
}

export function formatDateForFile(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

export function getArchiveRange() {
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
    instrument: getPrimaryInstrument(),
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

function validateArchiveInstrument(payloadInstrument) {
  const archiveInstrument = String(payloadInstrument || 'NQ').trim().toUpperCase();
  const currentInstrument = getPrimaryInstrument();
  if (archiveInstrument !== currentInstrument) {
    throw new Error(`archive instrument ${archiveInstrument} does not match current Pane 2 ${currentInstrument}`);
  }
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('file read failed'));
    reader.readAsText(file);
  });
}

export function getImportableAnnotations(payload) {
  return payload.annotations
    .filter(
      (annotation) =>
        annotation &&
        typeof annotation === 'object' &&
        !annotation.draft &&
        annotation.source !== 'draft' &&
        isSupportedAnnotation(annotation)
    )
    .map(normalizeImportedAnnotation);
}

function isSupportedAnnotation(annotation) {
  const pdaType = getPdaType(annotation.type);
  if (!pdaType) return false;
  if (!annotation.id) return false;

  if (pdaType.shape === 'liquidity-line') {
    return Number.isFinite(Number(annotation.price));
  }
  if (pdaType.shape === 'range') {
    return Number.isFinite(Number(annotation.topPrice ?? annotation.priceHigh)) &&
      Number.isFinite(Number(annotation.bottomPrice ?? annotation.priceLow));
  }
  if (pdaType.shape === 'point-set') {
    return Array.isArray(annotation.points) && annotation.points.length >= 2;
  }
  if (pdaType.shape === 'fib-retracement') {
    return (
      annotation.start &&
      annotation.end &&
      Number.isFinite(Number(annotation.start.price)) &&
      Number.isFinite(Number(annotation.end.price)) &&
      (annotation.start.timestamp || annotation.start.time) &&
      (annotation.end.timestamp || annotation.end.time) &&
      Array.isArray(annotation.levels) &&
      annotation.levels.length > 0
    );
  }
  return false;
}

function normalizeImportedAnnotation(annotation) {
  const pdaType = getPdaType(annotation.type);
  const normalized = {
    ...annotation,
    source: annotation.source || 'manual',
    contexts: Array.isArray(annotation.contexts) ? annotation.contexts.filter((context) => typeof context === 'string') : [],
  };

  if (pdaType?.shape === 'range') {
    const topPrice = normalized.topPrice ?? normalized.priceHigh;
    const bottomPrice = normalized.bottomPrice ?? normalized.priceLow;
    normalized.ce = buildCePrice(topPrice, bottomPrice);
  }

  if (pdaType?.shape === 'fib-retracement') {
    normalized.levels = normalizeFibLevels(normalized.levels);
    normalized.display = {
      ...(normalized.display || {}),
      showLabels: normalized.display?.showLabels ?? true,
      showTrendLine: normalized.display?.showTrendLine ?? false,
      extend: normalized.display?.extend || 'none',
    };
  }

  return normalized;
}

export function prepareImportedAnnotations(existingAnnotations, importedAnnotations) {
  const usedIds = new Set(existingAnnotations.map((annotation) => annotation.id).filter(Boolean));
  const existingIdentities = new Set(existingAnnotations.map(getAnnotationIdentity));
  const importStamp = Date.now();
  let skippedDuplicates = 0;

  const annotations = [];
  importedAnnotations.forEach((annotation, index) => {
    const identity = getAnnotationIdentity(annotation);
    if (existingIdentities.has(identity)) {
      skippedDuplicates += 1;
      return;
    }

    let nextAnnotation = annotation;
    if (usedIds.has(annotation.id)) {
      const nextId = `${annotation.id}-import-${importStamp}-${index + 1}`;
      nextAnnotation = {
        ...annotation,
        id: nextId,
        importedFromId: annotation.id,
        updatedAt: Date.now(),
      };
      usedIds.add(nextId);
    } else {
      usedIds.add(annotation.id);
    }

    existingIdentities.add(identity);
    annotations.push(nextAnnotation);
  });

  return { annotations, skippedDuplicates };
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
    validateArchiveInstrument(payload.instrument);

    let imported = [];
    let skippedDuplicates = 0;
    await recordHistory('Import PDA Archive', () => {
      const existing = getAnnotations();
      const prepared = prepareImportedAnnotations(
        existing,
        getImportableAnnotations(payload)
      );
      imported = prepared.annotations;
      skippedDuplicates = prepared.skippedDuplicates;
      loadAnnotations([...existing, ...imported]);
    });

    bus.emit('status:update', {
      text: `已导入 ${imported.length} 条 PDA 标注${skippedDuplicates ? `，跳过 ${skippedDuplicates} 条重复标注` : ''}`,
      isError: false,
    });
  } catch (err) {
    bus.emit('status:update', {
      text: `PDA 导入失败: ${err.message}`,
      isError: true,
    });
  }
}
