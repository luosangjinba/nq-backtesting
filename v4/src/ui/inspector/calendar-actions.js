import * as bus from '../../event-bus.js';
import { VIEWPORT_TARGETS, locateChartRange } from '../../chart/viewport-router.js';
import { updateTimeOverlaySettings } from '../../time-overlays/time-overlay-store.js';
import * as store from '../../data/bar-store.js';
import { getReplayVisibleBars } from '../replay-controls.js';
import { updateEconomicCalendarFilters } from '../../economic-calendar/economic-calendar-store.js';
import { clearSelection as clearPdaSelection } from '../../pda/pda-selection.js';
import { deleteAnnotation, getAnnotationById } from '../../pda/pda-store.js';
import { locatePdaProjection } from '../../pda/pda-locate-actions.js';
import { CALENDAR_OBJECT_TYPES } from '../../calendar/calendar-types.js';
import { getCalendarDateTimestamp } from './calendar-panel.js';
import {
  isCalendarObjectHidden,
  setCalendarDayChartObjectsHidden,
  setCalendarDayGroupObjectsHidden,
  setCalendarObjectHidden,
} from './calendar-visibility-actions.js';
import { clearChartNoteFocusedDate, setChartNoteFocusedDate } from '../../chart-notes/chart-note-visible-day.js';
import { renderChartNotes } from '../../chart-notes/chart-note-renderer.js';
import { dateKeyFromTimestamp } from '../../utils.js';

function getChartNoteFocusAnchorBars() {
  const replayBars = getReplayVisibleBars();
  return Array.isArray(replayBars) ? replayBars : store.getDisplayBars();
}

function getLocatedPdaTargetLabels(result = {}) {
  return [
    result.primary?.located ? 'primary' : '',
    result.secondary?.located ? 'secondary' : '',
    result.comparison?.located ? 'comparison' : '',
  ].filter(Boolean);
}

function formatLocatedTargetList(targets = []) {
  if (targets.length <= 1) return targets[0] || '';
  if (targets.length === 2) return targets.join(' and ');
  return `${targets.slice(0, -1).join(', ')} and ${targets.at(-1)}`;
}

