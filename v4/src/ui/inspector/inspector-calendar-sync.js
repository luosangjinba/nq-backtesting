import { findDisplayBarFast } from '../../chart/display-bar-lookup.js';
import { dateKeyFromTimestamp } from './calendar-object-date.js';

export function createInspectorCalendarSync(options = {}) {
  const {
    bus,
    store,
    getReplayVisibleBars,
    updateTimeOverlaySettings,
    getInspectorPage,
    getCurrentPanel,
    getCalendarState,
    setCalendarState,
    captureCalendarOpenGroups,
    refreshSelection,
    isInspectorShellOpen,
    isCalendarClickFollowBlocked,
    clearPdaSelection,
    clearSegmentSelection,
    clearSegmentGroupSelection,
    clearSelectedSmt,
    resetInspectorPage,
    renderEmpty,
    openSidebar,
  } = options;

  function setCalendarDateContext(dateKey) {
    if (!dateKey) return false;
    setCalendarState({ selectedDate: dateKey, viewDate: dateKey });
    updateTimeOverlaySettings({ selectedDate: dateKey });
    return true;
  }

  function normalizeCalendarDatePayload(payload = {}) {
    const dateKey = String(payload.dateKey || '').match(/^\d{4}-\d{2}-\d{2}$/)
      ? String(payload.dateKey)
      : dateKeyFromTimestamp(payload.timestamp);
    return dateKey || '';
  }

  function openCalendarDate(payload = {}) {
    const dateKey = normalizeCalendarDatePayload(payload);
    if (!dateKey) {
      bus.emit('status:update', { text: 'Cannot locate Calendar date: missing chart time', isError: true });
      return false;
    }
    setCalendarDateContext(dateKey);
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    clearSelectedSmt();
    resetInspectorPage({ kind: 'home', selectedDate: dateKey, viewDate: dateKey });
    renderEmpty();
    openSidebar();
    bus.emit('status:update', {
      text: `Calendar selected ${dateKey}${payload.source ? ` from ${payload.source}` : ''}`,
      isError: false,
    });
    return true;
  }

  function canFollowCalendarChartClick() {
    if (!isInspectorShellOpen()) return false;
    if (isCalendarClickFollowBlocked()) return false;
    const page = getInspectorPage();
    const currentPanel = getCurrentPanel();
    return (
      (currentPanel === 'empty' && page.kind === 'home') ||
      (currentPanel === 'archive' && page.kind === 'archive')
    );
  }

  function followCalendarDateFromChartClick(dateKey) {
    if (!dateKey || !canFollowCalendarChartClick()) return false;
    const calendarState = getCalendarState();
    if (calendarState.selectedDate === dateKey && calendarState.viewDate === dateKey) return false;
    captureCalendarOpenGroups();
    setCalendarState({ selectedDate: dateKey, viewDate: dateKey });
    refreshSelection();
    return true;
  }

  function getPrimaryClickDate(param = {}) {
    const replayBars = getReplayVisibleBars();
    const bars = Array.isArray(replayBars) ? replayBars : store.getDisplayBars();
    const bar = findDisplayBarFast(bars, param.time, store.getCurrentTimeframe());
    return dateKeyFromTimestamp(bar?.timestamp);
  }

  function handlePrimaryCalendarClick(param = {}) {
    followCalendarDateFromChartClick(getPrimaryClickDate(param));
  }

  return {
    setCalendarDateContext,
    openCalendarDate,
    handlePrimaryCalendarClick,
  };
}
