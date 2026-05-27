// Hideable right-side inspector for selected chart objects.

import * as bus from '../event-bus.js';
import { clearSelection as clearPdaSelection, getSelectedPda } from '../pda/pda-selection.js';
import { exportPdaArchive, importPdaArchive } from '../pda/pda-archive.js';
import { exportReviewArchive, importReviewArchive } from '../review/review-archive.js';
import { clearSavedAnnotations } from '../pda/pda-persistence.js';
import { deleteAnnotation, getAnnotationById, updateAnnotation } from '../pda/pda-store.js';
import { getPdaType } from '../pda/pda-types.js';
import {
  clearSegmentGroupSelection,
  clearSegmentSelection,
  getSelectedSegment,
  getSelectedSegmentGroup,
} from '../segment/segment-selection.js';
import {
  deleteSegment,
  getSegmentById,
  removePdaResponse,
  setSegmentIsolated,
  updatePdaResponse,
  updateSegment,
} from '../segment/segment-store.js';
import {
  addSegmentToDraftGroup,
  clearDraftSegmentGroup,
  createCompositeMove,
  deleteSegmentGroup,
  removeSegmentFromDraftGroup,
  setDraftSegmentGroupTarget,
  updateSegmentGroup,
  getSegmentGroupById,
} from '../segment/segment-group-store.js';
import { getDrawingSets, isDrawingSetFocused, locateDrawingSet } from '../segment/drawing-set-list.js';
import { renderArchiveActions } from './inspector/archive-panel.js';
import {
  getPointSetContext,
  getPointSetReference,
  renderAnnotationPanel,
} from './inspector/pda-panel.js';
import { parseTags, renderSegmentPanel } from './inspector/segment-panel.js';
import { renderSegmentGroupPanel } from './inspector/segment-group-panel.js';
import {
  EVIDENCE_TYPES,
  buildDefaultActorFromSegment,
  createReactionEvidence,
  normalizeReactionEvidenceList,
  parseEvidenceTimestamp,
} from '../segment/reaction-evidence.js';

let sidebarEl = null;
let bodyEl = null;
let currentPanel = 'empty';

function renderAnnotation(annotation) {
  currentPanel = 'selection';
  bodyEl.innerHTML = renderAnnotationPanel(annotation, renderArchiveActions());
}

function renderSegment(segment) {
  currentPanel = 'selection';
  bodyEl.innerHTML = renderSegmentPanel(segment);
}

function renderSegmentGroup(segmentGroup) {
  currentPanel = 'selection';
  bodyEl.innerHTML = renderSegmentGroupPanel(segmentGroup);
}

function renderEmpty() {
  currentPanel = 'empty';
  bodyEl.innerHTML = `
    <div class="inspector-empty">
      Select a PDA or 1H segment on the chart.
    </div>
    ${renderDrawingSetList()}
    ${renderArchiveActions()}
  `;
}

function renderArchivePanel() {
  currentPanel = 'archive';
  bodyEl.innerHTML = renderArchiveActions();
}

function renderDrawingSetList() {
  const sets = getDrawingSets();
  const rows = sets.length
    ? sets
        .map(
          (set) => {
            const isFocused = isDrawingSetFocused(set.type, set.id);
            return `
            <button class="drawing-set-row${isFocused ? ' active' : ''}" data-inspector-action="drawing-set-locate" data-set-type="${set.type}" data-set-id="${set.id}" type="button" aria-pressed="${isFocused ? 'true' : 'false'}">
              <span class="drawing-set-main">${set.label}</span>
              <span class="drawing-set-meta">${set.detail}</span>
            </button>
          `;
          }
        )
        .join('')
    : '<div class="drawing-set-empty">No segment or composite sets.</div>';

  return `
    <section class="inspector-section drawing-set-section">
      <div class="inspector-section-title">Structure Sets</div>
      <div class="drawing-set-list">${rows}</div>
    </section>
  `;
}

function openSidebar() {
  sidebarEl?.classList.add('open');
}

function closeSidebar() {
  sidebarEl?.classList.remove('open');
}

function refreshSelection() {
  if (currentPanel === 'archive') return;

  const pdaSelection = getSelectedPda();
  if (pdaSelection) {
    const annotation = getAnnotationById(pdaSelection.id);
    if (annotation) {
      renderAnnotation(annotation);
      return;
    }
  }

  const segmentSelection = getSelectedSegment();
  if (segmentSelection) {
    const segment = getSegmentById(segmentSelection.id);
    if (segment) {
      renderSegment(segment);
      return;
    }
  }

  const segmentGroupSelection = getSelectedSegmentGroup();
  if (segmentGroupSelection) {
    const segmentGroup = getSegmentGroupById(segmentGroupSelection.id);
    if (segmentGroup) {
      renderSegmentGroup(segmentGroup);
      return;
    }
  }

  renderEmpty();
}

