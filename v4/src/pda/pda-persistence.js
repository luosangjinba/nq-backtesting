// Browser-local PDA draft persistence. This is not the formal research database.

import * as bus from '../event-bus.js';
import { getAnnotations, loadAnnotations } from './pda-store.js';

const STORAGE_KEY = 'v4:pda-annotations:NQ';
const STORAGE_VERSION = 1;

let restoring = false;

function getPersistableAnnotations() {
  return getAnnotations().filter((annotation) => annotation.source !== 'draft' && !annotation.draft);
}

function readPayload() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    bus.emit('status:update', {
      text: `PDA 本地记录读取失败: ${err.message}`,
      isError: true,
    });
    return null;
  }
}

export function saveAnnotations() {
  if (restoring) return;

  try {
    const payload = {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      annotations: getPersistableAnnotations(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    bus.emit('status:update', {
      text: `PDA 本地保存失败: ${err.message}`,
      isError: true,
    });
  }
}

export function restoreAnnotations() {
  const payload = readPayload();
  if (!payload) return;

  const annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
  restoring = true;
  loadAnnotations(annotations.filter((annotation) => annotation.source !== 'draft' && !annotation.draft));
  restoring = false;

  if (annotations.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${annotations.length} 条本地 PDA 标注`,
      isError: false,
    });
  }
}

export function clearSavedAnnotations() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    bus.emit('status:update', { text: 'PDA 本地保存已清除', isError: false });
  } catch (err) {
    bus.emit('status:update', {
      text: `PDA 本地保存清除失败: ${err.message}`,
      isError: true,
    });
  }
}

export function initPdaPersistence() {
  restoreAnnotations();
  bus.on('pda:changed', saveAnnotations);
}
