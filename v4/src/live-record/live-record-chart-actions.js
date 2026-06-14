import * as bus from '../event-bus.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { recordHistory } from '../history/history-manager.js';
import { getSmtRecords } from '../smt/smt-store.js';
import {
  clearActiveLiveRecord,
  createLiveRecordFromAnchor,
  getActiveLiveRecord,
  patchActiveLiveRecord,
} from './live-record-active.js';
import {
  LIVE_RECORD_DIRECTIONS,
  LIVE_RECORD_REASON_CATEGORIES,
  LIVE_RECORD_REF_ROLES,
  LIVE_RECORD_REF_TYPES,
  LIVE_RECORD_TARGET_ROLES,
  LIVE_RECORD_TARGET_TYPES,
} from './live-record-types.js';

export const LIVE_RECORD_CHART_ACTIONS = Object.freeze({
  NEW_HERE: 'live-record-new-here',
  CLEAR_ACTIVE: 'live-record-clear-active',
  MOVE_ANCHOR: 'live-record-move-anchor',
  SET_ENTRY: 'live-record-set-entry',
  SET_ENTRY_END: 'live-record-set-entry-end',
  SET_MARKET_STRUCTURE_SHIFT: 'live-record-set-market-structure-shift',
  SET_MARKET_STRUCTURE_SHIFT_END: 'live-record-set-market-structure-shift-end',
  SET_STOP_LOSS: 'live-record-set-stop-loss',
  SET_STOP_LOSS_END: 'live-record-set-stop-loss-end',
  SET_TARGET_INTERNAL_1: 'live-record-set-target-internal-1',
  SET_TARGET_INTERNAL_1_END: 'live-record-set-target-internal-1-end',
  SET_TARGET_INTERNAL_2: 'live-record-set-target-internal-2',
  SET_TARGET_INTERNAL_2_END: 'live-record-set-target-internal-2-end',
  SET_TARGET_INTERNAL_3: 'live-record-set-target-internal-3',
  SET_TARGET_INTERNAL_3_END: 'live-record-set-target-internal-3-end',
  SET_TARGET_SWING_POINT: 'live-record-set-target-swing-point',
  SET_TARGET_SWING_POINT_END: 'live-record-set-target-swing-point-end',
  SET_TARGET_EXTERNAL_1: 'live-record-set-target-external-1',
  SET_TARGET_EXTERNAL_1_END: 'live-record-set-target-external-1-end',
  SET_TARGET_EXTERNAL_2: 'live-record-set-target-external-2',
  SET_TARGET_EXTERNAL_2_END: 'live-record-set-target-external-2-end',
  SET_FINAL_TARGET: 'live-record-set-final-target',
  SET_FINAL_TARGET_END: 'live-record-set-final-target-end',
  SET_RESULT_EXIT: 'live-record-set-result-exit',
  SET_ALL_ENDS: 'live-record-set-all-ends',
  LINK_PDA: 'live-record-link-pda',
  LINK_SEGMENT: 'live-record-link-segment',
  LINK_COMPOSITE: 'live-record-link-composite',
  LINK_LATEST_SMT: 'live-record-link-latest-smt',
  LINK_CHART_NOTE: 'live-record-link-chart-note',
});

const LIVE_RECORD_TARGET_MENU_ITEMS = Object.freeze([
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_1, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_1_END, 'Target Internal 1'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_2, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_2_END, 'Target Internal 2'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_3, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_3_END, 'Target Internal 3'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_SWING_POINT, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_SWING_POINT_END, 'Target Swing Point'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_1, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_1_END, 'Target External 1'],
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_2, LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_2_END, 'Target External 2'],
  [LIVE_RECORD_CHART_ACTIONS.SET_FINAL_TARGET, LIVE_RECORD_CHART_ACTIONS.SET_FINAL_TARGET_END, 'Target External 3'],
]);

