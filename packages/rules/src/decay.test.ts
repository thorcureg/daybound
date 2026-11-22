import { describe, expect, it } from "vitest";
import { decayedValue, isLapsed } from "./decay.ts";

describe("decayedValue", () => {
  it("does nothing during the grace period", () => {
    expect(decayedValue({ value: 100, peak: 100, inactiveDays: 14 })).toBe(100);
  });

  it("only counts full weeks after the grace period", () => {
    expect(decayedValue({ value: 100, peak: 100, inactiveDays: 20 })).toBe(100);
    expect(decayedValue({ value: 100, peak: 100, inactiveDays: 21 })).toBeCloseTo(98);
    expect(decayedValue({ value: 100, peak: 100, inactiveDays: 28 })).toBeCloseTo(96.04);
  });

  it("never drops below half the peak", () => {
    expect(decayedValue({ value: 100, peak: 100, inactiveDays: 5000 })).toBe(50);
  });

  it("never raises a value that is already under the floor", () => {
    expect(decayedValue({ value: 40, peak: 100, inactiveDays: 100 })).toBe(40);
  });
});

describe("isLapsed", () => {
  it("is true only after the grace period", () => {
    expect(isLapsed(14)).toBe(false);
    expect(isLapsed(15)).toBe(true);
  });
});
