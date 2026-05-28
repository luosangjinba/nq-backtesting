// Hideable right-side inspector for selected chart objects.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as viewport from '../chart/viewport-controller.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';
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
import { renderSmtPanel } from './inspector/smt-panel.js';
import { renderOrderReviewPanel } from './inspector/order-review-panel.js';
import { deleteSmtRecord, getSmtRecordById, getSmtRecords, updateSmtRecord } from '../smt/smt-store.js';
import {
  addOrderReview,
  deleteOrderReview,
  getOrderReviewById,
  getOrderReviews,
  ORDER_EVENT_TYPES,
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
  updateOrderReview,
} from '../order/order-review-store.js';
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
let actorPickState = null;

function normalizeTimeKey(time) {
  if (time && typeof time === 'object') {
    const month = String(time.month).padStart(2, '0');
    const day = String(time.day).padStart(2, '0');
    return `${time.year}-${month}-${day}`;
  }
  return time;
}

function getBarChartTime(bar, timeframe = store.getCurrentTimeframe()) {
  return timeframe === 1440 ? bar.tradingDay : bar.timestamp;
}

function findDisplayBarByChartTime(time) {
  if (time === undefined || time === null) return null;
  const target = normalizeTimeKey(time);
  const timeframe = store.getCurrentTimeframe();
  return (
    store
      .getDisplayBars()
      .find((bar) => normalizeTimeKey(getBarChartTime(bar, timeframe)) === target) || null
  );
}

function clearActorPickState({ silent = false } = {}) {
  if (!actorPickState) return false;
  actorPickState = null;
  chart.hidePickPreviewCursor();
  if (!silent) {
    bus.emit('status:update', { text: 'Actor bar pick 已取消', isError: false });
  }
  return true;
}

function getActorFieldLabel(actorField) {
  if (actorField === 'firstBarTimestamp') return 'Actor First';
  if (actorField === 'lastBarTimestamp') return 'Actor Last';
  if (actorField === 'terminalBarTimestamp') return 'Actor Terminal';
  return 'Actor Bar';
}

function renderAnnotation(annotation) {
  currentPanel = 'selection';
  bodyEl.innerHTML = renderAnnotationPanel(annotation, renderArchiveActions());
}

function renderSegment(segment) {
  currentPanel = 'selection';
  bodyEl.innerHTML = `
    ${renderSegmentPanel(segment)}
    ${renderOrderReviewPanel(getOrderReviews(), {
      createAction: 'order-review-create-segment',
      createLabel: 'Create Order Review From Segment',
    })}
  `;
}

function renderSegmentGroup(segmentGroup) {
  currentPanel = 'selection';
  bodyEl.innerHTML = `
    ${renderSegmentGroupPanel(segmentGroup)}
    ${renderOrderReviewPanel(getOrderReviews(), {
      createAction: 'order-review-create-composite',
      createLabel: 'Create Order Review From Composite',
    })}
  `;
}

function renderEmpty() {
  currentPanel = 'empty';
  bodyEl.innerHTML = `
    <div class="inspector-empty">
      Select a PDA or 1H segment on the chart.
    </div>
    ${renderOrderReviewPanel(getOrderReviews(), {
      createAction: 'order-review-create-empty',
      createLabel: 'Create Blank Order Review',
    })}
    ${renderSmtPanel(getSmtRecords())}
    ${renderDrawingSetList()}
    ${renderArchiveActions()}
  `;
}

