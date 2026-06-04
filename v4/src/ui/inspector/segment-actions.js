import * as bus from '../../event-bus.js';
import * as chart from '../../chart/chart-manager.js';
import { findDisplayBarFast } from '../../chart/display-bar-lookup.js';
import * as secondaryChart from '../../chart/secondary-chart-manager.js';
import * as store from '../../data/bar-store.js';
import * as secondaryStore from '../../data/secondary-chart-store.js';
import { getBarChartTime as getProjectedBarChartTime } from '../../chart/time-projection.js';
import { timeframeToString } from '../../config.js';
import { clearSegmentGroupSelection, clearSegmentSelection } from '../../segment/segment-selection.js';
import {
  deleteSegment,
  getSegmentById,
  removePdaResponse,
  setSegmentIsolated,
  updatePdaResponse,
  updateSegment,
} from '../../segment/segment-store.js';
import {
  addSegmentToDraftGroup,
  clearDraftSegmentGroup,
  createCompositeMove,
  deleteSegmentGroup,
  removeSegmentFromDraftGroup,
  setDraftSegmentGroupTarget,
  updateSegmentGroup,
} from '../../segment/segment-group-store.js';
import {
  EVIDENCE_TYPES,
  buildDefaultActorFromSegment,
  createReactionEvidence,
  normalizeReactionEvidenceList,
  parseEvidenceTimestamp,
} from '../../segment/reaction-evidence.js';
import { recordHistory } from '../../history/history-manager.js';
import { parseTags } from './segment-panel.js';

let actorPickState = null;

function recordInspectorHistory(label, mutator) {
  return recordHistory(label, mutator);
}

function getBarChartTime(bar, timeframe = store.getCurrentTimeframe()) {
  return getProjectedBarChartTime(bar, timeframe);
}

function findDisplayBarByChartTime(time) {
  if (time === undefined || time === null) return null;
  return findDisplayBarFast(store.getDisplayBars(), time, store.getCurrentTimeframe());
}

function findSecondaryDisplayBarByChartTime(time) {
  if (time === undefined || time === null) return null;
  return findDisplayBarFast(
    secondaryStore.getSecondaryDisplayBars(),
    time,
    secondaryStore.getSecondaryTimeframe()
  );
}

function getPickChartContext(e) {
  const isSecondary = e?.currentTarget?.id === 'secondary-chart';
  if (isSecondary) {
    return {
      chartEl: document.getElementById('secondary-chart'),
      coordinateToTime: (x) => secondaryChart.getSecondaryChart()?.timeScale().coordinateToTime(x),
      findBar: findSecondaryDisplayBarByChartTime,
      showCursor: secondaryChart.showSecondaryPickPreviewCursor,
      hideCursor: secondaryChart.hideSecondaryPickPreviewCursor,
      timeframe: () => secondaryStore.getSecondaryTimeframe(),
    };
  }
  return {
    chartEl: document.getElementById('chart'),
    coordinateToTime: chart.coordinateToTime,
    findBar: findDisplayBarByChartTime,
    showCursor: chart.showPickPreviewCursor,
    hideCursor: chart.hidePickPreviewCursor,
    timeframe: () => store.getCurrentTimeframe(),
  };
}

function getSegmentResponse(segment, pdaId) {
  return (Array.isArray(segment?.pdaResponses) ? segment.pdaResponses : []).find(
    (response) => response.pdaId === pdaId
  );
}

function getActorFieldLabel(actorField) {
  if (actorField === 'firstBarTimestamp') return 'Actor First';
  if (actorField === 'lastBarTimestamp') return 'Actor Last';
  if (actorField === 'terminalBarTimestamp') return 'Actor Terminal';
  return 'Actor Bar';
}

