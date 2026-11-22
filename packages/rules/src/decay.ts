/** Placeholder decay settings from the build plan (section 6). */
export const DECAY_GRACE_DAYS = 14;
/** Fraction of the current value lost per full week after the grace period. */
export const DECAY_RATE_PER_WEEK = 0.02;
/** Decay never takes a stat below this fraction of its peak. */
export const DECAY_FLOOR_OF_PEAK = 0.5;
/** Stat gain multiplier for the first few quests after a lapse. */
export const COMEBACK_MULTIPLIER = 1.5;
export const COMEBACK_QUEST_COUNT = 3;

export interface DecayInput {
  /** Value from the ledger, before decay. */
  value: number;
  /** Highest value this stat has reached. */
  peak: number;
  /** Whole days since the last activity in this stat, not counting rest-mode days. */
  inactiveDays: number;
}

/**
 * Decay is calculated on read: compounding 2% per full week after a 14-day
 * grace period, never below 50% of peak, and never raising a value.
 */
export function decayedValue({ value, peak, inactiveDays }: DecayInput): number {
  if (inactiveDays <= DECAY_GRACE_DAYS || value <= 0) return value;
  const weeks = Math.floor((inactiveDays - DECAY_GRACE_DAYS) / 7);
  if (weeks === 0) return value;
  const decayed = value * (1 - DECAY_RATE_PER_WEEK) ** weeks;
  const floor = peak * DECAY_FLOOR_OF_PEAK;
  return Math.min(value, Math.max(decayed, floor));
}

/** True when the stat is past its grace period, so the comeback bonus applies. */
export function isLapsed(inactiveDays: number): boolean {
  return inactiveDays > DECAY_GRACE_DAYS;
}