function createSidebar() {
  sidebarEl = document.createElement('aside');
  sidebarEl.id = 'inspector-sidebar';
  sidebarEl.innerHTML = `
    <div class="inspector-header">
      <div class="inspector-title">Inspector</div>
      <button class="inspector-close" type="button" title="Close inspector">X</button>
    </div>
    <div class="inspector-body"></div>
  `;
  document.getElementById('workspace')?.appendChild(sidebarEl);
  bodyEl = sidebarEl.querySelector('.inspector-body');
  sidebarEl.querySelector('.inspector-close')?.addEventListener('click', closeSidebar);
  sidebarEl.addEventListener('change', handleInspectorChange);
  sidebarEl.addEventListener('click', handleInspectorClick);
  renderEmpty();
}

function getCurrentAnnotation() {
  const selection = getSelectedPda();
  return selection ? getAnnotationById(selection.id) : null;
}

function getCurrentSegment() {
  const selection = getSelectedSegment();
  return selection ? getSegmentById(selection.id) : null;
}

function getCurrentSegmentGroup() {
  const selection = getSelectedSegmentGroup();
  return selection ? getSegmentGroupById(selection.id) : null;
}

function getSegmentResponse(segment, pdaId) {
  return (Array.isArray(segment?.pdaResponses) ? segment.pdaResponses : []).find(
    (response) => response.pdaId === pdaId
  );
}

function updateReactionEvidenceList(segment, pdaId, updater) {
  const response = getSegmentResponse(segment, pdaId);
  if (!response) return;
  const evidenceList = normalizeReactionEvidenceList(response.reactionEvidence);
  updatePdaResponse(segment.id, pdaId, {
    reactionEvidence: updater(evidenceList),
  });
}

function addReactionEvidence(segment, pdaId, type) {
  const actor = buildDefaultActorFromSegment(segment, segment.timeframe || '1H');
  const evidence = createReactionEvidence({
    type,
    pdaId,
    timeframe: actor.timeframe,
    firstBarTimestamp: actor.firstBarTimestamp,
    lastBarTimestamp: actor.lastBarTimestamp,
    terminalBarTimestamp: actor.terminalBarTimestamp,
    params: type === EVIDENCE_TYPES.FVG_RESPECT ? { entrySide: 'from-above' } : {},
  });
  updateReactionEvidenceList(segment, pdaId, (evidenceList) => [...evidenceList, evidence]);
}

function patchReactionEvidence(segment, pdaId, evidenceId, patcher) {
  updateReactionEvidenceList(segment, pdaId, (evidenceList) =>
    evidenceList.map((evidence) =>
      evidence.id === evidenceId
        ? {
            ...evidence,
            ...patcher(evidence),
            updatedAt: Date.now(),
          }
        : evidence
    )
  );
}

