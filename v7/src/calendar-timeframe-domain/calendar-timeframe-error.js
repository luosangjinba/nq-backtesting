/** Stable public error for calendar-aligned timeframe failures. */
export class CalendarTimeframeDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CalendarTimeframeDomainError';
    this.code = code;
  }
}

export function failCalendarTimeframe(code, message) {
  throw new CalendarTimeframeDomainError(code, message);
}
