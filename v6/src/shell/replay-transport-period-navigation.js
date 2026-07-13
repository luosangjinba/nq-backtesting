export function resolveReplayTransportPeriodNavigation({
  activeIndex = -1,
  key = '',
  open = false,
  optionCount = 0,
} = {}) {
  const count = Math.max(0, Number(optionCount) || 0);
  if (key === 'Escape') {
    return Object.freeze({
      focusIndex: null,
      focusTrigger: Boolean(open),
      handled: Boolean(open),
      open: false,
    });
  }
  if (!count) {
    return Object.freeze({ focusIndex: null, focusTrigger: false, handled: false, open });
  }
  let focusIndex = null;
  if (key === 'ArrowDown') {
    focusIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % count;
  } else if (key === 'ArrowUp') {
    focusIndex = activeIndex < 0 ? count - 1 : (activeIndex - 1 + count) % count;
  } else if (key === 'Home') {
    focusIndex = 0;
  } else if (key === 'End') {
    focusIndex = count - 1;
  }
  return Object.freeze({
    focusIndex,
    focusTrigger: false,
    handled: focusIndex !== null,
    open: focusIndex !== null ? true : open,
  });
}
