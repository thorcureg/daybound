import { describe, expect, it } from "vitest";
import { daysBetween, gameDayKey } from "./time.ts";

const at = (iso: string) => new Date(iso);

describe("gameDayKey", () => {
  it("defaults to Manila with a 4 AM rollover", () => {
    // 03:59 Manila on the 22nd still belongs to the 21st.
    expect(gameDayKey(at("2026-11-21T19:59:00Z"))).toBe("2026-11-21");
    // 04:00 Manila starts the 22nd.
    expect(gameDayKey(at("2026-11-21T20:00:00Z"))).toBe("2026-11-22");
  });

  it("handles DST in New York", () => {
    const ny = { timeZone: "America/New_York", rolloverHour: 4 };
    // DST starts 2026-03-08 at 02:00. 07:30Z is 03:30 EDT.
    expect(gameDayKey(at("2026-03-08T07:30:00Z"), ny)).toBe("2026-03-07");
    // 08:00Z is 04:00 EDT.
    expect(gameDayKey(at("2026-03-08T08:00:00Z"), ny)).toBe("2026-03-08");
    // DST ends 2026-11-01. 08:59Z is 03:59 EST; 09:00Z is 04:00 EST.
    expect(gameDayKey(at("2026-11-01T08:59:00Z"), ny)).toBe("2026-10-31");
    expect(gameDayKey(at("2026-11-01T09:00:00Z"), ny)).toBe("2026-11-01");
  });

  it("handles a zone ahead of UTC across a year boundary", () => {
    const akl = { timeZone: "Pacific/Auckland", rolloverHour: 4 };
    // Auckland is UTC+13 in summer. 2025-12-31T14:30Z is 03:30 on Jan 1.
    expect(gameDayKey(at("2025-12-31T14:30:00Z"), akl)).toBe("2025-12-31");
    expect(gameDayKey(at("2025-12-31T15:00:00Z"), akl)).toBe("2026-01-01");
  });

  it("supports a midnight rollover", () => {
    const utc = { timeZone: "UTC", rolloverHour: 0 };
    expect(gameDayKey(at("2026-03-01T00:00:00Z"), utc)).toBe("2026-03-01");
    expect(gameDayKey(at("2026-02-28T23:59:59Z"), utc)).toBe("2026-02-28");
  });

  it("rejects an invalid rollover hour", () => {
    expect(() => gameDayKey(new Date(), { timeZone: "UTC", rolloverHour: 24 })).toThrow(RangeError);
  });
});

describe("daysBetween", () => {
  it("counts whole days across months", () => {
    expect(daysBetween("2026-11-21", "2026-12-01")).toBe(10);
    expect(daysBetween("2026-12-01", "2026-11-21")).toBe(-10);
  });
});
