export const DISPLAY_TIMEZONE_COMMANDS = Object.freeze({
  SET: 'displayTimezone.set',
  GET: 'displayTimezone.get',
});

export const DISPLAY_TIMEZONE_EVENTS = Object.freeze({
  CHANGED: 'displayTimezone:changed',
});

export const DISPLAY_TIMEZONES = Object.freeze({
  EXCHANGE: 'Exchange',
  UTC: 'UTC',
  NEW_YORK: 'America/New_York',
  CHICAGO: 'America/Chicago',
  LOS_ANGELES: 'America/Los_Angeles',
});

export const DEFAULT_DISPLAY_TIMEZONE = DISPLAY_TIMEZONES.EXCHANGE;
export const DEFAULT_EXCHANGE_TIMEZONE = DISPLAY_TIMEZONES.NEW_YORK;
