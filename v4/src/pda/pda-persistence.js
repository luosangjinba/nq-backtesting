// Browser-local PDA draft persistence. This is not the formal research database.

import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import { getAnnotations, loadAnnotations } from './pda-store.js';

const STORAGE_KEY = 'v4:pda-annotations:NQ';
const STORAGE_VERSION = 1;

function getPersistableAnnotations() {
  return getAnnotations().filter((annotation) => annotation.source !== 'draft' && !annotation.draft);
}

const persistence = createLocalPersistence({
  key: STORAGE_KEY,
  fallback: null,
  onError(error, action) {
    const label = action === 'read'
      ? '读取'
      : action === 'remove'
        ? '清除'
        : '保存';
    bus.emit('status:update', {
      text: `PDA 本地${label}失败: ${error.message}`,
      isError: true,
    });
  },
});

export function saveAnnotations() {
  persistence.write({
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    annotations: getPersistableAnnotations(),
  });
}

export function restoreAnnotations() {
  const payload = persistence.read();
  if (!payload) return;

  const annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
  persistence.runRestoring(() => {
    loadAnnotations(annotations.filter((annotation) => annotation.source !== 'draft' && !annotation.draft));
  });

  if (annotations.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${annotations.length} 条本地 PDA 标注`,
      isError: false,
    });
  }
}

export function clearSavedAnnotations() {
  if (persistence.remove()) {
    bus.emit('status:update', { text: 'PDA 本地保存已清除', isError: false });
  }
}

export function initPdaPersistence() {
  restoreAnnotations();
  bus.on('pda:changed', saveAnnotations);
}