const LIVE_RECORD_TARGET_ACTIONS = Object.freeze({
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_1]: {
    role: LIVE_RECORD_TARGET_ROLES.INTERNAL_1,
    targetType: LIVE_RECORD_TARGET_TYPES.INTERNAL,
    label: 'Target Internal 1',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_2]: {
    role: LIVE_RECORD_TARGET_ROLES.INTERNAL_2,
    targetType: LIVE_RECORD_TARGET_TYPES.INTERNAL,
    label: 'Target Internal 2',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_3]: {
    role: LIVE_RECORD_TARGET_ROLES.INTERNAL_3,
    targetType: LIVE_RECORD_TARGET_TYPES.INTERNAL,
    label: 'Target Internal 3',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_SWING_POINT]: {
    role: LIVE_RECORD_TARGET_ROLES.SWING_POINT,
    targetType: LIVE_RECORD_TARGET_TYPES.SWING,
    label: 'Target Swing Point',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_1]: {
    role: LIVE_RECORD_TARGET_ROLES.EXTERNAL_1,
    targetType: LIVE_RECORD_TARGET_TYPES.EXTERNAL,
    label: 'Target External 1',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_2]: {
    role: LIVE_RECORD_TARGET_ROLES.EXTERNAL_2,
    targetType: LIVE_RECORD_TARGET_TYPES.EXTERNAL,
    label: 'Target External 2',
  },
  [LIVE_RECORD_CHART_ACTIONS.SET_FINAL_TARGET]: {
    role: LIVE_RECORD_TARGET_ROLES.FINAL,
    targetType: LIVE_RECORD_TARGET_TYPES.FINAL,
    label: 'Target External 3',
  },
});

const LIVE_RECORD_TARGET_END_ACTIONS = Object.freeze({
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_1_END]: LIVE_RECORD_TARGET_ROLES.INTERNAL_1,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_2_END]: LIVE_RECORD_TARGET_ROLES.INTERNAL_2,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_INTERNAL_3_END]: LIVE_RECORD_TARGET_ROLES.INTERNAL_3,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_SWING_POINT_END]: LIVE_RECORD_TARGET_ROLES.SWING_POINT,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_1_END]: LIVE_RECORD_TARGET_ROLES.EXTERNAL_1,
  [LIVE_RECORD_CHART_ACTIONS.SET_TARGET_EXTERNAL_2_END]: LIVE_RECORD_TARGET_ROLES.EXTERNAL_2,
  [LIVE_RECORD_CHART_ACTIONS.SET_FINAL_TARGET_END]: LIVE_RECORD_TARGET_ROLES.FINAL,
});

const LIVE_RECORD_LINK_ACTIONS = Object.freeze({
  [LIVE_RECORD_CHART_ACTIONS.LINK_PDA]: {
    getTarget: (context) => context.pdaHit?.id ? context.pdaHit : null,
    buildRef: (hit) => ({
      type: LIVE_RECORD_REF_TYPES.PDA,
      id: hit.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      sourceContext: hit.type || '',
    }),
    label: () => 'PDA linked to active Live Record',
  },
  [LIVE_RECORD_CHART_ACTIONS.LINK_SEGMENT]: {
    getTarget: (context) => context.segmentHit?.id ? context.segmentHit : null,
    buildRef: (hit) => ({
      type: LIVE_RECORD_REF_TYPES.SEGMENT,
      id: hit.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      sourceContext: hit.type || hit.kind || '',
    }),
    label: () => 'Segment linked to active Live Record',
  },
  [LIVE_RECORD_CHART_ACTIONS.LINK_COMPOSITE]: {
    getTarget: (context) => context.segmentGroupHit?.id ? context.segmentGroupHit : null,
    buildRef: (hit) => ({
      type: LIVE_RECORD_REF_TYPES.COMPOSITE,
      id: hit.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
    }),
    label: () => 'Composite linked to active Live Record',
  },
  [LIVE_RECORD_CHART_ACTIONS.LINK_LATEST_SMT]: {
    getTarget: () => getSmtRecords().filter((record) => record.primaryInstrument === getPrimaryInstrument()).at(-1) || null,
    buildRef: (smt) => ({
      type: LIVE_RECORD_REF_TYPES.SMT,
      id: smt.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      sourceContext: smt.type || '',
    }),
    label: () => 'Latest SMT linked to active Live Record',
  },
  [LIVE_RECORD_CHART_ACTIONS.LINK_CHART_NOTE]: {
    getTarget: (context) => context.chartNote?.id ? context.chartNote : null,
    buildRef: (note) => ({
      type: LIVE_RECORD_REF_TYPES.CHART_NOTE,
      id: note.id,
      role: LIVE_RECORD_REF_ROLES.CONTEXT,
      sourceTimeframeLabel: note.timeframe ? String(note.timeframe) : '',
      sourceContext: note.kind || '',
    }),
    label: () => 'Chart Note linked to active Live Record',
  },
});

function getAnchorPrice(bar = {}, fallbackPrice = null) {
  const price = Number(fallbackPrice);
  if (Number.isFinite(price)) return price;
  const close = Number(bar.close);
  return Number.isFinite(close) ? close : null;
}

