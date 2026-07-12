export const TARGET_HISTORY_PACK_GROUPS = Object.freeze({
  ALL: 'all',
  FALLBACK: 'fallback',
  FIXED: 'fixed',
  SESSION_AWARE: 'session-aware',
  SIZING: 'sizing',
});

export const TARGET_HISTORY_PACK_TESTS = Object.freeze([
  Object.freeze({
    id: 'fixed-success-readout',
    script: 'v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js',
    tags: Object.freeze(['fixed', 'readout', 'success']),
  }),
  Object.freeze({
    id: 'fixed-fallback-readout',
    script: 'v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js',
    tags: Object.freeze(['fallback', 'fixed', 'readout']),
  }),
  Object.freeze({
    id: 'daily-sizing',
    script: 'v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js',
    tags: Object.freeze(['daily', 'session-aware', 'sizing', 'success']),
  }),
  Object.freeze({
    id: 'daily-fallback',
    script: 'v6/tests/daily-target-history-fallback-browser-step301-smoke.js',
    tags: Object.freeze(['daily', 'fallback', 'session-aware']),
  }),
  Object.freeze({
    id: 'weekly-sizing',
    script: 'v6/tests/weekly-target-history-request-sizing-browser-step303-smoke.js',
    tags: Object.freeze(['session-aware', 'sizing', 'success', 'weekly']),
  }),
  Object.freeze({
    id: 'weekly-fallback',
    script: 'v6/tests/weekly-target-history-fallback-browser-step304-smoke.js',
    tags: Object.freeze(['fallback', 'session-aware', 'weekly']),
  }),
  Object.freeze({
    id: 'monthly-sizing',
    script: 'v6/tests/monthly-target-history-request-sizing-browser-step306-smoke.js',
    tags: Object.freeze(['monthly', 'session-aware', 'sizing', 'success']),
  }),
  Object.freeze({
    id: 'monthly-fallback',
    script: 'v6/tests/monthly-target-history-fallback-browser-step307-smoke.js',
    tags: Object.freeze(['fallback', 'monthly', 'session-aware']),
  }),
]);

export const TARGET_HISTORY_PACK_OPTIONAL_TESTS = Object.freeze([
  Object.freeze({
    id: 'replay-coordination',
    script: 'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
    tags: Object.freeze(['materialization', 'replay-coordination']),
  }),
  Object.freeze({
    id: 'readout-producer-flow',
    script: 'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
    tags: Object.freeze(['materialization', 'readout', 'producer-flow']),
  }),
]);

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeGroup(value) {
  const group = String(value || TARGET_HISTORY_PACK_GROUPS.ALL).trim();
  const valid = new Set(Object.values(TARGET_HISTORY_PACK_GROUPS));
  if (!valid.has(group)) {
    throw new Error(`Unknown target-history pack group: ${group}`);
  }
  return group;
}

function matchesGroup(test, group) {
  if (group === TARGET_HISTORY_PACK_GROUPS.ALL) return true;
  return test.tags.includes(group);
}

function selectByMembers({ memberIds, tests }) {
  const byId = new Map([
    ...tests,
    ...TARGET_HISTORY_PACK_OPTIONAL_TESTS,
  ].map((test) => [test.id, test]));
  const selected = [];
  for (const id of memberIds) {
    const test = byId.get(id);
    if (!test) {
      throw new Error(`Unknown target-history pack member: ${id}`);
    }
    selected.push(test);
  }
  return selected;
}

export function selectTargetHistoryPackTests({
  group = TARGET_HISTORY_PACK_GROUPS.ALL,
  members = '',
  tests = TARGET_HISTORY_PACK_TESTS,
} = {}) {
  const memberIds = Array.isArray(members) ? members : splitCsv(members);
  const selected = memberIds.length > 0
    ? selectByMembers({ memberIds, tests })
    : tests.filter((test) => matchesGroup(test, normalizeGroup(group)));
  return {
    group: memberIds.length > 0 ? 'members' : normalizeGroup(group),
    selected,
    selectedCount: selected.length,
    selectedIds: selected.map((test) => test.id),
    scripts: selected.map((test) => test.script),
    totalCount: tests.length,
  };
}

export function createTargetHistoryPackPlanFromEnv(env = process.env) {
  return selectTargetHistoryPackTests({
    group: env.TARGET_HISTORY_PACK_GROUP || TARGET_HISTORY_PACK_GROUPS.ALL,
    members: env.TARGET_HISTORY_PACK_MEMBERS || '',
  });
}
