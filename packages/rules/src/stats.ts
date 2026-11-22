/** The five Daybound stats. DEX covers agility + dexterity; MND covers INT + WIS. */
export const STATS = ["STR", "DEX", "VIT", "MND", "CHA"] as const;

export type Stat = (typeof STATS)[number];

export const STAT_NAMES: Record<Stat, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  VIT: "Vitality",
  MND: "Mind",
  CHA: "Charisma",
};

/** Partial map of stat -> weight. Weights are relative; they do not need to sum to 1. */
export type StatWeights = Partial<Record<Stat, number>>;

/** Full map of stat -> amount, used for stat point rewards and current values. */
export type StatMap = Record<Stat, number>;

export function emptyStatMap(): StatMap {
  return { STR: 0, DEX: 0, VIT: 0, MND: 0, CHA: 0 };
}

export function isStat(value: unknown): value is Stat {
  return typeof value === "string" && (STATS as readonly string[]).includes(value);
}
