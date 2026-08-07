const HOUR = 3_600_000;

function sundayOnOrAfter(year, monthIndex, day, utcHour) {
  const candidate = new Date(Date.UTC(year, monthIndex, day, utcHour));
  return candidate.getTime() + (((7 - candidate.getUTCDay()) % 7) * 24 * HOUR);
}

function profileFor(epochMs) {
  const year = new Date(epochMs).getUTCFullYear();
  return Object.freeze({
    daylightEndInstantEpochMs: sundayOnOrAfter(year, 10, 1, 6),
    daylightEndWallEpochMs: sundayOnOrAfter(year, 10, 1, 2),
    daylightStartInstantEpochMs: sundayOnOrAfter(year, 2, 8, 7),
    daylightStartWallEpochMs: sundayOnOrAfter(year, 2, 8, 3),
    nonexistentWallStartEpochMs: sundayOnOrAfter(year, 2, 8, 2),
    endEpochMs: Date.UTC(year + 1, 0, 1),
    startEpochMs: Date.UTC(year, 0, 1),
  });
}

function instantToWall(epochMs, profile) {
  const offsetMs = epochMs >= profile.daylightStartInstantEpochMs
    && epochMs < profile.daylightEndInstantEpochMs ? -4 * HOUR : -5 * HOUR;
  return epochMs + offsetMs;
}

export function createNewYorkWallEpochConverter() {
  let profile = null;
  return (epochMs) => {
    if (!profile || epochMs < profile.startEpochMs || epochMs >= profile.endEpochMs) {
      profile = profileFor(epochMs);
    }
    return instantToWall(epochMs, profile);
  };
}

export function toNewYorkWallEpoch(epochMs) {
  return instantToWall(epochMs, profileFor(epochMs));
}

/** Convert a modern UTC-like New York wall epoch to its selected real instant. */
export function newYorkWallEpochToInstantMs(wallEpochMs) {
  const profile = profileFor(wallEpochMs);
  if (wallEpochMs >= profile.nonexistentWallStartEpochMs
    && wallEpochMs < profile.daylightStartWallEpochMs) {
    throw new TypeError('Market-data timestamp is not a valid New York exchange-wall time.');
  }
  const offsetMs = wallEpochMs >= profile.daylightStartWallEpochMs
    && wallEpochMs < profile.daylightEndWallEpochMs ? 4 * HOUR : 5 * HOUR;
  return wallEpochMs + offsetMs;
}