function getChartAnchor({ bar = null, price = null, timeframe = '' } = {}) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return null;
  return {
    timestamp: Number(bar.timestamp),
    timeframe,
    price: getAnchorPrice(bar, price),
  };
}

function getChartEnd({ bar = null, timeframe = '' } = {}) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return null;
  return {
    endTimestamp: Number(bar.timestamp),
    endTimeframe: timeframe,
  };
}

function hasElementValue(element = {}) {
  return element.timestamp !== null
    || element.timestamp !== undefined
    || element.price !== null
    || element.price !== undefined;
}

function upsertTarget(targets = [], targetPatch = {}) {
  const role = targetPatch.role || targetPatch.id;
  const nextTarget = {
    id: role,
    ...targetPatch,
  };
  const existingTargets = Array.isArray(targets) ? targets : [];
  const index = existingTargets.findIndex((target) => target.role === role || target.id === role);
  if (index < 0) return [...existingTargets, nextTarget];
  return [
    ...existingTargets.slice(0, index),
    {
      ...existingTargets[index],
      ...nextTarget,
    },
    ...existingTargets.slice(index + 1),
  ];
}

function setTargetEnd(targets = [], role = '', end = {}) {
  const existingTargets = Array.isArray(targets) ? targets : [];
  return existingTargets.map((target) => (
    target.role === role || target.id === role
      ? { ...target, ...end }
      : target
  ));
}

function setAllElementEnds(execution = {}, end = {}) {
  const targets = Array.isArray(execution.targets) ? execution.targets : [];
  return {
    entry: hasElementValue(execution.entry) ? { ...(execution.entry || {}), ...end } : execution.entry,
    marketStructureShift: hasElementValue(execution.marketStructureShift)
      ? { ...(execution.marketStructureShift || {}), ...end }
      : execution.marketStructureShift,
    stopLoss: hasElementValue(execution.stopLoss) ? { ...(execution.stopLoss || {}), ...end } : execution.stopLoss,
    targets: targets.map((target) => (hasElementValue(target) ? { ...target, ...end } : target)),
  };
}

function refsEqual(left = {}, right = {}) {
  return left.type === right.type
    && left.id === right.id
    && left.role === right.role;
}

function appendUniqueRef(refs = [], ref = {}) {
  const existing = Array.isArray(refs) ? refs : [];
  return existing.some((item) => refsEqual(item, ref)) ? existing : [...existing, ref];
}

function buildLiveRecordRefPatch(active = {}, ref = {}) {
  const reasons = Array.isArray(active.reasons) && active.reasons.length
    ? active.reasons
    : [{ id: 'reason_1', category: LIVE_RECORD_REASON_CATEGORIES.OTHER, note: '', refs: [] }];
  const firstReason = reasons[0] || {};
  return {
    reasons: [
      {
        ...firstReason,
        refs: appendUniqueRef(firstReason.refs, ref),
      },
      ...reasons.slice(1),
    ],
    linkedObjectRefs: appendUniqueRef(active.linkedObjectRefs, ref),
  };
}

function patchActiveFromChart(label, patchFactory, context = {}) {
  const active = getActiveLiveRecord();
  if (!active) {
    bus.emit('status:update', { text: 'No active Live Record', isError: true });
    return true;
  }
  if (!context.bar || !Number.isFinite(Number(context.bar.timestamp))) {
    bus.emit('status:update', { text: 'Cannot update Live Record: no chart bar selected', isError: true });
    return true;
  }
  const patch = patchFactory(active);
  const updated = recordHistory(label, () => patchActiveLiveRecord(patch));
  bus.emit('status:update', {
    text: updated?.id ? `${label}: ${updated.id}` : `${label} failed`,
    isError: !updated?.id,
  });
  return true;
}

function linkContextObjectToActiveLiveRecord(action, context = {}) {
  const active = getActiveLiveRecord();
  if (!active) {
    bus.emit('status:update', { text: 'No active Live Record', isError: true });
    return true;
  }
  const actionConfig = LIVE_RECORD_LINK_ACTIONS[action];
  if (!actionConfig) return false;
  const target = actionConfig.getTarget(context);
  if (!target) {
    bus.emit('status:update', { text: 'No context object to link to active Live Record', isError: true });
    return true;
  }
  const ref = actionConfig.buildRef(target);
  const updated = recordHistory('Link Evidence To Live Record', () =>
    patchActiveLiveRecord(buildLiveRecordRefPatch(active, ref))
  );
  bus.emit('status:update', {
    text: updated?.id ? actionConfig.label(target) : 'Live Record evidence link failed',
    isError: !updated?.id,
  });
  return true;
}

