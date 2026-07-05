export function createRuntimeRegistry() {
  const runtimes = [];
  const started = [];
  let running = false;

  function registerRuntime(runtime) {
    if (running) {
      throw new Error('Cannot register a V6 runtime after lifecycle start.');
    }
    if (!runtime || typeof runtime !== 'object') {
      throw new Error('V6 runtime must be an object.');
    }
    if (!runtime.id || typeof runtime.id !== 'string') {
      throw new Error('V6 runtime id must be a non-empty string.');
    }
    if (runtimes.some((candidate) => candidate.id === runtime.id)) {
      throw new Error(`V6 runtime "${runtime.id}" is already registered.`);
    }
    runtimes.push(runtime);
    return () => {
      const index = runtimes.indexOf(runtime);
      if (index >= 0) {
        runtimes.splice(index, 1);
      }
    };
  }

  async function start(context = {}) {
    if (running) return snapshot();
    running = true;
    try {
      for (const runtime of runtimes) {
        if (typeof runtime.start === 'function') {
          await runtime.start(context);
        }
        started.push(runtime);
      }
      return snapshot();
    } catch (error) {
      await stop();
      throw error;
    }
  }

  async function stop() {
    while (started.length) {
      const runtime = started.pop();
      if (typeof runtime.stop === 'function') {
        await runtime.stop();
      }
    }
    running = false;
    return snapshot();
  }

  function snapshot() {
    return {
      running,
      runtimes: runtimes.map((runtime) => runtime.id),
      started: started.map((runtime) => runtime.id),
    };
  }

  return {
    registerRuntime,
    start,
    stop,
    snapshot,
  };
}
