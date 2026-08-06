export function abortReason(signal) {
  return signal?.reason ?? new DOMException('Aborted', 'AbortError');
}

/** Wait without retaining an AbortSignal listener after either terminal path. */
export function abortableDelay(milliseconds, signal, setTimer, clearTimer) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;

    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const settle = (complete, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      complete(value);
    };
    const onAbort = () => {
      if (timer !== null) clearTimer(timer);
      settle(reject, abortReason(signal));
    };

    if (signal?.aborted) {
      settle(reject, abortReason(signal));
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }
    try {
      timer = setTimer(() => settle(resolve), milliseconds);
    } catch (error) {
      settle(reject, error);
    }
  });
}
