const OPTIONS = [
  { cadenceMs: 1_000, id: 'autoplay-speed-0.5x', label: '0.5×', multiplier: 0.5 },
  { cadenceMs: 500, id: 'autoplay-speed-1x', label: '1×', multiplier: 1 },
  { cadenceMs: 250, id: 'autoplay-speed-2x', label: '2×', multiplier: 2 },
  { cadenceMs: 100, id: 'autoplay-speed-5x', label: '5×', multiplier: 5 },
];

export const AUTOPLAY_SPEED_OPTIONS = Object.freeze(OPTIONS.map((option) => Object.freeze(option)));
export const DEFAULT_AUTOPLAY_SPEED = AUTOPLAY_SPEED_OPTIONS[1];
const BY_ID = new Map(AUTOPLAY_SPEED_OPTIONS.map((option) => [option.id, option]));

/** Resolve one bounded UI-owned cadence without entering Replay product state. */
export function readAutoplaySpeed(speedId) {
  const speed = BY_ID.get(speedId);
  if (!speed) throw new TypeError(`Unsupported Autoplay speed ${speedId}.`);
  return speed;
}