function renderEvidenceLinkRows({ active, pdaHit, segmentHit, segmentGroupHit, chartNote } = {}) {
  const activeDisabled = active ? '' : 'disabled';
  const pdaDisabled = active && pdaHit ? '' : 'disabled';
  const segmentDisabled = active && segmentHit ? '' : 'disabled';
  const compositeDisabled = active && segmentGroupHit ? '' : 'disabled';
  const smtDisabled = active && getSmtRecords().filter((record) => record.primaryInstrument === getPrimaryInstrument()).length ? '' : 'disabled';
  const chartNoteDisabled = active && chartNote ? '' : 'disabled';
  return `
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_PDA}" ${activeDisabled || pdaDisabled}>Link PDA To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_SEGMENT}" ${activeDisabled || segmentDisabled}>Link Segment To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_COMPOSITE}" ${activeDisabled || compositeDisabled}>Link Composite To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_LATEST_SMT}" ${activeDisabled || smtDisabled}>Link Latest SMT To Active Live Record</button>
    <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.LINK_CHART_NOTE}" ${activeDisabled || chartNoteDisabled}>Link Chart Note To Active Live Record</button>
  `;
}

function getActiveLiveRecordLabel() {
  const active = getActiveLiveRecord();
  if (!active) return 'No active live record';
  const direction = active.direction === LIVE_RECORD_DIRECTIONS.LONG
    ? 'Long'
    : active.direction === LIVE_RECORD_DIRECTIONS.SHORT
      ? 'Short'
      : 'Unknown';
  return `${direction} · ${active.id.slice(0, 18)}`;
}

