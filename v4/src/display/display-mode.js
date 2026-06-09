// View-only display presets for chart PDA, segment, and composite objects.

import * as bus from '../event-bus.js';
import { getAnnotations } from '../pda/pda-store.js';
import { getSegmentGroupById, getSegmentGroups } from '../segment/segment-group-store.js';
import { getSegments } from '../segment/segment-store.js';

const STORAGE_KEY = 'v4:display-mode:NQ';

const DEFAULT_STATE = {
  mode: 'all',
  recentCount: 5,
};

let state = { ...DEFAULT_STATE };
let selectedSegmentId = '';
let selectedGroupId = '';

function normalizeRecentCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_STATE.recentCount;
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

function normalizeState(nextState = {}) {
  const migratedMode = nextState.mode === 'structure-only' ? 'selected-pda' : nextState.mode;
  const modes = new Set(['all', 'selected-pda', 'recent-workspace']);
  return {
    mode: modes.has(migratedMode) ? migratedMode : DEFAULT_STATE.mode,
    recentCount: normalizeRecentCount(nextState.recentCount),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    state = normalizeState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
  } catch (err) {
    console.warn('[display-mode] load failed', err);
    state = { ...DEFAULT_STATE };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[display-mode] save failed', err);
  }
}

function emitChanged() {
  bus.emit('display-mode:changed', getDisplayMode());
}

