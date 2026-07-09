import { normalizeMinuteTimeframe } from '../time-domain/time-domain.js';

const MINUTES_PER_HOUR = 60;

function normalizeSourceTimeframeMinutes(timeframe) {
  try {
    return normalizeMinuteTimeframe(timeframe, {
      fieldName: 'Chart entry playback period source timeframe',
    });
  } catch (error) {
    if (String(error?.message || '').includes('positive minute value')) {
      throw new Error('Chart entry playback period source timeframe must be a positive minute value.');
    }
    throw new Error('Chart entry playback period source timeframe must be minute-based.');
  }
}

function normalizePlaybackPeriodMs(period) {
  const match = String(period || '').trim().toLowerCase().match(/^(\d+)(s|m|h)$/);
  if (!match) {
    throw new Error(`Unsupported chart entry playback period: ${period}`);
  }
  const value = Number(match[1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Chart entry playback period must be a positive value.');
  }
  const unit = match[2];
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  return value * MINUTES_PER_HOUR * 60 * 1000;
}

export function resolvePlaybackPeriodStepCount({
  playbackPeriod,
  sourceTimeframe,
} = {}) {
  const sourceMinutes = normalizeSourceTimeframeMinutes(sourceTimeframe);
  const sourceMs = sourceMinutes * 60 * 1000;
  const periodMs = normalizePlaybackPeriodMs(playbackPeriod || '1m');
  return Math.max(1, Math.round(periodMs / sourceMs));
}
