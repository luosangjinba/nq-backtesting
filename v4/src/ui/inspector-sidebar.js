// Hideable right-side inspector for selected chart objects.

import * as bus from '../event-bus.js';
import { clearSelection as clearPdaSelection, getSelectedPda } from '../pda/pda-selection.js';
import { exportPdaArchive, importPdaArchive } from '../pda/pda-archive.js';
import { exportReviewArchive, importReviewArchive } from '../review/review-archive.js';
import { clearSavedAnnotations } from '../pda/pda-persistence.js';
import { deleteAnnotation, getAnnotationById, updateAnnotation } from '../pda/pda-store.js';
import { getPdaType } from '../pda/pda-types.js';
import { clearSegmentSelection, getSelectedSegment } from '../segment/segment-selection.js';
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
  updateSegmentGroup,
} from '../segment/segment-group-store.js';
import { renderArchiveActions } from './inspector/archive-panel.js';
import {
  getPointSetContext,
  getPointSetReference,
  renderAnnotationPanel,
} from './inspector/pda-panel.js';
import { parseTags, renderSegmentPanel } from './inspector/segment-panel.js';

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

function renderEmpty() {
  currentPanel = 'empty';
  bodyEl.innerHTML = `
    <div class="inspector-empty">
      Select a PDA or 1H segment on the chart.
    </div>
    ${renderArchiveActions()}
  `;
}

function renderArchivePanel() {
  currentPanel = 'archive';
  bodyEl.innerHTML = renderArchiveActions();
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

    if (action === 'segment-group-outcome') {
      updateSegmentGroup(e.target.dataset.groupId, { outcome: e.target.value });
      return;
    }

    if (action === 'segment-group-notes') {
      updateSegmentGroup(e.target.dataset.groupId, { notes: e.target.value });
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

  const segment = getCurrentSegment();
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
  bus.on('segment:selection-cleared', refreshSelection);
  bus.on('segment:changed', refreshSelection);
  bus.on('segment-group:changed', refreshSelection);
  bus.on('inspector:open-archive', () => {
    clearPdaSelection();
    clearSegmentSelection();
    renderArchivePanel();
    openSidebar();
  });
  bus.on('bars:cleared', () => {
    clearPdaSelection();
    clearSegmentSelection();
    renderEmpty();
  });
}
