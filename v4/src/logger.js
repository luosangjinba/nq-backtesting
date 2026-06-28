const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function readDebugFlag() {
  if (globalThis.__V4_DEBUG__ === true) return true;
  try {
    const value = globalThis.localStorage?.getItem('v4:debug');
    return TRUE_VALUES.has(String(value || '').trim().toLowerCase());
  } catch {
    return false;
  }
}

export function isDebugLoggingEnabled() {
  return readDebugFlag();
}

export function debugLog(...args) {
  if (!isDebugLoggingEnabled()) return;
  console.log(...args);
}
