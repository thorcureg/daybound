import { describe, expect, it } from "vitest";
import { expToNextLevel, levelFromExp, totalExpForLevel } from "./leveling.ts";

describe("expToNextLevel", () => {
  it("follows 100 × level^1.5, rounded", () => {
    expect(expToNextLevel(1)).toBe(100);
    expect(expToNextLevel(2)).toBe(283);
    expect(expToNextLevel(3)).toBe(520);
    expect(expToNextLevel(10)).toBe(3162);
  });

  it("rejects invalid levels", () => {
    expect(() => expToNextLevel(0)).toThrow(RangeError);
    expect(() => expToNextLevel(1.5)).toThrow(RangeError);
  });
});

describe("levelFromExp", () => {
  it("starts at level 1 with no EXP", () => {
    expect(levelFromExp(0)).toEqual({ level: 1, expIntoLevel: 0, expForLevel: 100, progress: 0 });
  });

  it("levels up exactly at the threshold", () => {
    expect(levelFromExp(99).level).toBe(1);
    expect(levelFromExp(100)).toMatchObject({ level: 2, expIntoLevel: 0 });
    expect(levelFromExp(382)).toMatchObject({ level: 2, expIntoLevel: 282 });
    expect(levelFromExp(383)).toMatchObject({ level: 3, expIntoLevel: 0 });
  });

  it("agrees with totalExpForLevel", () => {
    for (let level = 1; level <= 30; level++) {
      expect(levelFromExp(totalExpForLevel(level)).level).toBe(level);
    }
  });

  it("rejects negative EXP", () => {
    expect(() => levelFromExp(-1)).toThrow(RangeError);
  });
});
