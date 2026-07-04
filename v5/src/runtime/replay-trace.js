export function markReplayTrace(label, detail = {}) {
  const trace = globalThis.__v5ReplayTrace;
  if (!trace || typeof trace.mark !== 'function') return;
  try {
    trace.mark(label, detail);
  } catch {
    // Diagnostics must not affect replay behavior.
  }
}
