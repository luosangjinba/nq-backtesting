import { normalizeMinuteTimeframe } from '../time-domain/time-domain.js';
import {
  targetTimeframeToAlignmentOffsetSeconds,
} from '../time-domain/target-timeframe-domain.js';

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

function normalizePlaybackPeriod(period) {
  const match = String(period || '').trim().toLowerCase().match(/^(\d+)(s|m|h)$/);
  if (!match) {
    throw new Error(`Unsupported chart entry playback period: ${period}`);
  }
  const value = Number(match[1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Chart entry playback period must be a positive value.');
  }
  const unit = match[2];
  const milliseconds = unit === 's'
    ? value * 1000
    : value * (unit === 'm' ? 60 : MINUTES_PER_HOUR * 60) * 1000;
  return { milliseconds, normalized: `${value}${unit}` };
}

export function resolvePlaybackPeriodStepCount({
  cursorTimestamp = null,
  direction = 'next',
  playbackPeriod,
  sourceTimeframe,
} = {}) {
  const sourceMinutes = normalizeSourceTimeframeMinutes(sourceTimeframe);
  const sourceMs = sourceMinutes * 60 * 1000;
  const period = normalizePlaybackPeriod(playbackPeriod || '1m');
  if (period.milliseconds <= sourceMs || !Number.isFinite(Number(cursorTimestamp))) {
    return Math.max(1, Math.round(period.milliseconds / sourceMs));
  }
  if (direction !== 'next' && direction !== 'previous') {
    throw new Error('Chart entry playback period direction must be next or previous.');
  }
  const cursorMs = Number(cursorTimestamp) * 1000;
  const alignmentOffsetMs = Number(targetTimeframeToAlignmentOffsetSeconds(period.normalized) || 0) * 1000;
  const remainder = ((cursorMs - alignmentOffsetMs) % period.milliseconds + period.milliseconds) % period.milliseconds;
  const distanceMs = direction === 'next'
    ? (remainder === 0 ? period.milliseconds : period.milliseconds - remainder)
    : (remainder === 0 ? period.milliseconds : remainder);
  return Math.max(1, Math.ceil(distanceMs / sourceMs));
}
