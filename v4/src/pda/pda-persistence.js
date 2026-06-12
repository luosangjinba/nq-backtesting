// Browser-local PDA draft persistence. This is not the formal research database.

import * as bus from '../event-bus.js';
import { readLocalJson, removeLocalJson, writeLocalJson } from '../storage/local-persistence.js';
import { getInstrumentStorageKey } from '../storage/instrument-storage.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getAnnotations, loadAnnotations } from './pda-store.js';

const STORAGE_KEY_BASE = 'v4:pda-annotations';
const STORAGE_VERSION = 1;
let restoring = false;

function getPersistableAnnotations() {
  return getAnnotations().filter((annotation) => annotation.source !== 'draft' && !annotation.draft);
}

function handleStorageError(error, action) {
  const label = action === 'read'
    ? '读取'
    : action === 'remove'
      ? '清除'
      : '保存';
  bus.emit('status:update', {
    text: `PDA 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function saveAnnotations(instrument = getPrimaryInstrument()) {
  if (restoring) return false;
  return writeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    annotations: getPersistableAnnotations(),
  }, { onError: handleStorageError });
}

export function restoreAnnotations(instrument = getPrimaryInstrument()) {
  const payload = readLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE, instrument), null, { onError: handleStorageError });
  const annotations = Array.isArray(payload?.annotations) ? payload.annotations : [];
  restoring = true;
  try {
    loadAnnotations(annotations.filter((annotation) => annotation.source !== 'draft' && !annotation.draft));
  } finally {
    restoring = false;
  }

  if (annotations.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${annotations.length} 条本地 PDA 标注`,
      isError: false,
    });
  }
}

export function clearSavedAnnotations() {
  if (removeLocalJson(getInstrumentStorageKey(STORAGE_KEY_BASE), { onError: handleStorageError })) {
    bus.emit('status:update', { text: 'PDA 本地保存已清除', isError: false });
  }
}

export function initPdaPersistence() {
  restoreAnnotations();
  bus.on('pda:changed', () => saveAnnotations());
  bus.on('primary-instrument:changed', ({ instrument, previousInstrument }) => {
    saveAnnotations(previousInstrument);
    restoreAnnotations(instrument);
  });
}
