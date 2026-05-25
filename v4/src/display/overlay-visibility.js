// Shared visible-object resolver for primary/secondary overlays.

import { shouldRenderPda, shouldRenderSegment, shouldRenderSegmentGroup } from './display-mode.js';
import {
  getIsolateCompanionSegments,
  getIsolatePreviousIncludePda,
  getResponseDisplayMode,
} from '../segment/segment-isolate-view.js';
import { getSelectedSegment, getSelectedSegmentGroup } from '../segment/segment-selection.js';
import { getSegmentById, getIsolatedSegment } from '../segment/segment-store.js';
import { getSegmentGroupById } from '../segment/segment-group-store.js';

function addVisibleResponseIds(target, responses = []) {
  responses
    .filter((response) => getResponseDisplayMode(response) !== 'hidden')
    .map((response) => response.pdaId)
    .filter(Boolean)
    .forEach((pdaId) => target.add(pdaId));
}

function getResponseIdsByMode(responses = [], mode) {
  return new Set(
    responses
      .filter((response) => getResponseDisplayMode(response) === mode)
      .map((response) => response.pdaId)
      .filter(Boolean)
  );
}

export function getStructureOverlayVisibility({
  segments = [],
  groups = [],
  annotations = [],
} = {}) {
  const isolatedSegment = getIsolatedSegment();

  if (isolatedSegment) {
    const isolateCompanions = getIsolateCompanionSegments(isolatedSegment);
    const visibleSegmentIds = new Set([
      isolatedSegment.id,
      ...isolateCompanions.map((segment) => segment.id),
    ].filter(Boolean));
    const hiddenSegmentIds = new Set(
      isolatedSegment.display?.isolateDisplayMode === 'hidden' ? [isolatedSegment.id] : []
    );
    const visibleGroupIds = new Set(
      groups
        .filter((group) =>
          (Array.isArray(group.childSegmentIds) ? group.childSegmentIds : []).some((id) =>
            visibleSegmentIds.has(id)
          )
        )
        .map((group) => group.id)
        .filter(Boolean)
    );

    const isolatedResponses = Array.isArray(isolatedSegment.pdaResponses)
      ? isolatedSegment.pdaResponses
      : [];
    const companionResponses = getIsolatePreviousIncludePda(isolatedSegment)
      ? isolateCompanions.flatMap((segment) =>
          Array.isArray(segment.pdaResponses) ? segment.pdaResponses : []
        )
      : [];
    const visiblePdaIds = new Set();
    addVisibleResponseIds(visiblePdaIds, isolatedResponses);
    addVisibleResponseIds(visiblePdaIds, companionResponses);

    return {
      visibleSegmentIds,
      hiddenSegmentIds,
      visibleGroupIds,
      visiblePdaIds,
      hiddenPdaIds: getResponseIdsByMode(isolatedResponses, 'hidden'),
      highlightPdaIds: getResponseIdsByMode(isolatedResponses, 'highlight'),
      isolate: true,
    };
  }

  const visibleSegmentIds = new Set(
    segments.filter(shouldRenderSegment).map((segment) => segment.id).filter(Boolean)
  );
  const visibleGroupIds = new Set(
    groups.filter(shouldRenderSegmentGroup).map((group) => group.id).filter(Boolean)
  );
  const visiblePdaIds = new Set(
    annotations.filter(shouldRenderPda).map((annotation) => annotation.id).filter(Boolean)
  );

  const selectedSegment = getSelectedSegment();
  const selectedGroup = !selectedSegment?.id ? getSelectedSegmentGroup() : null;
  const selectedGroupModel = selectedGroup?.id ? getSegmentGroupById(selectedGroup.id) : null;
  const selectedSegmentIds = new Set();

  if (selectedSegment?.id) {
    selectedSegmentIds.add(selectedSegment.id);
  } else if (selectedGroupModel) {
    (Array.isArray(selectedGroupModel.childSegmentIds) ? selectedGroupModel.childSegmentIds : [])
      .filter(Boolean)
      .forEach((id) => selectedSegmentIds.add(id));
    if (selectedGroupModel.targetSegmentId) selectedSegmentIds.add(selectedGroupModel.targetSegmentId);
  }

  const selectedResponses = Array.from(selectedSegmentIds)
    .map((id) => getSegmentById(id))
    .filter(Boolean)
    .flatMap((segment) => (Array.isArray(segment.pdaResponses) ? segment.pdaResponses : []));
  const linkedVisiblePdaIds = new Set();
  addVisibleResponseIds(linkedVisiblePdaIds, selectedResponses);
  const linkedHiddenPdaIds = getResponseIdsByMode(selectedResponses, 'hidden');
  const highlightPdaIds = getResponseIdsByMode(selectedResponses, 'highlight');

  linkedVisiblePdaIds.forEach((pdaId) => visiblePdaIds.add(pdaId));

  return {
    visibleSegmentIds,
    hiddenSegmentIds: new Set(),
    visibleGroupIds,
    visiblePdaIds,
    hiddenPdaIds: new Set(
      Array.from(linkedHiddenPdaIds).filter((pdaId) => !linkedVisiblePdaIds.has(pdaId))
    ),
    highlightPdaIds,
    isolate: false,
  };
}
