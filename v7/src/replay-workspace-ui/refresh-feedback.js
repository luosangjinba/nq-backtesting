/** Own delayed refresh feedback without delaying or coordinating the transaction. */
export function createRefreshFeedback({
  clearTimer = clearTimeout,
  delayMs = 500,
  setTimer = setTimeout,
  view,
}) {
  let activeToken = 0;
  let disposed = false;
  let timer = null;

  function cancelTimer() {
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  }

  return Object.freeze({
    begin({ allowDim = false } = {}) {
      if (disposed) return null;
      const token = ++activeToken;
      cancelTimer();
      view.setPending(true);
      if (allowDim) {
        timer = setTimer(() => {
          timer = null;
          if (!disposed && token === activeToken) view.setState('stale');
        }, delayMs);
      }
      return token;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      activeToken += 1;
      cancelTimer();
    },
    finish(token) {
      if (disposed || token !== activeToken) return;
      cancelTimer();
      view.setPending(false);
    },
  });
}