function renderArchivePanel() {
  currentPanel = 'archive';
  bodyEl.innerHTML = `
    ${renderOrderReviewPanel(getOrderReviews())}
    ${renderSmtPanel(getSmtRecords())}
    ${renderArchiveActions()}
  `;
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
  if (currentPanel === 'archive') {
    renderArchivePanel();
    return;
  }

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

function getSegmentTimestamp(segment) {
  return segment?.end?.timestamp ?? segment?.end?.time ?? segment?.start?.timestamp ?? segment?.start?.time ?? null;
}

function getSegmentPrice(segment) {
  return segment?.end?.price ?? segment?.start?.price ?? null;
}

function getCompositeTimestamp(group) {
  const childIds = Array.isArray(group?.childSegmentIds) ? group.childSegmentIds : [];
  const childSegments = childIds.map(getSegmentById).filter(Boolean);
  const terminal = childSegments[childSegments.length - 1];
  return getSegmentTimestamp(terminal);
}

function createOrderReviewFromSegment(segment) {
  const timestamp = getSegmentTimestamp(segment);
  const order = addOrderReview({
    setupThesis: {
      primaryEventTimestamp: timestamp,
      primaryEventTimeframe: segment.timeframe || '1H',
      primaryEventType: ORDER_EVENT_TYPES.OTHER,
      primaryEventPrice: getSegmentPrice(segment),
      linkedObjectRefs: [
        {
          type: ORDER_REF_TYPES.SEGMENT,
          id: segment.id,
          role: ORDER_REF_ROLES.CONTEXT,
        },
      ],
    },
    entryPlan: {
      entryTimestamp: timestamp,
      entryTimeframe: segment.timeframe || '1H',
    },
  });
  bus.emit('status:update', { text: `已创建 Order Review: ${order.id}`, isError: false });
  return order;
}

function createOrderReviewFromComposite(group) {
  const timestamp = getCompositeTimestamp(group);
  const order = addOrderReview({
    setupThesis: {
      primaryEventTimestamp: timestamp,
      primaryEventTimeframe: '1H',
      primaryEventType: ORDER_EVENT_TYPES.OTHER,
      linkedObjectRefs: [
        {
          type: ORDER_REF_TYPES.COMPOSITE,
          id: group.id,
          role: ORDER_REF_ROLES.CONTEXT,
        },
      ],
      narrative: group.notes || '',
    },
    entryPlan: {
      entryTimestamp: timestamp,
      entryTimeframe: '1H',
    },
  });
  bus.emit('status:update', { text: `已创建 Order Review: ${order.id}`, isError: false });
  return order;
}

function createBlankOrderReview() {
  const order = addOrderReview();
  bus.emit('status:update', { text: `已创建空白 Order Review: ${order.id}`, isError: false });
  return order;
}

function locateOrderReview(order) {
  const timestamps = [
    order.setupThesis?.primaryEventTimestamp,
    order.entryPlan?.entryTimestamp,
    order.resultReview?.exitTimestamp,
  ]
    .map(Number)
    .filter((value) => Number.isFinite(value));
  if (!timestamps.length) {
    bus.emit('status:update', { text: '该 Order Review 没有可定位时间', isError: true });
    return;
  }
  viewport.locateTimestampRange(Math.min(...timestamps), Math.max(...timestamps));
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

function startActorBarPick(segment, target) {
  if (!store.getDisplayBars().length) {
    bus.emit('status:update', { text: '当前图表没有可 pick 的 K 线', isError: true });
    return;
  }

  const response = getSegmentResponse(segment, target.pdaId);
  const evidence = normalizeReactionEvidenceList(response?.reactionEvidence).find(
    (item) => item.id === target.evidenceId
  );
  if (!evidence) return;

  const currentTimeframe = timeframeToString(store.getCurrentTimeframe());
  const actorTimeframe = evidence.actor?.timeframe || currentTimeframe;
  if (actorTimeframe !== currentTimeframe) {
    bus.emit('status:update', {
      text: `Actor TF ${actorTimeframe} 与当前图表周期 ${currentTimeframe} 不一致，不能从当前图表 pick`,
      isError: true,
    });
    return;
  }

  actorPickState = {
    segmentId: segment.id,
    pdaId: target.pdaId,
    evidenceId: target.evidenceId,
    actorField: target.actorField,
  };
  bus.emit('status:update', { text: `点击图表选择 ${getActorFieldLabel(target.actorField)}`, isError: false });
}

function handleActorPickChartClick(e) {
  if (!actorPickState) return;
  e.preventDefault();
  e.stopImmediatePropagation();

  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  const rect = chartEl.getBoundingClientRect();
  const time = chart.coordinateToTime(e.clientX - rect.left);
  const bar = findDisplayBarByChartTime(time);
  if (!bar) {
    chart.hidePickPreviewCursor();
    return;
  }

  const segment = getSegmentById(actorPickState.segmentId);
  if (!segment) {
    clearActorPickState({ silent: true });
    return;
  }

  const { pdaId, evidenceId, actorField } = actorPickState;
  clearActorPickState({ silent: true });
  patchReactionEvidence(segment, pdaId, evidenceId, (evidence) => ({
    actor: {
      ...(evidence.actor || {}),
      [actorField]: bar.timestamp,
      timeframe: timeframeToString(store.getCurrentTimeframe()),
    },
  }));
  bus.emit('status:update', {
    text: `${getActorFieldLabel(actorField)} 已选择: ${bar.time || bar.tradingDay}`,
    isError: false,
  });
}

function handleActorPickHover(param) {
  if (!actorPickState) return;
  const bar = findDisplayBarByChartTime(param?.time);
  if (!bar) {
    chart.hidePickPreviewCursor();
    return;
  }
  chart.showPickPreviewCursor(getBarChartTime(bar));
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

  if (action === 'smt-note') {
    updateSmtRecord(e.target.dataset.smtId, { note: e.target.value });
    return;
  }

  if (action === 'order-review-note') {
    updateOrderReview(e.target.dataset.orderReviewId, { note: e.target.value });
    return;
  }

  if (action === 'order-review-result') {
    updateOrderReview(e.target.dataset.orderReviewId, {
      resultReview: { result: e.target.value },
    });
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

    if (action === 'reaction-evidence-timeframe') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        actor: {
          ...(evidence.actor || {}),
          timeframe: e.target.value,
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

  if (action === 'smt-locate') {
    const record = getSmtRecordById(e.target.dataset.smtId);
    if (record) {
      viewport.locateTimestampRange(
        record.leftTimestamp ?? record.fvgStartTimestamp ?? record.timestamp,
        record.rightTimestamp ?? record.fvgEndTimestamp ?? record.timestamp
      );
    }
    return;
  }

  if (action === 'smt-delete') {
    deleteSmtRecord(e.target.dataset.smtId);
    if (currentPanel === 'archive') renderArchivePanel();
    return;
  }

  if (action === 'order-review-create-empty') {
    createBlankOrderReview();
    return;
  }

  if (action === 'order-review-locate') {
    const order = getOrderReviewById(e.target.dataset.orderReviewId);
    if (order) locateOrderReview(order);
    return;
  }

  if (action === 'order-review-delete') {
    deleteOrderReview(e.target.dataset.orderReviewId);
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

    if (action === 'reaction-evidence-pick-actor-bar') {
      startActorBarPick(segment, {
        pdaId: e.target.dataset.pdaId,
        evidenceId: e.target.dataset.evidenceId,
        actorField: e.target.dataset.actorField,
      });
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

    if (action === 'order-review-create-segment') {
      createOrderReviewFromSegment(segment);
      return;
    }

    if (action === 'segment-group-delete') {
      deleteSegmentGroup(e.target.dataset.groupId);
      return;
    }
  }

  const segmentGroup = getCurrentSegmentGroup();
  if (segmentGroup) {
    if (action === 'order-review-create-composite') {
      createOrderReviewFromComposite(segmentGroup);
      return;
    }

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
  document.getElementById('chart')?.addEventListener('click', handleActorPickChartClick, true);
  chart.onCrosshairMove(handleActorPickHover);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') clearActorPickState();
  });
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
  bus.on('smt:changed', refreshSelection);
  bus.on('order-review:changed', refreshSelection);
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
