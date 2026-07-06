function readRequiredText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

function readDateTimeLocal(value, fieldName) {
  const normalized = readRequiredText(value, fieldName);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  const parsed = match ? new Date(normalized) : null;
  const valid = parsed
    && !Number.isNaN(parsed.valueOf())
    && parsed.getFullYear() === Number(match[1])
    && parsed.getMonth() + 1 === Number(match[2])
    && parsed.getDate() === Number(match[3])
    && parsed.getHours() === Number(match[4])
    && parsed.getMinutes() === Number(match[5]);
  if (!valid) {
    throw new Error(`${fieldName} must be a valid date/time.`);
  }
  return parsed.toISOString();
}

function readOptionalNumber(value, fallback, fieldName) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number.`);
  }
  return parsed;
}

function readSymbols(data) {
  const symbols = data.getAll('symbols')
    .flatMap((value) => String(value || '').split(','))
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
  const unique = [...new Set(symbols)];
  if (!unique.length) {
    throw new Error('Assets are required.');
  }
  return unique;
}

export function readSessionSetupForm(form) {
  const data = new FormData(form);
  const name = readRequiredText(data.get('name'), 'Name');
  const symbols = readSymbols(data);
  const startTime = readDateTimeLocal(data.get('startTime'), 'Start');
  const autoUpdateEndDate = data.get('autoUpdateEndDate') === 'on';
  const endTime = autoUpdateEndDate
    ? readDateTimeLocal(data.get('computedEndTime') || data.get('endTime'), 'End')
    : readDateTimeLocal(data.get('endTime'), 'End');
  if (Date.parse(startTime) >= Date.parse(endTime)) {
    throw new Error('Start must be before End.');
  }
  return {
    accountBalance: readOptionalNumber(data.get('accountBalance'), 100000, 'Account Balance'),
    autoUpdateEndDate,
    endTime,
    name,
    startTime,
    symbol: symbols[0],
    symbols,
  };
}