function handleInspectorChange(e) {
  const action = e.target.dataset.inspectorAction;
  if (!action) return;

  if (action === 'import-pda-file') {
    importPdaArchive(e.target.files?.[0]);
    e.target.value = '';
    return;
  }

  if (action === 'import-review-file') {
    importReviewArchive(e.target.files?.[0]);
    e.target.value = '';
    return;
  }

  const segment = getCurrentSegment();
  if (segment) {
    if (action === 'segment-toggle-label') {
      updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          showLabel: e.target.checked,
        },
      });
      return;
    }

    if (action === 'segment-toggle-isolate') {
      setSegmentIsolated(segment.id, e.target.checked);
      return;
    }

    if (action === 'segment-isolate-display-mode') {
      updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          isolateDisplayMode: e.target.value,
        },
      });
      return;
    }

    if (action === 'segment-isolate-previous-count') {
      const parsed = Number(e.target.value);
      updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          isolatePreviousCount: Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0,
        },
      });
      return;
    }

    if (action === 'segment-toggle-isolate-previous-pda') {
      updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          isolatePreviousIncludePda: e.target.checked,
        },
      });
      return;
    }

    if (action === 'segment-narrative') {
      updateSegment(segment.id, { narrative: e.target.value });
      return;
    }

    if (action === 'segment-tags') {
      updateSegment(segment.id, { tags: parseTags(e.target.value) });
      return;
    }

    if (action === 'segment-response-relation') {
      updatePdaResponse(segment.id, e.target.dataset.pdaId, { relation: e.target.value });
      return;
    }

    if (action === 'segment-response-display-mode') {
      updatePdaResponse(segment.id, e.target.dataset.pdaId, {
        displayMode: e.target.value,
        selected: e.target.value === 'highlight',
      });
      return;
    }

    if (action === 'segment-response-note') {
      updatePdaResponse(segment.id, e.target.dataset.pdaId, { note: e.target.value });
      return;
    }

    if (action === 'reaction-evidence-entry-side') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        params: {
          ...(evidence.params || {}),
          entrySide: e.target.value,
        },
      }));
      return;
    }

    if (action === 'reaction-evidence-first-bar') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        actor: {
          ...(evidence.actor || {}),
          firstBarTimestamp: parseEvidenceTimestamp(e.target.value),
        },
      }));
      return;
    }

    if (action === 'reaction-evidence-last-bar') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        actor: {
          ...(evidence.actor || {}),
          lastBarTimestamp: parseEvidenceTimestamp(e.target.value),
        },
      }));
      return;
    }

    if (action === 'reaction-evidence-terminal-bar') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        actor: {
          ...(evidence.actor || {}),
          terminalBarTimestamp: parseEvidenceTimestamp(e.target.value),
        },
      }));
      return;
    }

    if (action === 'reaction-evidence-note') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, () => ({
        note: e.target.value,
      }));
      return;
    }

    if (action === 'segment-group-outcome') {
      updateSegmentGroup(e.target.dataset.groupId, { outcome: e.target.value });
      return;
    }

    if (action === 'segment-group-notes') {
      updateSegmentGroup(e.target.dataset.groupId, { notes: e.target.value });
      return;
    }

    if (action === 'segment-group-target') {
      setDraftSegmentGroupTarget(e.target.value);
      return;
    }
  }

  const segmentGroup = getCurrentSegmentGroup();
  if (segmentGroup) {
    if (action === 'segment-group-current-target') {
      updateSegmentGroup(segmentGroup.id, { targetSegmentId: e.target.value });
      return;
    }

    if (action === 'segment-group-current-objective') {
      updateSegmentGroup(segmentGroup.id, { objective: e.target.value });
      return;
    }

    if (action === 'segment-group-current-outcome') {
      updateSegmentGroup(segmentGroup.id, { outcome: e.target.value });
      return;
    }

    if (action === 'segment-group-current-notes') {
      updateSegmentGroup(segmentGroup.id, { notes: e.target.value });
      return;
    }

    if (action === 'segment-group-toggle-label') {
      updateSegmentGroup(segmentGroup.id, {
        display: {
          ...(segmentGroup.display || {}),
          showLabel: e.target.checked,
        },
      });
      return;
    }
  }

  const annotation = getCurrentAnnotation();
  if (!annotation) return;

  if (action === 'toggle-current-label') {
    updateAnnotation(annotation.id, {
      display: {
        ...(annotation.display || {}),
        showLabel: e.target.checked,
      },
    });
    return;
  }

  if (action === 'extend-bars') {
    const parsed = Number(e.target.value);
    const extendBars = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
    updateAnnotation(annotation.id, {
      display: {
        ...(annotation.display || {}),
        extendBars,
      },
    });
    return;
  }

  if (action === 'note') {
    updateAnnotation(annotation.id, { note: e.target.value });
    return;
  }

  if (action === 'toggle-ce') {
    updateAnnotation(annotation.id, {
      display: {
        ...(annotation.display || {}),
        showCe: e.target.checked,
      },
    });
  }
}

