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

export function readSessionSetupForm(form) {
  const data = new FormData(form);
  const startTime = readDateTimeLocal(data.get('startTime'), 'Start');
  const endTime = readDateTimeLocal(data.get('endTime'), 'End');
  if (Date.parse(startTime) >= Date.parse(endTime)) {
    throw new Error('Start must be before End.');
  }
  return {
    endTime,
    startTime,
  };
}
