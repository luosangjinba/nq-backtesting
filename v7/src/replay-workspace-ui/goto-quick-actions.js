export const QUICK_GOTO_ACTIONS = Object.freeze([
  Object.freeze({ anchor: 'next-day-open', key: 'Y', label: 'Next Day Open' }),
  Object.freeze({ anchor: 'next-session', key: 'Z', label: 'Next Session' }),
  Object.freeze({ anchor: 'asian-session', key: 'I', label: 'Asian Session' }),
  Object.freeze({ anchor: 'london-session', key: 'L', label: 'London Session' }),
  Object.freeze({ anchor: 'new-york-session', key: 'N', label: 'New York Session' }),
  Object.freeze({ anchor: 'silver-bullet-new-york-am', key: null, label: 'SB New York AM' }),
  Object.freeze({ anchor: 'silver-bullet-new-york-pm', key: null, label: 'SB New York PM' }),
  Object.freeze({ anchor: 'silver-bullet-london', key: null, label: 'SB London' }),
]);

export const QUICK_GOTO_SETTING_FIELDS = Object.freeze([
  Object.freeze({ field: 'dayOpen', label: 'Next Day Open' }),
  Object.freeze({ field: 'asianSession', label: 'Asian Session' }),
  Object.freeze({ field: 'londonSession', label: 'London Session' }),
  Object.freeze({ field: 'newYorkSession', label: 'New York Session' }),
  Object.freeze({ field: 'silverBulletNewYorkAm', label: 'SB New York AM' }),
  Object.freeze({ field: 'silverBulletNewYorkPm', label: 'SB New York PM' }),
  Object.freeze({ field: 'silverBulletLondon', label: 'SB London' }),
]);

export function quickGotoLabel(anchor) {
  return QUICK_GOTO_ACTIONS.find((action) => action.anchor === anchor)?.label ?? 'selected target';
}
