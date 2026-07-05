function formatSessionTime(value) {
  if (!value) return 'pending';
  return String(value).replace('.000Z', 'Z');
}

export function createSessionsSurfaceState({
  activeSession = null,
  sessions = [],
} = {}) {
  const normalizedSessions = sessions.map((session) => ({ ...session }));
  return {
    activeSession: activeSession ? { ...activeSession } : null,
    activeSessionLabel: activeSession
      ? `${activeSession.symbol} ${activeSession.timeframe} ${formatSessionTime(activeSession.startTime)}`
      : 'No active replay session',
    count: normalizedSessions.length,
    sessions: normalizedSessions,
  };
}
