import { describe, expect, it } from "vitest";
import { computeQuestReward, splitByWeights } from "./rewards.ts";

describe("splitByWeights", () => {
  it("splits by weight", () => {
    expect(splitByWeights(10, { STR: 0.7, VIT: 0.3 })).toMatchObject({ STR: 7, VIT: 3, DEX: 0 });
  });

  it("always sums to the total", () => {
    const weights = { STR: 1, DEX: 1, VIT: 1, MND: 1, CHA: 1 };
    for (let total = 0; total <= 50; total++) {
      const parts = splitByWeights(total, weights);
      expect(Object.values(parts).reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it("breaks ties in stat order", () => {
    expect(splitByWeights(3, { DEX: 1, STR: 1 })).toMatchObject({ STR: 2, DEX: 1 });
  });

  it("rejects all-zero weights when there is something to split", () => {
    expect(() => splitByWeights(5, {})).toThrow(RangeError);
    expect(splitByWeights(0, {})).toMatchObject({ STR: 0 });
  });
});

describe("computeQuestReward", () => {
  const base = { baseExp: 50, baseStatPoints: 4, weights: { STR: 1 } };

  it("applies difficulty multipliers", () => {
    expect(computeQuestReward({ ...base, difficulty: "easy" })).toMatchObject({ exp: 25, stats: { STR: 2 } });
    expect(computeQuestReward({ ...base, difficulty: "normal" })).toMatchObject({ exp: 50, stats: { STR: 4 } });
    expect(computeQuestReward({ ...base, difficulty: "hard" })).toMatchObject({ exp: 75, stats: { STR: 6 } });
  });

  it("applies the stat bonus to stats only", () => {
    const r = computeQuestReward({ ...base, difficulty: "normal", statBonusMultiplier: 1.5 });
    expect(r).toMatchObject({ exp: 50, stats: { STR: 6 } });
  });
});
