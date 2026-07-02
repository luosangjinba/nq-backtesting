const DEFAULT_WHEEL_SETTLE_MS = 260;

export function createLightweightInteractionTracker({
  getCanvas,
  getDocument,
  getHost,
  onCrosshairLeave,
  onUserInput,
  wheelSettleMs = DEFAULT_WHEEL_SETTLE_MS,
} = {}) {
  let lastUserInputAt = 0;
  let nativeInteractionActive = false;
  let nativeInteractionType = null;
  let nativeInteractionSettleTimer = null;

  function emitNativeInteraction(active, type = nativeInteractionType) {
    if (nativeInteractionActive === active && nativeInteractionType === type) return;
    nativeInteractionActive = active;
    nativeInteractionType = active ? type : null;
    getHost?.()?.__v5OnNativeInteractionChange?.({
      active: nativeInteractionActive,
      type: nativeInteractionType,
      source: 'lightweight-native',
    });
  }

  function clearNativeInteractionSettleTimer() {
    if (nativeInteractionSettleTimer === null) return;
    clearTimeout(nativeInteractionSettleTimer);
    nativeInteractionSettleTimer = null;
  }

  function scheduleNativeInteractionSettle(type = nativeInteractionType, delayMs = 120) {
    clearNativeInteractionSettleTimer();
    nativeInteractionSettleTimer = setTimeout(() => {
      nativeInteractionSettleTimer = null;
      emitNativeInteraction(false, type);
    }, delayMs);
  }

  function markUserInput(event) {
    lastUserInputAt = Date.now();
    onUserInput?.(event);
    const type = event?.type === 'wheel'
      ? 'wheel'
      : event?.type?.startsWith?.('touch')
        ? 'touch'
        : 'drag';
    emitNativeInteraction(true, type);
    if (type === 'wheel') {
      scheduleNativeInteractionSettle(type, wheelSettleMs);
    } else {
      clearNativeInteractionSettleTimer();
    }
  }

  function settleUserInput(event) {
    const type = event?.type?.startsWith?.('touch') ? 'touch' : nativeInteractionType;
    scheduleNativeInteractionSettle(type, 0);
  }

  function hasRecentUserInput() {
    return Date.now() - lastUserInputAt < 2_000;
  }

  function bind() {
    const canvas = getCanvas?.();
    const documentRef = getDocument?.();
    if (!canvas?.addEventListener) return;
    canvas.addEventListener('mousedown', markUserInput, true);
    canvas.addEventListener('touchstart', markUserInput, true);
    canvas.addEventListener('wheel', markUserInput, true);
    canvas.addEventListener('mouseleave', onCrosshairLeave);
    documentRef?.addEventListener?.('mouseup', settleUserInput, true);
    documentRef?.addEventListener?.('touchend', settleUserInput, true);
    documentRef?.addEventListener?.('touchcancel', settleUserInput, true);
  }

  function unbind() {
    const canvas = getCanvas?.();
    const documentRef = getDocument?.();
    if (!canvas?.removeEventListener) return;
    canvas.removeEventListener('mousedown', markUserInput, true);
    canvas.removeEventListener('touchstart', markUserInput, true);
    canvas.removeEventListener('wheel', markUserInput, true);
    canvas.removeEventListener('mouseleave', onCrosshairLeave);
    documentRef?.removeEventListener?.('mouseup', settleUserInput, true);
    documentRef?.removeEventListener?.('touchend', settleUserInput, true);
    documentRef?.removeEventListener?.('touchcancel', settleUserInput, true);
  }

  function reset() {
    clearNativeInteractionSettleTimer();
    emitNativeInteraction(false);
    lastUserInputAt = 0;
    nativeInteractionActive = false;
    nativeInteractionType = null;
  }

  return {
    bind,
    unbind,
    hasRecentUserInput,
    reset,
  };
}
