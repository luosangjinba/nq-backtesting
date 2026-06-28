const dateRangeState = {
  viewDateKey: '',
  rangeStartDate: '',
  rangeEndDate: '',
  activeDateKey: '',
};

export function getDateRangeState() {
  return dateRangeState;
}

export function setDateRangeState(patch = {}) {
  Object.assign(dateRangeState, {
    viewDateKey: patch.viewDateKey ?? dateRangeState.viewDateKey,
    rangeStartDate: patch.rangeStartDate ?? dateRangeState.rangeStartDate,
    rangeEndDate: patch.rangeEndDate ?? dateRangeState.rangeEndDate,
    activeDateKey: patch.activeDateKey ?? dateRangeState.activeDateKey,
  });
  return dateRangeState;
}

export function normalizeRangeDates(startDate, endDate) {
  if (startDate && endDate && startDate > endDate) {
    return { startDate: endDate, endDate: startDate };
  }
  return { startDate, endDate };
}

export function clearRangeSelection(activeDateKey = '') {
  dateRangeState.rangeStartDate = '';
  dateRangeState.rangeEndDate = '';
  dateRangeState.activeDateKey = activeDateKey;
  return dateRangeState;
}

export function selectRangeDate(dateKey) {
  dateRangeState.activeDateKey = dateKey;
  if (!dateRangeState.rangeStartDate || (dateRangeState.rangeStartDate && dateRangeState.rangeEndDate)) {
    dateRangeState.rangeStartDate = dateKey;
    dateRangeState.rangeEndDate = '';
  } else if (dateKey < dateRangeState.rangeStartDate) {
    dateRangeState.rangeEndDate = dateRangeState.rangeStartDate;
    dateRangeState.rangeStartDate = dateKey;
  } else {
    dateRangeState.rangeEndDate = dateKey;
  }
  return dateRangeState;
}
