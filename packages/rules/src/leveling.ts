/**
 * Leveling curve. Placeholder from the build plan (section 6):
 * EXP to go from `level` to `level + 1` = round(100 × level^1.5).
 */
export const LEVEL_CURVE_BASE = 100;
export const LEVEL_CURVE_EXPONENT = 1.5;

/** EXP needed to advance from `level` to `level + 1`. Levels start at 1. */
export function expToNextLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`level must be an integer >= 1, got ${level}`);
  }
  return Math.round(LEVEL_CURVE_BASE * level ** LEVEL_CURVE_EXPONENT);
}

/** Total lifetime EXP needed to reach `level` (level 1 needs 0). */
export function totalExpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += expToNextLevel(l);
  return total;
}

export interface LevelProgress {
  level: number;
  /** EXP earned inside the current level. */
  expIntoLevel: number;
  /** EXP needed to finish the current level. */
  expForLevel: number;
  /** 0..1 progress through the current level. */
  progress: number;
}

/** Work out the level and progress from lifetime EXP. */
export function levelFromExp(lifetimeExp: number): LevelProgress {
  if (!Number.isFinite(lifetimeExp) || lifetimeExp < 0) {
    throw new RangeError(`lifetimeExp must be >= 0, got ${lifetimeExp}`);
  }
  let level = 1;
  let remaining = Math.floor(lifetimeExp);
  while (remaining >= expToNextLevel(level)) {
    remaining -= expToNextLevel(level);
    level++;
  }
  const expForLevel = expToNextLevel(level);
  return { level, expIntoLevel: remaining, expForLevel, progress: remaining / expForLevel };
}
