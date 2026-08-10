/** Keep the Bar Picker's click-versus-pan discrimination out of the Chart owner entry file. */
export function createLightweightBarPickerPointerGesture({ thresholdSquared = 8 ** 2 } = {}) {
  let active = null;
  let focusLossTimer = null;

  function clearFocusLossTimer() {
    if (focusLossTimer === null) return;
    clearTimeout(focusLossTimer);
    focusLossTimer = null;
  }

  return Object.freeze({
    begin({ candidate, event } = {}) {
      if (active !== null || event?.button !== 0 || event?.isPrimary === false) return false;
      active = {
        candidate,
        dragged: false,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
      };
      return true;
    },
    cancel(pointerId) {
      if (active?.pointerId === pointerId) active = null;
    },
    deferFocusLoss(onElapsed) {
      if (active === null) return false;
      clearFocusLossTimer();
      focusLossTimer = setTimeout(() => {
        focusLossTimer = null;
        onElapsed();
      }, 150);
      return true;
    },
    end(event) {
      const record = active;
      active = null;
      if (record === null || event?.pointerId !== record.pointerId
        || record.dragged || record.candidate === null) return null;
      return record.candidate;
    },
    move(event) {
      if (active === null || event?.pointerId !== active.pointerId) return;
      const x = event.clientX - active.startClientX;
      const y = event.clientY - active.startClientY;
      if (((x * x) + (y * y)) >= thresholdSquared) {
        active.dragged = true;
        active.candidate = null;
      }
    },
    reset() {
      active = null;
      clearFocusLossTimer();
    },
  });
}