function updateReactionEvidenceList(segment, pdaId, updater) {
  const response = getSegmentResponse(segment, pdaId);
  if (!response) return;
  const evidenceList = normalizeReactionEvidenceList(response.reactionEvidence);
  recordInspectorHistory('Update Reaction Evidence', () => updatePdaResponse(segment.id, pdaId, {
    reactionEvidence: updater(evidenceList),
  }));
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
  const secondaryTimeframe = timeframeToString(secondaryStore.getSecondaryTimeframe());
  const actorTimeframe = evidence.actor?.timeframe || currentTimeframe;
  if (actorTimeframe !== currentTimeframe && actorTimeframe !== secondaryTimeframe) {
    bus.emit('status:update', {
      text: `Actor TF ${actorTimeframe} 与主图 ${currentTimeframe} / 副图 ${secondaryTimeframe} 都不一致，不能 pick`,
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

export function createSegmentInspectorActionController({
  getCurrentSegment,
  getCurrentSegmentGroup,
  getBodyEl,
  renderEmpty,
}) {
  function clearActorPickState({ silent = false } = {}) {
    if (!actorPickState) return false;
    actorPickState = null;
    chart.hidePickPreviewCursor();
    secondaryChart.hideSecondaryPickPreviewCursor();
    if (!silent) {
      bus.emit('status:update', { text: 'Actor bar pick 已取消', isError: false });
    }
    return true;
  }

  function handleActorPickChartClick(e) {
    if (!actorPickState) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const pickContext = getPickChartContext(e);
    if (!pickContext.chartEl) return;

    const rect = pickContext.chartEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pickContext.coordinateToTime(x);
    const bar = pickContext.findBar(time);
    if (!bar) {
      pickContext.hideCursor();
      return;
    }

    const segment = getSegmentById(actorPickState.segmentId);
    if (!segment) {
      clearActorPickState({ silent: true });
      return;
    }

    const { pdaId, evidenceId, actorField } = actorPickState;
    clearActorPickState({ silent: true });
    recordInspectorHistory('Pick Reaction Evidence Bar', () => patchReactionEvidence(segment, pdaId, evidenceId, (evidence) => ({
      actor: {
        ...(evidence.actor || {}),
        [actorField]: bar.timestamp,
        timeframe: timeframeToString(pickContext.timeframe()),
      },
    })));
    bus.emit('status:update', {
      text: `${getActorFieldLabel(actorField)} 已选择: ${bar.time || bar.tradingDay}`,
      isError: false,
    });
  }

  function handleActorPickHover(param, source = 'primary') {
    if (!actorPickState) return;
    if (source === 'secondary') chart.hidePickPreviewCursor();
    else secondaryChart.hideSecondaryPickPreviewCursor();
    const pickContext = source === 'secondary'
      ? getPickChartContext({ currentTarget: { id: 'secondary-chart' } })
      : getPickChartContext({ currentTarget: { id: 'chart' } });
    const bar = pickContext.findBar(param?.time);
    if (!bar) {
      pickContext.hideCursor();
      return;
    }
    pickContext.showCursor(getBarChartTime(bar, pickContext.timeframe()));
  }

  function handleSegmentChange(action, target) {
    const segment = getCurrentSegment();
    if (segment) {
      if (action === 'segment-toggle-label') {
        recordInspectorHistory('Toggle Segment Label', () => updateSegment(segment.id, {
          display: {
            ...(segment.display || {}),
            showLabel: target.checked,
          },
        }));
        return true;
      }

      if (action === 'segment-toggle-isolate') {
        recordInspectorHistory('Toggle Segment Isolate', () => setSegmentIsolated(segment.id, target.checked));
        return true;
      }

      if (action === 'segment-isolate-display-mode') {
        recordInspectorHistory('Update Segment Display', () => updateSegment(segment.id, {
          display: {
            ...(segment.display || {}),
            isolateDisplayMode: target.value,
          },
        }));
        return true;
      }

      if (action === 'segment-isolate-previous-count') {
        const parsed = Number(target.value);
        recordInspectorHistory('Update Segment Isolate Count', () => updateSegment(segment.id, {
          display: {
            ...(segment.display || {}),
            isolatePreviousCount: Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0,
          },
        }));
        return true;
      }

      if (action === 'segment-toggle-isolate-previous-pda') {
        recordInspectorHistory('Update Segment Isolate PDA', () => updateSegment(segment.id, {
          display: {
            ...(segment.display || {}),
            isolatePreviousIncludePda: target.checked,
          },
        }));
        return true;
      }

      if (action === 'segment-narrative') {
        recordInspectorHistory('Update Segment Narrative', () => updateSegment(segment.id, { narrative: target.value }));
        return true;
      }

      if (action === 'segment-tags') {
        recordInspectorHistory('Update Segment Tags', () => updateSegment(segment.id, { tags: parseTags(target.value) }));
        return true;
      }

      if (action === 'segment-response-relation') {
        recordInspectorHistory('Update PDA Response', () => updatePdaResponse(segment.id, target.dataset.pdaId, { relation: target.value }));
        return true;
      }

      if (action === 'segment-response-display-mode') {
        recordInspectorHistory('Update PDA Response Display', () => updatePdaResponse(segment.id, target.dataset.pdaId, {
          displayMode: target.value,
          selected: target.value === 'highlight',
        }));
        return true;
      }

      if (action === 'segment-response-note') {
        recordInspectorHistory('Update PDA Response Note', () => updatePdaResponse(segment.id, target.dataset.pdaId, { note: target.value }));
        return true;
      }

      if (action === 'reaction-evidence-entry-side') {
        patchReactionEvidence(segment, target.dataset.pdaId, target.dataset.evidenceId, (evidence) => ({
          params: {
            ...(evidence.params || {}),
            entrySide: target.value,
          },
        }));
        return true;
      }

      if (action === 'reaction-evidence-timeframe') {
        patchReactionEvidence(segment, target.dataset.pdaId, target.dataset.evidenceId, (evidence) => ({
          actor: {
            ...(evidence.actor || {}),
            timeframe: target.value,
          },
        }));
        return true;
      }

      if (action === 'reaction-evidence-first-bar') {
        patchReactionEvidence(segment, target.dataset.pdaId, target.dataset.evidenceId, (evidence) => ({
          actor: {
            ...(evidence.actor || {}),
            firstBarTimestamp: parseEvidenceTimestamp(target.value),
          },
        }));
        return true;
      }

      if (action === 'reaction-evidence-last-bar') {
        patchReactionEvidence(segment, target.dataset.pdaId, target.dataset.evidenceId, (evidence) => ({
          actor: {
            ...(evidence.actor || {}),
            lastBarTimestamp: parseEvidenceTimestamp(target.value),
          },
        }));
        return true;
      }

      if (action === 'reaction-evidence-terminal-bar') {
        patchReactionEvidence(segment, target.dataset.pdaId, target.dataset.evidenceId, (evidence) => ({
          actor: {
            ...(evidence.actor || {}),
            terminalBarTimestamp: parseEvidenceTimestamp(target.value),
          },
        }));
        return true;
      }

      if (action === 'reaction-evidence-note') {
        patchReactionEvidence(segment, target.dataset.pdaId, target.dataset.evidenceId, () => ({
          note: target.value,
        }));
        return true;
      }

      if (action === 'segment-group-outcome') {
        recordInspectorHistory('Update Composite Outcome', () => updateSegmentGroup(target.dataset.groupId, { outcome: target.value }));
        return true;
      }

      if (action === 'segment-group-notes') {
        recordInspectorHistory('Update Composite Notes', () => updateSegmentGroup(target.dataset.groupId, { notes: target.value }));
        return true;
      }

      if (action === 'segment-group-target') {
        recordInspectorHistory('Set Composite Draft Target', () => setDraftSegmentGroupTarget(target.value));
        return true;
      }
    }

    const segmentGroup = getCurrentSegmentGroup();
    if (segmentGroup) {
      if (action === 'segment-group-current-target') {
        recordInspectorHistory('Update Composite Target', () => updateSegmentGroup(segmentGroup.id, { targetSegmentId: target.value }));
        return true;
      }

      if (action === 'segment-group-current-objective') {
        recordInspectorHistory('Update Composite Objective', () => updateSegmentGroup(segmentGroup.id, { objective: target.value }));
        return true;
      }

      if (action === 'segment-group-current-outcome') {
        recordInspectorHistory('Update Composite Outcome', () => updateSegmentGroup(segmentGroup.id, { outcome: target.value }));
        return true;
      }

      if (action === 'segment-group-current-notes') {
        recordInspectorHistory('Update Composite Notes', () => updateSegmentGroup(segmentGroup.id, { notes: target.value }));
        return true;
      }

      if (action === 'segment-group-toggle-label') {
        recordInspectorHistory('Toggle Composite Label', () => updateSegmentGroup(segmentGroup.id, {
          display: {
            ...(segmentGroup.display || {}),
            showLabel: target.checked,
          },
        }));
        return true;
      }
    }

    return false;
  }

  function handleSegmentClick(action, actionEl) {
    const segment = getCurrentSegment();
    if (segment) {
      if (action === 'reaction-evidence-add-fvg') {
        recordInspectorHistory('Add Reaction Evidence', () =>
          addReactionEvidence(segment, actionEl.dataset.pdaId, EVIDENCE_TYPES.FVG_RESPECT)
        );
        return true;
      }

      if (action === 'reaction-evidence-add-liquidity') {
        recordInspectorHistory('Add Reaction Evidence', () =>
          addReactionEvidence(segment, actionEl.dataset.pdaId, EVIDENCE_TYPES.LIQUIDITY_SWEEP)
        );
        return true;
      }

      if (action === 'reaction-evidence-delete') {
        recordInspectorHistory('Delete Reaction Evidence', () =>
          updateReactionEvidenceList(segment, actionEl.dataset.pdaId, (evidenceList) =>
            evidenceList.filter((evidence) => evidence.id !== actionEl.dataset.evidenceId)
          )
        );
        return true;
      }

      if (action === 'reaction-evidence-pick-actor-bar') {
        startActorBarPick(segment, {
          pdaId: actionEl.dataset.pdaId,
          evidenceId: actionEl.dataset.evidenceId,
          actorField: actionEl.dataset.actorField,
        });
        return true;
      }

      if (action === 'segment-delete') {
        recordInspectorHistory('Delete Segment', () => deleteSegment(segment.id));
        clearSegmentSelection();
        renderEmpty();
        return true;
      }

      if (action === 'segment-response-remove') {
        recordInspectorHistory('Remove PDA Response', () => removePdaResponse(segment.id, actionEl.dataset.pdaId));
        return true;
      }

      if (action === 'segment-group-draft-add') {
        recordInspectorHistory('Add Segment To Composite Draft', () => addSegmentToDraftGroup(segment.id));
        return true;
      }

      if (action === 'segment-group-draft-remove') {
        recordInspectorHistory('Remove Segment From Composite Draft', () => removeSegmentFromDraftGroup(segment.id));
        return true;
      }

      if (action === 'segment-group-draft-clear') {
        recordInspectorHistory('Clear Composite Draft', () => clearDraftSegmentGroup());
        return true;
      }

      if (action === 'segment-group-create') {
        const bodyEl = getBodyEl();
        const targetSegmentId = bodyEl?.querySelector('[data-inspector-action="segment-group-target"]')?.value || '';
        const objective =
          bodyEl?.querySelector('[data-inspector-action="segment-group-objective"]')?.value ||
          'break-previous-extreme';
        const outcome =
          bodyEl?.querySelector('[data-inspector-action="segment-group-create-outcome"]')?.value || 'pending';
        const group = recordInspectorHistory('Create Composite Move', () =>
          createCompositeMove({ targetSegmentId, objective, outcome })
        );
        bus.emit('status:update', {
          text: group ? `已创建 Composite Move: ${group.childSegmentIds.length} legs` : '至少需要 2 个 staged segments',
          isError: !group,
        });
        return true;
      }

      if (action === 'segment-group-delete') {
        recordInspectorHistory('Delete Composite Move', () => deleteSegmentGroup(actionEl.dataset.groupId));
        return true;
      }
    }

    const segmentGroup = getCurrentSegmentGroup();
    if (segmentGroup && action === 'segment-group-current-delete') {
      recordInspectorHistory('Delete Composite Move', () => deleteSegmentGroup(segmentGroup.id));
      clearSegmentGroupSelection();
      renderEmpty();
      return true;
    }

    return false;
  }

  return {
    clearActorPickState,
    handleActorPickChartClick,
    handleActorPickHover,
    handleSecondaryActorPickHover: (param) => handleActorPickHover(param, 'secondary'),
    handleSegmentChange,
    handleSegmentClick,
  };
}
