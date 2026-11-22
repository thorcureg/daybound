/**
 * Day boundaries. Timestamps are stored in UTC; a game "day" runs from the
 * user's rollover hour to the next rollover hour in their timezone.
 */
export const DEFAULT_TIMEZONE = "Asia/Manila";
export const DEFAULT_ROLLOVER_HOUR = 4;

export interface DaySettings {
  timeZone: string;
  /** 0..23, local hour when the game day changes. */
  rolloverHour: number;
}

export const DEFAULT_DAY_SETTINGS: DaySettings = {
  timeZone: DEFAULT_TIMEZONE,
  rolloverHour: DEFAULT_ROLLOVER_HOUR,
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = formatter(timeZone).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The game day an instant belongs to, as "YYYY-MM-DD".
 * Times before the rollover hour count toward the previous calendar day.
 * Works on local wall-clock time, so DST changes don't shift the boundary.
 */
export function gameDayKey(instant: Date, settings: DaySettings = DEFAULT_DAY_SETTINGS): string {
  const { rolloverHour, timeZone } = settings;
  if (!Number.isInteger(rolloverHour) || rolloverHour < 0 || rolloverHour > 23) {
    throw new RangeError(`rolloverHour must be 0..23, got ${rolloverHour}`);
  }
  const p = localParts(instant, timeZone);
  // Build the local calendar date as a UTC date purely for date arithmetic.
  const local = new Date(Date.UTC(p.year, p.month - 1, p.day));
  if (p.hour < rolloverHour) local.setUTCDate(local.getUTCDate() - 1);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

/** Whole game days between two day keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y!, m! - 1, d!);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}
