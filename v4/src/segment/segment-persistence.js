// Browser-local market segment draft persistence. This is not the formal review archive.

import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import { getSegments, loadSegments } from './segment-store.js';
import { getSegmentGroups, loadSegmentGroups } from './segment-group-store.js';

const STORAGE_KEY = 'v4:market-segments:NQ';
const STORAGE_VERSION = 2;

function getPersistableSegments() {
  return getSegments().filter((segment) => segment.source !== 'draft' && !segment.draft);
}

function getPersistableSegmentGroups() {
  return getSegmentGroups().filter((group) => group.type === 'composite-move');
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
      text: `Segment 本地${label}失败: ${error.message}`,
      isError: true,
    });
  },
});

export function saveSegments() {
  persistence.write({
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    segments: getPersistableSegments(),
    segmentGroups: getPersistableSegmentGroups(),
  });
}

export function restoreSegments() {
  const payload = persistence.read();
  if (!payload) return;

  const segments = Array.isArray(payload.segments) ? payload.segments : [];
  const segmentGroups = Array.isArray(payload.segmentGroups) ? payload.segmentGroups : [];
  persistence.runRestoring(() => {
    loadSegments(segments.filter((segment) => segment.source !== 'draft' && !segment.draft));
    loadSegmentGroups(segmentGroups);
  });

  if (segments.length > 0 || segmentGroups.length > 0) {
    bus.emit('status:update', {
      text: `已恢复 ${segments.length} 条本地行情段与 ${segmentGroups.length} 个 Composite Move`,
      isError: false,
    });
  }
}

export function clearSavedSegments() {
  if (persistence.remove()) {
    bus.emit('status:update', { text: 'Segment 本地保存已清除', isError: false });
  }
}

export function initSegmentPersistence() {
  restoreSegments();
  bus.on('segment:changed', saveSegments);
  bus.on('segment-group:changed', saveSegments);
}
