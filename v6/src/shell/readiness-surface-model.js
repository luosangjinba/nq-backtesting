const READINESS_GATES = Object.freeze([
  {
    id: 'boundary',
    label: 'Boundary',
    test: 'node v6/tests/boundary-smoke.js',
  },
  {
    id: 'cache-hit-latency',
    label: 'Cache-hit latency',
    test: 'node v6/tests/visible-latency-cache-hit-browser-smoke.js',
  },
  {
    id: 'mixed-timeframe-latency',
    label: 'Mixed-TF latency',
    test: 'node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js',
  },
  {
    id: 'multi-pane-manual-wall',
    label: 'Pane manual walls',
    test: 'node v6/tests/multi-pane-manual-wall-browser-smoke.js',
  },
]);

const REQUIRED_COMMANDS = Object.freeze([
  'defaultWall.next',
  'journalPersistence.saveSnapshot',
  'layout.getSnapshot',
  'persistence.saveRecord',
  'replay.next',
  'settings.getSnapshot',
]);

function normalizeCommands(commands = []) {
  return [...new Set(commands.map((command) => String(command || '').trim()).filter(Boolean))].sort();
}

export function createReadinessSurfaceState({
  commands = [],
  registrySnapshot = {},
} = {}) {
  const normalizedCommands = normalizeCommands(commands);
  const startedRuntimes = normalizeCommands(registrySnapshot.started);
  const missingCommands = REQUIRED_COMMANDS.filter((command) => !normalizedCommands.includes(command));
  return {
    commandCount: normalizedCommands.length,
    gateCount: READINESS_GATES.length,
    gates: READINESS_GATES.map((gate) => ({ ...gate })),
    missingCommands,
    ready: Boolean(registrySnapshot.running) && missingCommands.length === 0,
    running: Boolean(registrySnapshot.running),
    startedRuntimes,
    startedRuntimeCount: startedRuntimes.length,
  };
}