function handleInspectorClick(e) {
  const action = e.target.dataset.inspectorAction;
  if (!action) return;

  if (action === 'export-pda') {
    exportPdaArchive();
    return;
  }

  if (action === 'export-review') {
    exportReviewArchive();
    return;
  }

  if (action === 'import-pda') {
    bodyEl?.querySelector('[data-inspector-action="import-pda-file"]')?.click();
    return;
  }

  if (action === 'import-review') {
    bodyEl?.querySelector('[data-inspector-action="import-review-file"]')?.click();
    return;
  }

  if (action === 'clear-saved') {
    clearSavedAnnotations();
    return;
  }

  if (action === 'drawing-set-locate') {
    locateDrawingSet(e.target.dataset.setType, e.target.dataset.setId);
    return;
  }

  const segment = getCurrentSegment();
  if (segment) {
    if (action === 'reaction-evidence-add-fvg') {
      addReactionEvidence(segment, e.target.dataset.pdaId, EVIDENCE_TYPES.FVG_RESPECT);
      return;
    }

    if (action === 'reaction-evidence-add-liquidity') {
      addReactionEvidence(segment, e.target.dataset.pdaId, EVIDENCE_TYPES.LIQUIDITY_SWEEP);
      return;
    }

    if (action === 'reaction-evidence-delete') {
      updateReactionEvidenceList(segment, e.target.dataset.pdaId, (evidenceList) =>
        evidenceList.filter((evidence) => evidence.id !== e.target.dataset.evidenceId)
      );
      return;
    }
  }

  if (segment) {
    if (action === 'segment-delete') {
      deleteSegment(segment.id);
      clearSegmentSelection();
      renderEmpty();
      return;
    }

    if (action === 'segment-response-remove') {
      removePdaResponse(segment.id, e.target.dataset.pdaId);
      return;
    }

    if (action === 'segment-group-draft-add') {
      addSegmentToDraftGroup(segment.id);
      return;
    }

    if (action === 'segment-group-draft-remove') {
      removeSegmentFromDraftGroup(segment.id);
      return;
    }

    if (action === 'segment-group-draft-clear') {
      clearDraftSegmentGroup();
      return;
    }

    if (action === 'segment-group-create') {
      const targetSegmentId = bodyEl?.querySelector('[data-inspector-action="segment-group-target"]')?.value || '';
      const objective =
        bodyEl?.querySelector('[data-inspector-action="segment-group-objective"]')?.value ||
        'break-previous-extreme';
      const outcome =
        bodyEl?.querySelector('[data-inspector-action="segment-group-create-outcome"]')?.value || 'pending';
      const group = createCompositeMove({ targetSegmentId, objective, outcome });
      bus.emit('status:update', {
        text: group ? `已创建 Composite Move: ${group.childSegmentIds.length} legs` : '至少需要 2 个 staged segments',
        isError: !group,
      });
      return;
    }

    if (action === 'segment-group-delete') {
      deleteSegmentGroup(e.target.dataset.groupId);
      return;
    }
  }

  const segmentGroup = getCurrentSegmentGroup();
  if (segmentGroup) {
    if (action === 'segment-group-current-delete') {
      deleteSegmentGroup(segmentGroup.id);
      clearSegmentGroupSelection();
      renderEmpty();
      return;
    }
  }

  const annotation = getCurrentAnnotation();
  if (!annotation) return;

  if (action === 'delete') {
    deleteAnnotation(annotation.id);
    clearPdaSelection();
    renderEmpty();
    return;
  }

  if (action === 'remove-point') {
    removePointFromSet(annotation, Number(e.target.dataset.pointIndex));
  }
}

function removePointFromSet(annotation, pointIndex) {
  if (!Array.isArray(annotation.points) || !Number.isInteger(pointIndex)) return;
  const nextPoints = annotation.points.filter((_, index) => index !== pointIndex);

  if (nextPoints.length < 2) {
    deleteAnnotation(annotation.id);
    clearPdaSelection();
    renderEmpty();
    bus.emit('status:update', {
      text: `${getPdaType(annotation.type)?.label || annotation.type.toUpperCase()} 少于 2 个点，集合已删除`,
      isError: false,
    });
    return;
  }

  const referencePrice = getPointSetReference(annotation.type, nextPoints);
  updateAnnotation(annotation.id, {
    points: nextPoints,
    referencePrice,
    price: referencePrice,
    contexts: [getPointSetContext(annotation, nextPoints)],
  });
}

export function initInspectorSidebar() {
  createSidebar();
  bus.on('pda:selected', ({ annotation }) => {
    renderAnnotation(annotation);
    openSidebar();
  });
  bus.on('pda:selection-cleared', refreshSelection);
  bus.on('pda:changed', refreshSelection);
  bus.on('segment:selected', ({ segment }) => {
    renderSegment(segment);
    openSidebar();
  });
  bus.on('segment-group:selected', ({ segmentGroup }) => {
    renderSegmentGroup(segmentGroup);
    openSidebar();
  });
  bus.on('segment:selection-cleared', refreshSelection);
  bus.on('segment-group:selection-cleared', refreshSelection);
  bus.on('segment:changed', refreshSelection);
  bus.on('segment-group:changed', refreshSelection);
  bus.on('drawing-set-focus:changed', refreshSelection);
  bus.on('inspector:open-archive', () => {
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderArchivePanel();
    openSidebar();
  });
  bus.on('bars:cleared', () => {
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderEmpty();
  });
}