function renderTargetSubmenu({ activeDisabled, disabled, isEnd = false } = {}) {
  const actionDisabled = activeDisabled || disabled;
  const label = isEnd ? 'Target Ends' : 'Targets';
  const rows = LIVE_RECORD_TARGET_MENU_ITEMS
    .map(([setAction, endAction, itemLabel]) => `
      <button class="pda-menu-item" data-pda-action="${isEnd ? endAction : setAction}" ${actionDisabled}>
        ${isEnd ? `Set ${itemLabel} End Here` : `Set ${itemLabel} Here`}
      </button>
    `)
    .join('');
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">${label}</div>
      <div class="pda-submenu-panel">
        ${rows}
      </div>
    </div>
  `;
}

export function renderLiveRecordMenuItems({
  bar,
  pdaHit = null,
  segmentHit = null,
  segmentGroupHit = null,
  chartNote = null,
  isShift = false,
} = {}) {
  const disabled = bar ? '' : 'disabled';
  const active = getActiveLiveRecord();
  const activeDisabled = active ? '' : 'disabled';
  const clearActiveRow = active
    ? `<button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.CLEAR_ACTIVE}">Close Active Live Record</button>`
    : '';
  const actionRows = isShift
    ? `
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_ENTRY_END}" ${activeDisabled || disabled}>Set Entry End Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT_END}" ${activeDisabled || disabled}>Set MSS End Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS_END}" ${activeDisabled || disabled}>Set Stop Loss End Here</button>
        ${renderTargetSubmenu({ activeDisabled, disabled, isEnd: true })}
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_ALL_ENDS}" ${activeDisabled || disabled}>Set All Ends Here</button>
      `
    : `
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.MOVE_ANCHOR}" ${activeDisabled || disabled}>Set Active Live Record Anchor Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_ENTRY}" ${activeDisabled || disabled}>Set Entry Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT}" ${activeDisabled || disabled}>Set MSS Here</button>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS}" ${activeDisabled || disabled}>Set Stop Loss Here</button>
        ${renderTargetSubmenu({ activeDisabled, disabled })}
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.SET_RESULT_EXIT}" ${activeDisabled || disabled}>Set Result / Exit Here</button>
      `;
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Live Records</div>
      <div class="pda-submenu-panel">
        <div class="pda-menu-item is-muted">${getActiveLiveRecordLabel()}</div>
        <button class="pda-menu-item" data-pda-action="${LIVE_RECORD_CHART_ACTIONS.NEW_HERE}" ${disabled}>New Live Record Here</button>
        ${renderEvidenceLinkRows({ active, pdaHit, segmentHit, segmentGroupHit, chartNote })}
        ${actionRows}
        ${clearActiveRow}
      </div>
    </div>
  `;
}

export function handleLiveRecordChartAction(action, {
  bar = null,
  price = null,
  timeframe = '',
  pdaHit = null,
  segmentHit = null,
  segmentGroupHit = null,
  chartNote = null,
} = {}) {
  if (action === LIVE_RECORD_CHART_ACTIONS.CLEAR_ACTIVE) {
    const cleared = clearActiveLiveRecord();
    bus.emit('status:update', {
      text: cleared ? 'Active Live Record closed' : 'No active Live Record',
      isError: false,
    });
    return true;
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.MOVE_ANCHOR) {
    return patchActiveFromChart('Move Live Record Anchor', () => ({
      anchor: getChartAnchor({ bar, price, timeframe }),
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_ENTRY) {
    return patchActiveFromChart('Set Live Record Entry', () => ({
      execution: {
        entry: {
          ...getChartAnchor({ bar, price, timeframe }),
          endTimestamp: null,
          endTimeframe: 'manual',
        },
      },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT) {
    return patchActiveFromChart('Set Live Record MSS', () => ({
      execution: {
        marketStructureShift: {
          ...getChartAnchor({ bar, price, timeframe }),
          endTimestamp: null,
          endTimeframe: 'manual',
        },
      },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS) {
    return patchActiveFromChart('Set Live Record Stop Loss', () => ({
      execution: {
        stopLoss: {
          ...getChartAnchor({ bar, price, timeframe }),
          endTimestamp: null,
          endTimeframe: 'manual',
        },
      },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_ENTRY_END) {
    return patchActiveFromChart('Set Live Record Entry End', () => ({
      execution: { entry: getChartEnd({ bar, timeframe }) },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_MARKET_STRUCTURE_SHIFT_END) {
    return patchActiveFromChart('Set Live Record MSS End', () => ({
      execution: { marketStructureShift: getChartEnd({ bar, timeframe }) },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_STOP_LOSS_END) {
    return patchActiveFromChart('Set Live Record Stop Loss End', () => ({
      execution: { stopLoss: getChartEnd({ bar, timeframe }) },
    }), { bar });
  }
  if (LIVE_RECORD_TARGET_ACTIONS[action]) {
    return patchActiveFromChart('Set Live Record Target', (active) => {
      const target = LIVE_RECORD_TARGET_ACTIONS[action];
      return {
        execution: {
          targets: upsertTarget(active.execution?.targets, {
            ...target,
            ...getChartAnchor({ bar, price, timeframe }),
            endTimestamp: null,
            endTimeframe: 'manual',
          }),
        },
      };
    }, { bar });
  }
  if (LIVE_RECORD_TARGET_END_ACTIONS[action]) {
    return patchActiveFromChart('Set Live Record Target End', (active) => ({
      execution: {
        targets: setTargetEnd(
          active.execution?.targets,
          LIVE_RECORD_TARGET_END_ACTIONS[action],
          getChartEnd({ bar, timeframe })
        ),
      },
    }), { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_RESULT_EXIT) {
    return patchActiveFromChart('Set Live Record Result Exit', () => {
      const anchor = getChartAnchor({ bar, price, timeframe });
      return {
        result: {
          exitTimestamp: anchor.timestamp,
          exitTimeframe: anchor.timeframe,
          exitPrice: anchor.price,
        },
      };
    }, { bar });
  }
  if (action === LIVE_RECORD_CHART_ACTIONS.SET_ALL_ENDS) {
    return patchActiveFromChart('Set Live Record Ends', (active) => ({
      execution: setAllElementEnds(active.execution, getChartEnd({ bar, timeframe })),
    }), { bar });
  }
  if (LIVE_RECORD_LINK_ACTIONS[action]) {
    return linkContextObjectToActiveLiveRecord(action, {
      pdaHit,
      segmentHit,
      segmentGroupHit,
      chartNote,
    });
  }
  if (action !== LIVE_RECORD_CHART_ACTIONS.NEW_HERE) return false;
  if (!bar || !Number.isFinite(Number(bar.timestamp))) {
    bus.emit('status:update', { text: 'Cannot create Live Record: no chart bar selected', isError: true });
    return true;
  }
  const anchorPrice = getAnchorPrice(bar, price);
  const created = recordHistory('Create Live Record', () => createLiveRecordFromAnchor({
    timestamp: Number(bar.timestamp),
    timeframe,
    price: anchorPrice,
  }, {
    instrument: getPrimaryInstrument(),
    summary: '',
  }));
  bus.emit('status:update', {
    text: created?.id ? `Live Record created: ${created.id}` : 'Live Record creation failed',
    isError: !created?.id,
  });
  return true;
}
