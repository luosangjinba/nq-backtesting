import * as bus from '../../event-bus.js';
import * as viewport from '../../chart/viewport-controller.js';
import * as secondaryViewport from '../../chart/secondary-viewport-controller.js';
import { updateTimeOverlaySettings } from '../../time-overlays/time-overlay-store.js';
import { updateEconomicCalendarFilters } from '../../economic-calendar/economic-calendar-store.js';
import { clearSelection as clearPdaSelection } from '../../pda/pda-selection.js';
import { deleteAnnotation, getAnnotationById } from '../../pda/pda-store.js';
import { locatePdaProjection } from '../../pda/pda-locate-actions.js';
import { CALENDAR_OBJECT_TYPES } from '../../calendar/calendar-types.js';
import { getCalendarDateTimestamp } from './calendar-panel.js';
import {
  isCalendarObjectHidden,
  setCalendarDayChartObjectsHidden,
  setCalendarObjectHidden,
} from './calendar-visibility-actions.js';

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
    bus.emit('status:update', {
      text: result.primary.located && result.secondary.located
        ? `Located ${label} on primary and secondary`
        : result.primary.located
          ? `Located ${label} on primary`
          : result.secondary.located
            ? `Located ${label} on secondary`
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
    viewport.locateTimestampRange(start, end);
    secondaryViewport.locateSecondaryTimestampRange(start, end);
    const label = actionEl.dataset.objectLabel || 'Calendar object';
    bus.emit('status:update', { text: `Located ${label}`, isError: false });
    return true;
  }

  function handleClick(action, actionEl) {
    if (action === 'calendar-select-date') {
      const date = actionEl.dataset.calendarDate || getSelectedDate?.() || '';
      setSelectedDate?.(date, date);
      updateTimeOverlaySettings({ selectedDate: date });
      const targetTimestamp = getCalendarDateTimestamp(date, '09:30');
      if (targetTimestamp !== null) {
        viewport.locateTimestampRange(targetTimestamp, targetTimestamp);
        secondaryViewport.locateSecondaryTimestampRange(targetTimestamp, targetTimestamp);
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
      bus.emit('status:update', {
        text: `${hidden ? 'Hidden' : 'Shown'} ${changed || 0} chart objects for ${date}`,
        isError: !changed,
      });
      refreshSelection?.();
      return true;
    }

    return false;
  }

  return { handleClick };
}