export function createCalendarActionController({
  getSelectedDate,
  setSelectedDate,
  refreshSelection,
  captureCalendarOpenGroups,
  recordInspectorHistory,
  openCalendarObject,
} = {}) {
  function locatePdaFromCalendar(actionEl) {
    const annotation = getAnnotationById(actionEl.dataset.objectId);
    if (!annotation) {
      bus.emit('status:update', { text: 'Calendar PDA not found', isError: true });
      return true;
    }
    const result = locatePdaProjection(annotation);
    const label = actionEl.dataset.objectLabel || 'PDA';
    const targets = getLocatedPdaTargetLabels(result);
    bus.emit('status:update', {
      text: targets.length
        ? `Located ${label} on ${formatLocatedTargetList(targets)}`
        : `${label} has no locatable loaded chart`,
      isError: !result.located,
    });
    return true;
  }

  function locateCalendarObject(actionEl) {
    if (actionEl.dataset.objectType === CALENDAR_OBJECT_TYPES.PDA && actionEl.dataset.objectId) {
      return locatePdaFromCalendar(actionEl);
    }
    const start = Number(actionEl.dataset.locateStart);
    const end = Number(actionEl.dataset.locateEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      bus.emit('status:update', { text: 'Calendar object has no locatable time', isError: true });
      return true;
    }
    locateChartRange(VIEWPORT_TARGETS.BOTH, { start, end });
    const dateKey = dateKeyFromTimestamp(start);
    if (dateKey) {
      setChartNoteFocusedDate(dateKey, getChartNoteFocusAnchorBars());
      renderChartNotes();
    }
    const label = actionEl.dataset.objectLabel || 'Calendar object';
    bus.emit('status:update', { text: `Located ${label}`, isError: false });
    return true;
  }

  function handleClick(action, actionEl) {
    if (action === 'calendar-select-date') {
      const date = actionEl.dataset.calendarDate || getSelectedDate?.() || '';
      setSelectedDate?.(date, date);
      updateTimeOverlaySettings({ selectedDate: date });
      setChartNoteFocusedDate(date, getChartNoteFocusAnchorBars());
      renderChartNotes();
      const targetTimestamp = getCalendarDateTimestamp(date, '09:30');
      if (targetTimestamp !== null) {
        locateChartRange(VIEWPORT_TARGETS.BOTH, { start: targetTimestamp, end: targetTimestamp });
      }
      bus.emit('status:update', {
        text: targetTimestamp === null
          ? `Calendar selected ${date}`
          : `Calendar located ${date} 09:30`,
        isError: targetTimestamp === null,
      });
      refreshSelection?.();
      return true;
    }

    if (action === 'calendar-show-all-days') {
      updateTimeOverlaySettings({ selectedDate: '' });
      clearChartNoteFocusedDate();
      renderChartNotes();
      bus.emit('status:update', { text: 'Calendar overlays show all loaded days', isError: false });
      refreshSelection?.();
      return true;
    }

    if (action === 'economic-calendar-filter') {
      const key = actionEl.dataset.economicFilter;
      if (key) {
        updateEconomicCalendarFilters({ [key]: actionEl.checked });
        refreshSelection?.();
      }
      return true;
    }

    if (action === 'calendar-object-locate') {
      return locateCalendarObject(actionEl);
    }

    if (action === 'calendar-object-open') {
      const opened = Boolean(openCalendarObject?.(
        actionEl.dataset.objectType,
        actionEl.dataset.objectId,
        { sectionKey: actionEl.dataset.timeReactionSection || '' }
      ));
      bus.emit('status:update', {
        text: opened ? 'Calendar object opened' : 'Calendar object cannot be opened',
        isError: !opened,
      });
      return true;
    }

    if (action === 'calendar-object-toggle-hidden') {
      captureCalendarOpenGroups?.();
      const type = actionEl.dataset.objectType;
      const id = actionEl.dataset.objectId;
      const nextHidden = !isCalendarObjectHidden(type, id);
      const changed = recordInspectorHistory?.(nextHidden ? 'Hide Calendar Object' : 'Show Calendar Object', () => (
        setCalendarObjectHidden(type, id, nextHidden)
      ));
      if (type === CALENDAR_OBJECT_TYPES.CHART_NOTE) {
        renderChartNotes();
      }
      bus.emit('status:update', {
        text: changed
          ? `${nextHidden ? 'Hidden' : 'Shown'} calendar object`
          : 'Calendar object visibility cannot be changed',
        isError: !changed,
      });
      refreshSelection?.();
      return true;
    }

    if (action === 'calendar-pda-delete') {
      captureCalendarOpenGroups?.();
      const id = actionEl.dataset.objectId;
      const annotation = getAnnotationById(id);
      if (!annotation) {
        bus.emit('status:update', { text: 'Calendar PDA not found', isError: true });
        return true;
      }
      recordInspectorHistory?.('Delete PDA', () => deleteAnnotation(id));
      clearPdaSelection();
      bus.emit('status:update', { text: 'PDA deleted', isError: false });
      refreshSelection?.();
      return true;
    }

    if (action === 'calendar-day-show-chart-objects' || action === 'calendar-day-hide-chart-objects') {
      captureCalendarOpenGroups?.();
      const date = actionEl.dataset.calendarDate || getSelectedDate?.() || '';
      const hidden = action === 'calendar-day-hide-chart-objects';
      const changed = recordInspectorHistory?.(hidden ? 'Hide Calendar Day Objects' : 'Show Calendar Day Objects', () => (
        setCalendarDayChartObjectsHidden(date, hidden)
      ));
      if (hidden) {
        clearChartNoteFocusedDate();
      } else {
        setChartNoteFocusedDate(date, getChartNoteFocusAnchorBars());
      }
      renderChartNotes();
      bus.emit('status:update', {
        text: `${hidden ? 'Hidden' : 'Shown'} ${changed || 0} chart objects for ${date}`,
        isError: !date,
      });
      refreshSelection?.();
      return true;
    }

    if (action === 'calendar-day-group-toggle-hidden') {
      captureCalendarOpenGroups?.();
      const date = actionEl.dataset.calendarDate || getSelectedDate?.() || '';
      const groupType = actionEl.dataset.calendarGroupType || '';
      const state = actionEl.dataset.visibilityState || '';
      const hidden = state === 'checked';
      const label = actionEl.closest('.calendar-object-title')?.querySelector('span:not(.calendar-object-visibility-spacer)')?.textContent || 'Chart objects';
      const changed = recordInspectorHistory?.(hidden ? `Hide ${label}` : `Show ${label}`, () => (
        setCalendarDayGroupObjectsHidden(date, groupType, hidden)
      ));
      if (groupType === CALENDAR_OBJECT_TYPES.CHART_NOTE) {
        if (hidden) {
          clearChartNoteFocusedDate();
        } else {
          setChartNoteFocusedDate(date, getChartNoteFocusAnchorBars());
        }
        renderChartNotes();
      }
      bus.emit('status:update', {
        text: `${hidden ? 'Hidden' : 'Shown'} ${changed || 0} ${label} for ${date}`,
        isError: !date || !groupType,
      });
      refreshSelection?.();
      return true;
    }

    return false;
  }

  return { handleClick };
}
