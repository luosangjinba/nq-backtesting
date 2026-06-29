function datetimeLocalToIso(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date/time.`);
  }
  return parsed.toISOString();
}

function positiveTimeframe(value) {
  const timeframe = Number(value);
  if (!Number.isInteger(timeframe) || timeframe <= 0) {
    throw new Error('timeframe must be a positive integer.');
  }
  return timeframe;
}

export function readSessionSetupForm(form) {
  const data = new FormData(form);
  const instrument = String(data.get('instrument') || '').trim().toUpperCase();
  if (!instrument) {
    throw new Error('instrument is required.');
  }

  const sessionStart = datetimeLocalToIso(String(data.get('sessionStart') || ''), 'sessionStart');
  const sessionEnd = datetimeLocalToIso(String(data.get('sessionEnd') || ''), 'sessionEnd');
  if (Date.parse(sessionStart) >= Date.parse(sessionEnd)) {
    throw new Error('sessionStart must be before sessionEnd.');
  }

  return {
    instrument,
    timeframe: positiveTimeframe(data.get('timeframe')),
    sessionStart,
    sessionEnd,
  };
}
