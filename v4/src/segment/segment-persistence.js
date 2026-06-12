// Browser-local market segment draft persistence. This is not the formal review archive.

import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getSegments, loadSegments } from './segment-store.js';
import { getSegmentGroups, loadSegmentGroups } from './segment-group-store.js';

const STORAGE_KEY_BASE = 'v4:market-segments';
const STORAGE_VERSION = 2;
let restoring = false;

function getPersistableSegments() {
  return getSegments().filter((segment) => segment.source !== 'draft' && !segment.draft);
}

function getPersistableSegmentGroups() {
  return getSegmentGroups().filter((group) => group.type === 'composite-move');
}

function handleStorageError(error, action) {
  const label = action === 'read'
    ? '读取'
    : action === 'remove'
      ? '清除'
      : '保存';
  bus.emit('status:update', {
    text: `Segment 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function saveSegments(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    segments: getPersistableSegments(),
    segmentGroups: getPersistableSegmentGroups(),
  }, { onError: handleStorageError });
}

export function restoreSegments(instrument = getPrimaryInstrument()) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });
  const segments = Array.isArray(payload?.segments) ? payload.segments : [];
  const segmentGroups = Array.isArray(payload?.segmentGroups) ? payload.segmentGroups : [];
  restoring = true;
  try {
    loadSegments(segments.filter((segment) => segment.source !== 'draft' && !segment.draft));
    loadSegmentGroups(segmentGroups);
  } finally {
    restoring = false;
  }

  if (segments.length > 0 || segmentGroups.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${segments.length} 条本地行情段与 ${segmentGroups.length} 个 Composite Move`,
      isError: false,
    });
  }
}

export function clearSavedSegments() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'Segment 本地保存已清除', isError: false });
  }
}

export function initSegmentPersistence() {
  restoreSegments();
  bus.on('segment:changed', () => saveSegments());
  bus.on('segment-group:changed', () => saveSegments());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveSegments(previousInstrument);
    restoreSegments(instrument);
  });
}
