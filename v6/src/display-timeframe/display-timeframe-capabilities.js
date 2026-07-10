const DISPLAY_TIMEFRAME_CAPABILITIES = Object.freeze([
  {
    group: 'Seconds',
    id: '1s',
    label: '1 second',
    multiplier: 1,
    projectionMode: 'unsupported',
    sourceRequirement: 'second',
    status: 'unsupported',
    unit: 'second',
    visible: false,
  },
  {
    group: 'Seconds',
    id: '5s',
    label: '5 seconds',
    multiplier: 5,
    projectionMode: 'unsupported',
    sourceRequirement: 'second',
    status: 'unsupported',
    unit: 'second',
    visible: false,
  },
  {
    group: 'Seconds',
    id: '10s',
    label: '10 seconds',
    multiplier: 10,
    projectionMode: 'unsupported',
    sourceRequirement: 'second',
    status: 'unsupported',
    unit: 'second',
    visible: false,
  },
  {
    group: 'Seconds',
    id: '15s',
    label: '15 seconds',
    multiplier: 15,
    projectionMode: 'unsupported',
    sourceRequirement: 'second',
    status: 'unsupported',
    unit: 'second',
    visible: false,
  },
  {
    group: 'Seconds',
    id: '30s',
    label: '30 seconds',
    multiplier: 30,
    projectionMode: 'unsupported',
    sourceRequirement: 'second',
    status: 'unsupported',
    unit: 'second',
    visible: false,
  },
  {
    group: 'Minutes',
    id: '1m',
    label: '1 minute',
    multiplier: 1,
    projectionMode: 'native',
    runtimeValue: 1,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'minute',
    visible: true,
  },
  {
    group: 'Minutes',
    id: '2m',
    label: '2 minutes',
    multiplier: 2,
    projectionMode: 'aggregate',
    runtimeValue: 2,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'minute',
    visible: true,
  },
  {
    group: 'Minutes',
    id: '3m',
    label: '3 minutes',
    multiplier: 3,
    projectionMode: 'aggregate',
    runtimeValue: 3,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'minute',
    visible: true,
  },
  {
    group: 'Minutes',
    id: '4m',
    label: '4 minutes',
    multiplier: 4,
    projectionMode: 'aggregate',
    runtimeValue: 4,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'minute',
    visible: true,
  },
  {
    group: 'Minutes',
    id: '5m',
    label: '5 minutes',
    multiplier: 5,
    projectionMode: 'aggregate',
    runtimeValue: 5,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'minute',
    visible: true,
  },
  {
    group: 'Minutes',
    id: '10m',
    label: '10 minutes',
    multiplier: 10,
    projectionMode: 'aggregate',
    runtimeValue: 10,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'minute',
    visible: true,
  },
  {
    group: 'Minutes',
    id: '15m',
    label: '15 minutes',
    multiplier: 15,
    projectionMode: 'aggregate',
    runtimeValue: 15,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'minute',
    visible: true,
  },
  {
    group: 'Minutes',
    id: '30m',
    label: '30 minutes',
    multiplier: 30,
    projectionMode: 'aggregate',
    runtimeValue: 30,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'minute',
    visible: true,
  },
  {
    group: 'Hours',
    id: '1h',
    label: '1 hour',
    multiplier: 1,
    projectionMode: 'aggregate',
    runtimeValue: 60,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'hour',
    visible: true,
  },
  {
    group: 'Hours',
    id: '2h',
    label: '2 hours',
    multiplier: 2,
    projectionMode: 'aggregate',
    runtimeValue: 120,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'hour',
    visible: true,
  },
  {
    group: 'Hours',
    id: '4h',
    label: '4 hours',
    multiplier: 4,
    projectionMode: 'aggregate',
    runtimeValue: 240,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'hour',
    visible: true,
  },
  {
    group: 'Hours',
    id: '8h',
    label: '8 hours',
    multiplier: 8,
    projectionMode: 'aggregate',
    runtimeValue: 480,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'hour',
    visible: true,
  },
  {
    group: 'Hours',
    id: '12h',
    label: '12 hours',
    multiplier: 12,
    projectionMode: 'aggregate',
    runtimeValue: 720,
    sourceRequirement: '1m',
    status: 'enabled',
    unit: 'hour',
    visible: true,
  },
  {
    group: 'Days',
    id: '1D',
    label: '1 day',
    multiplier: 1,
    projectionMode: 'session-aware',
    runtimeValue: '1D',
    sourceRequirement: 'session-calendar',
    status: 'enabled',
    unit: 'day',
    visible: true,
  },
  {
    group: 'Weeks',
    id: '1W',
    label: '1 week',
    multiplier: 1,
    projectionMode: 'session-aware',
    sourceRequirement: 'session-calendar',
    status: 'planned',
    unit: 'week',
    visible: true,
  },
  {
    group: 'Months',
    id: '1M',
    label: '1 month',
    multiplier: 1,
    projectionMode: 'session-aware',
    sourceRequirement: 'session-calendar',
    status: 'planned',
    unit: 'month',
    visible: true,
  },
]);

function cloneCapability(capability) {
  return Object.freeze({ ...capability });
}

export function getDisplayTimeframeCapabilities() {
  return DISPLAY_TIMEFRAME_CAPABILITIES.map(cloneCapability);
}

export function getVisibleDisplayTimeframeCapabilities() {
  return getDisplayTimeframeCapabilities().filter((capability) => capability.visible);
}

export function getEnabledDisplayTimeframeCapabilities() {
  return getVisibleDisplayTimeframeCapabilities()
    .filter((capability) => capability.status === 'enabled');
}

export function createDisplayTimeframeMenuGroups() {
  const groups = [];
  for (const capability of getVisibleDisplayTimeframeCapabilities()) {
    let group = groups.find((candidate) => candidate.label === capability.group);
    if (!group) {
      group = {
        items: [],
        label: capability.group,
      };
      groups.push(group);
    }
    group.items.push(capability);
  }
  return groups.map((group) => Object.freeze({
    items: Object.freeze([...group.items]),
    label: group.label,
  }));
}

export function findDisplayTimeframeCapabilityByRuntimeValue(value) {
  const text = String(value ?? '').trim().toUpperCase();
  const runtimeValue = text === '1D' ? text : Number(value);
  return getDisplayTimeframeCapabilities()
    .find((capability) => String(capability.runtimeValue) === String(runtimeValue)) || null;
}