function getSegmentTime(segment, point = 'end') {
  const value = Number(segment?.[point]?.timestamp ?? segment?.[point]?.time ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getSortedSegmentsNewestFirst() {
  return [...getSegments()].sort((a, b) => {
    const endDiff = getSegmentTime(b, 'end') - getSegmentTime(a, 'end');
    if (endDiff !== 0) return endDiff;
    return getSegmentTime(b, 'start') - getSegmentTime(a, 'start');
  });
}

function getGroupChildren(group) {
  const segmentMap = new Map(getSegments().map((segment) => [segment.id, segment]));
  return (Array.isArray(group?.childSegmentIds) ? group.childSegmentIds : [])
    .map((id) => segmentMap.get(id))
    .filter(Boolean);
}

function getGroupLastTime(group) {
  const children = getGroupChildren(group);
  const times = children.map((segment) => getSegmentTime(segment, 'end'));
  return times.length ? Math.max(...times) : 0;
}

function getRecentSegments() {
  return getSortedSegmentsNewestFirst().slice(0, state.recentCount);
}

function getRecentGroups() {
  return [...getSegmentGroups()]
    .sort((a, b) => getGroupLastTime(b) - getGroupLastTime(a))
    .slice(0, state.recentCount);
}

function getAnnotationActivityTime(annotation = {}) {
  const explicitTime = Number(annotation.updatedAt ?? annotation.createdAt);
  if (Number.isFinite(explicitTime)) return explicitTime;

  return Math.max(
    0,
    ...[
      annotation.canonicalTimestamp,
      annotation.timestamp,
      annotation.anchorTime,
      annotation.startTimeTimestamp,
      annotation.endTimeTimestamp,
      annotation.start?.timestamp,
      annotation.start?.time,
      annotation.end?.timestamp,
      annotation.end?.time,
    ].map((value) => Number(value)).filter(Number.isFinite)
  );
}

function getRecentAnnotations() {
  return getAnnotations()
    .filter((annotation) => annotation?.id && !annotation.display?.hidden)
    .sort((a, b) => getAnnotationActivityTime(b) - getAnnotationActivityTime(a))
    .slice(0, state.recentCount);
}

function getSelectedStructureSegmentIds() {
  if (selectedSegmentId) return new Set([selectedSegmentId]);
  if (!selectedGroupId) return new Set();

  const group = getSegmentGroupById(selectedGroupId);
  return new Set([
    ...(Array.isArray(group?.childSegmentIds) ? group.childSegmentIds : []),
    group?.targetSegmentId,
  ].filter(Boolean));
}

function addGroupSegmentIds(ids, group) {
  (Array.isArray(group?.childSegmentIds) ? group.childSegmentIds : []).forEach((id) => ids.add(id));
  if (group?.targetSegmentId) ids.add(group.targetSegmentId);
}

function addSegmentResponseIds(ids, segment) {
  const responses = Array.isArray(segment?.pdaResponses) ? segment.pdaResponses : [];
  responses.forEach((response) => {
    if (response?.pdaId && response.displayMode !== 'hidden') ids.add(response.pdaId);
  });
}

function getSegmentByIdMap() {
  return new Map(getSegments().map((segment) => [segment.id, segment]));
}

function getAllIds() {
  return {
    visiblePdaIds: new Set(getAnnotations().filter((annotation) => !annotation.display?.hidden).map((annotation) => annotation.id).filter(Boolean)),
    visibleSegmentIds: new Set(getSegments().filter((segment) => !segment.display?.hidden).map((segment) => segment.id).filter(Boolean)),
    visibleGroupIds: new Set(getSegmentGroups().filter((group) => !group.display?.hidden).map((group) => group.id).filter(Boolean)),
  };
}

function buildVisibilitySets() {
  const allIds = getAllIds();

  if (state.mode === 'all') {
    return allIds;
  }

  const segmentMap = getSegmentByIdMap();
  const selectedSegmentIds = getSelectedStructureSegmentIds();
  const selectedPdaIds = new Set();
  selectedSegmentIds.forEach((segmentId) => addSegmentResponseIds(selectedPdaIds, segmentMap.get(segmentId)));

  if (state.mode === 'selected-pda') {
    return {
      ...allIds,
      visiblePdaIds: selectedPdaIds,
    };
  }

  if (state.mode === 'recent-workspace') {
    const visibleSegmentIds = new Set(getRecentSegments().map((segment) => segment.id).filter(Boolean));
    const visibleGroupIds = new Set();

    getRecentGroups().forEach((group) => {
      visibleGroupIds.add(group.id);
      addGroupSegmentIds(visibleSegmentIds, group);
    });

    selectedSegmentIds.forEach((id) => visibleSegmentIds.add(id));
    if (selectedGroupId) visibleGroupIds.add(selectedGroupId);

    const visiblePdaIds = new Set();
    visibleSegmentIds.forEach((segmentId) => addSegmentResponseIds(visiblePdaIds, segmentMap.get(segmentId)));
    getRecentAnnotations().forEach((annotation) => visiblePdaIds.add(annotation.id));

    return { visiblePdaIds, visibleSegmentIds, visibleGroupIds };
  }

  return allIds;
}

export function getDisplayMode() {
  return { ...state };
}

export function updateDisplayMode(patch = {}) {
  state = normalizeState({ ...state, ...patch });
  saveState();
  emitChanged();
  return getDisplayMode();
}

export function getDisplayVisibility() {
  return buildVisibilitySets();
}

export function shouldRenderPda(annotation) {
  if (!annotation?.id) return false;
  if (annotation.display?.hidden) return false;
  return getDisplayVisibility().visiblePdaIds.has(annotation.id);
}

export function shouldRenderSegment(segment) {
  if (!segment?.id) return false;
  if (segment.display?.hidden) return false;
  return getDisplayVisibility().visibleSegmentIds.has(segment.id);
}

export function shouldRenderSegmentGroup(group) {
  if (!group?.id) return false;
  if (group.display?.hidden) return false;
  return getDisplayVisibility().visibleGroupIds.has(group.id);
}

export function initDisplayMode() {
  loadState();
  bus.on('segment:selected', ({ selection }) => {
    selectedSegmentId = selection?.id || '';
    selectedGroupId = '';
    emitChanged();
  });
  bus.on('segment:selection-cleared', () => {
    if (!selectedSegmentId) return;
    selectedSegmentId = '';
    emitChanged();
  });
  bus.on('segment-group:selected', ({ selection }) => {
    selectedGroupId = selection?.id || '';
    selectedSegmentId = '';
    emitChanged();
  });
  bus.on('segment-group:selection-cleared', () => {
    if (!selectedGroupId) return;
    selectedGroupId = '';
    emitChanged();
  });
  bus.on('bars:cleared', () => {
    selectedSegmentId = '';
    selectedGroupId = '';
    emitChanged();
  });
  emitChanged();
}
