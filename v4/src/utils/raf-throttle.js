function scheduleFrame(callback) {
  const requestFrame = globalThis.requestAnimationFrame || globalThis.window?.requestAnimationFrame;
  if (typeof requestFrame === 'function') {
    requestFrame(callback);
    return;
  }
  callback();
}

export function createRafThrottle(callback) {
  let queued = false;
  let latestArgs = null;

  return (...args) => {
    latestArgs = args;
    if (queued) return;
    queued = true;
    scheduleFrame(() => {
      queued = false;
      const argsToUse = latestArgs;
      latestArgs = null;
      callback(...argsToUse);
    });
  };
}
