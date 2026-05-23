// Composite moves group multiple atomic market segments without changing segment semantics.

import * as bus from '../event-bus.js';
import { getSegmentById, getSegments } from './segment-store.js';

let segmentGroups = [];
let draftChildIds = [];

function emitChanged() {
  bus.emit('segment-group:changed', {
    segmentGroups: getSegmentGroups(),
    draftChildIds: getDraftSegmentGroupChildIds(),
  });
}

function uniqueIds(ids = []) {
  const seen = new Set();
  return ids.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function getTimestamp(segment) {
  const value = Number(segment?.start?.timestamp ?? segment?.start?.time ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function sortSegmentIds(ids = []) {
  return uniqueIds(ids).sort((a, b) => {
    const left = getSegmentById(a);
    const right = getSegmentById(b);
    return getTimestamp(left) - getTimestamp(right);
  });
}

function inferDirection(childSegmentIds = []) {
  const children = sortSegmentIds(childSegmentIds).map(getSegmentById).filter(Boolean);
  const first = children[0];
  const last = children[children.length - 1];
  const start = Number(first?.start?.price);
  const end = Number(last?.end?.price);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return 'flat';
  return end > start ? 'up' : 'down';
}

export function getSegmentGroups() {
  return [...segmentGroups];
}

export function getSegmentGroupById(id) {
  return segmentGroups.find((group) => group.id === id) || null;
}

export function getSegmentGroupsForSegment(segmentId) {
  if (!segmentId) return [];
  return segmentGroups.filter(
    (group) => Array.isArray(group.childSegmentIds) && group.childSegmentIds.includes(segmentId)
  );
}

export function getDraftSegmentGroupChildIds() {
  return [...draftChildIds];
}

export function addSegmentToDraftGroup(segmentId) {
  if (!getSegmentById(segmentId)) return null;
  draftChildIds = sortSegmentIds([...draftChildIds, segmentId]);
  emitChanged();
  return getDraftSegmentGroupChildIds();
}

export function removeSegmentFromDraftGroup(segmentId) {
  draftChildIds = draftChildIds.filter((id) => id !== segmentId);
  emitChanged();
  return getDraftSegmentGroupChildIds();
}

export function clearDraftSegmentGroup() {
  if (!draftChildIds.length) return;
  draftChildIds = [];
  emitChanged();
}

export function createCompositeMove({
  childSegmentIds = draftChildIds,
  targetSegmentId = '',
  objective = 'break-previous-extreme',
  outcome = 'pending',
  notes = '',
} = {}) {
  const validChildIds = sortSegmentIds(childSegmentIds).filter((id) => getSegmentById(id));
  if (validChildIds.length < 2) return null;

  const now = Date.now();
  const group = {
    id: `composite_move_${validChildIds[0]}_${validChildIds[validChildIds.length - 1]}_${now}`,
    type: 'composite-move',
    direction: inferDirection(validChildIds),
    childSegmentIds: validChildIds,
    targetSegmentId: getSegmentById(targetSegmentId) ? targetSegmentId : '',
    objective,
    outcome,
    notes,
    createdAt: now,
    updatedAt: now,
  };
  segmentGroups = [...segmentGroups, group];
  draftChildIds = [];
  emitChanged();
  return group;
}

export function updateSegmentGroup(id, patch = {}) {
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, type: _ignoredType, ...safePatch } = patch;
  let updated = null;

  segmentGroups = segmentGroups.map((group) => {
    if (group.id !== id) return group;
    updated = {
      ...group,
      ...safePatch,
      id: group.id,
      type: 'composite-move',
      childSegmentIds: Array.isArray(safePatch.childSegmentIds)
        ? sortSegmentIds(safePatch.childSegmentIds)
        : group.childSegmentIds,
      createdAt: group.createdAt,
      updatedAt: Date.now(),
    };
    return updated;
  });

  if (updated) emitChanged();
  return updated;
}

export function deleteSegmentGroup(id) {
  const nextGroups = segmentGroups.filter((group) => group.id !== id);
  if (nextGroups.length === segmentGroups.length) return;
  segmentGroups = nextGroups;
  emitChanged();
}

export function loadSegmentGroups(nextGroups = []) {
  segmentGroups = Array.isArray(nextGroups)
    ? nextGroups
        .filter((group) => group?.type === 'composite-move' && Array.isArray(group.childSegmentIds))
        .map((group) => ({
          ...group,
          type: 'composite-move',
          childSegmentIds: sortSegmentIds(group.childSegmentIds),
          objective: group.objective || 'break-previous-extreme',
          outcome: group.outcome || 'pending',
          notes: group.notes || '',
        }))
        .filter((group) => group.childSegmentIds.length >= 2)
    : [];
  draftChildIds = [];
  emitChanged();
}

export function clearSegmentGroups() {
  segmentGroups = [];
  draftChildIds = [];
  emitChanged();
}

function pruneMissingSegmentReferences() {
  const availableIds = new Set(getSegments().map((segment) => segment.id));
  const nextDraftIds = draftChildIds.filter((id) => availableIds.has(id));
  const nextGroups = segmentGroups
    .map((group) => ({
      ...group,
      childSegmentIds: group.childSegmentIds.filter((id) => availableIds.has(id)),
      targetSegmentId: availableIds.has(group.targetSegmentId) ? group.targetSegmentId : '',
    }))
    .filter((group) => group.childSegmentIds.length >= 2);

  const changed =
    nextDraftIds.length !== draftChildIds.length ||
    nextGroups.length !== segmentGroups.length ||
    nextGroups.some((group, index) => {
      const previous = segmentGroups[index];
      return (
        group.targetSegmentId !== previous?.targetSegmentId ||
        group.childSegmentIds.length !== previous?.childSegmentIds?.length
      );
    });

  if (!changed) return;
  draftChildIds = nextDraftIds;
  segmentGroups = nextGroups;
  emitChanged();
}

export function initSegmentGroups() {
  bus.on('segment:changed', pruneMissingSegmentReferences);
}
