function datetimeLocalToWallClock(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  const normalized = value.trim();
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  const parsed = match ? new Date(normalized) : null;
  const isValid = parsed
    && !Number.isNaN(parsed.getTime())
    && parsed.getFullYear() === Number(match[1].slice(0, 4))
    && parsed.getMonth() + 1 === Number(match[1].slice(5, 7))
    && parsed.getDate() === Number(match[1].slice(8, 10))
    && parsed.getHours() === Number(match[2].slice(0, 2))
    && parsed.getMinutes() === Number(match[2].slice(3, 5));
  if (!match || !isValid) {
    throw new Error(`${fieldName} must be a valid date/time.`);
  }
  return `${match[1]} ${match[2]}`;
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

  const sessionStart = datetimeLocalToWallClock(String(data.get('sessionStart') || ''), 'sessionStart');
  const sessionEnd = datetimeLocalToWallClock(String(data.get('sessionEnd') || ''), 'sessionEnd');
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
