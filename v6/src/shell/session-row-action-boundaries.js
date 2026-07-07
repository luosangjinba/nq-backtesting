const ROW_ACTIONS = Object.freeze([
  Object.freeze({
    id: 'summary',
    label: 'Summary',
    owner: 'session-summary',
    status: 'contract-ready',
    enabled: false,
    visibleInRecentSessions: true,
    reason: 'Summary has a read-only owner contract but remains disabled until a dedicated summary UI is implemented.',
  }),
  Object.freeze({
    id: 'analytics',
    label: 'Stats',
    owner: 'session-analytics',
    status: 'placeholder',
    enabled: false,
    visibleInRecentSessions: true,
    reason: 'Analytics needs a dedicated session-analytics owner before it can read trade or replay metrics.',
  }),
  Object.freeze({
    id: 'copy',
    label: 'Copy',
    owner: 'session-repository',
    status: 'placeholder',
    enabled: false,
    visibleInRecentSessions: true,
    reason: 'Copy may only create metadata records through the session repository when it becomes active.',
  }),
  Object.freeze({
    id: 'order',
    label: 'Order',
    owner: 'orders-runtime',
    status: 'future',
    enabled: false,
    visibleInRecentSessions: false,
    reason: 'Order actions require an orders runtime contract before dashboard controls can access them.',
  }),
  Object.freeze({
    id: 'journal',
    label: 'Journal',
    owner: 'journal-runtime',
    status: 'future',
    enabled: false,
    visibleInRecentSessions: false,
    reason: 'Journal actions require a journal runtime contract before dashboard controls can access them.',
  }),
  Object.freeze({
    id: 'calendar',
    label: 'Calendar',
    owner: 'calendar-runtime',
    status: 'future',
    enabled: false,
    visibleInRecentSessions: false,
    reason: 'Calendar actions require a calendar runtime contract before dashboard controls can access them.',
  }),
]);

export function getRecentSessionRowActionBoundaries() {
  return ROW_ACTIONS.map((action) => ({ ...action }));
}

export function getVisibleRecentSessionRowActions() {
  return getRecentSessionRowActionBoundaries()
    .filter((action) => action.visibleInRecentSessions);
}
