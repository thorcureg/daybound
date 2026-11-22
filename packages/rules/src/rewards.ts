import { STATS, emptyStatMap, type StatMap, type StatWeights } from "./stats.ts";

export const DIFFICULTIES = ["easy", "normal", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Placeholder multipliers from the build plan (section 6). */
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.5,
  normal: 1,
  hard: 1.5,
};

/** Every difficulty keeps the streak alive; Easy exists so a bad day still counts. */
export function keepsStreak(_difficulty: Difficulty): boolean {
  return true;
}

/**
 * Split an integer total across stats by weight, using the largest-remainder
 * method so the parts always add up to exactly `total`.
 * Ties go to the stat that comes first in STATS order, so results are stable.
 */
export function splitByWeights(total: number, weights: StatWeights): StatMap {
  const result = emptyStatMap();
  if (!Number.isInteger(total) || total < 0) {
    throw new RangeError(`total must be an integer >= 0, got ${total}`);
  }
  const entries = STATS.map((stat) => [stat, weights[stat] ?? 0] as const).filter(
    ([, w]) => w > 0,
  );
  if (entries.some(([, w]) => !Number.isFinite(w))) {
    throw new RangeError("weights must be finite numbers");
  }
  const weightSum = entries.reduce((sum, [, w]) => sum + w, 0);
  if (weightSum === 0) {
    if (total === 0) return result;
    throw new RangeError("at least one stat weight must be > 0");
  }

  const shares = entries.map(([stat, w]) => {
    const exact = (total * w) / weightSum;
    return { stat, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let leftover = total - shares.reduce((sum, s) => sum + s.floor, 0);
  for (const s of shares) result[s.stat] = s.floor;
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder);
  for (const s of byRemainder) {
    if (leftover <= 0) break;
    result[s.stat] += 1;
    leftover--;
  }
  return result;
}

export interface QuestRewardInput {
  baseExp: number;
  /** Stat points before the difficulty multiplier. */
  baseStatPoints: number;
  difficulty: Difficulty;
  weights: StatWeights;
  /** Extra multiplier, e.g. the 1.5× comeback bonus. Defaults to 1. */
  statBonusMultiplier?: number;
}

export interface QuestReward {
  exp: number;
  stats: StatMap;
}

/** The reward for completing one quest instance. Rules decide this, never the AI. */
export function computeQuestReward(input: QuestRewardInput): QuestReward {
  const mult = DIFFICULTY_MULTIPLIER[input.difficulty];
  const bonus = input.statBonusMultiplier ?? 1;
  const exp = Math.max(0, Math.round(input.baseExp * mult));
  const statTotal = Math.max(0, Math.round(input.baseStatPoints * mult * bonus));
  return { exp, stats: splitByWeights(statTotal, input.weights) };
}
