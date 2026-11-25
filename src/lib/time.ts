export const TIME_ZONE = "America/Chicago";

export type Ymd = { year: number; month: number; day: number };

export type ZonedParts = Ymd & {
  hour: number;
  minute: number;
  weekday: number;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function zonedParts(date: Date, timeZone = TIME_ZONE): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const hour = map.hour === "24" ? 0 : Number(map.hour);
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    weekday: WEEKDAYS.indexOf(map.weekday ?? "Sun"),
  };
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = TIME_ZONE,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = zonedParts(new Date(utcGuess), timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
  return new Date(utcGuess - (asUtc - utcGuess));
}

export function addDays(parts: Ymd, days: number): Ymd {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function dateKey(parts: Ymd): string {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function parseDateKey(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function formatSlotLabel(start: Date, end: Date): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time.format(start)}–${time.format(end)}`;
}

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function startOfWeek(parts: Ymd): Ymd {
  const probe = zonedTimeToUtc(parts.year, parts.month, parts.day, 12, 0);
  const weekday = zonedParts(probe).weekday;
  const fromMonday = weekday === 0 ? 6 : weekday - 1;
  return addDays(parts, -fromMonday);
}
