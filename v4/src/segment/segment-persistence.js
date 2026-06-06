// Browser-local market segment draft persistence. This is not the formal review archive.

import * as bus from '../event-bus.js';
import { getSegments, loadSegments } from './segment-store.js';
import { getSegmentGroups, loadSegmentGroups } from './segment-group-store.js';

const STORAGE_KEY = 'v4:market-segments:NQ';
const STORAGE_VERSION = 2;

let restoring = false;

function getPersistableSegments() {
  return getSegments().filter((segment) => segment.source !== 'draft' && !segment.draft);
}

function getPersistableSegmentGroups() {
  return getSegmentGroups().filter((group) => group.type === 'composite-move');
}

function readPayload() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    bus.emit('status:update', {
      text: `Segment 本地记录读取失败: ${err.message}`,
      isError: true,
    });
    return null;
  }
}

export function saveSegments() {
  if (restoring) return;

  try {
    const payload = {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      segments: getPersistableSegments(),
      segmentGroups: getPersistableSegmentGroups(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    bus.emit('status:update', {
      text: `Segment 本地保存失败: ${err.message}`,
      isError: true,
    });
  }
}

export function restoreSegments() {
  const payload = readPayload();
  if (!payload) return;

  const segments = Array.isArray(payload.segments) ? payload.segments : [];
  const segmentGroups = Array.isArray(payload.segmentGroups) ? payload.segmentGroups : [];
  restoring = true;
  loadSegments(segments.filter((segment) => segment.source !== 'draft' && !segment.draft));
  loadSegmentGroups(segmentGroups);
  restoring = false;

  if (segments.length > 0 || segmentGroups.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${segments.length} 条本地行情段与 ${segmentGroups.length} 个 Composite Move`,
      isError: false,
    });
  }
}

export function clearSavedSegments() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    bus.emit('status:update', { text: 'Segment 本地保存已清除', isError: false });
  } catch (err) {
    bus.emit('status:update', {
      text: `Segment 本地保存清除失败: ${err.message}`,
      isError: true,
    });
  }
}

export function initSegmentPersistence() {
  restoreSegments();
  bus.on('segment:changed', saveSegments);
  bus.on('segment-group:changed', saveSegments);
}
