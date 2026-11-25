import {
  addDays,
  dateKey,
  formatSlotLabel,
  parseDateKey,
  zonedParts,
  zonedTimeToUtc,
} from "@/lib/time";
import type { ServiceType, Slot } from "@/lib/types";

const WINDOWS: Record<number, number[]> = {
  0: [],
  1: [8, 10, 12, 14, 16],
  2: [8, 10, 12, 14, 16],
  3: [8, 10, 12, 14, 16],
  4: [8, 10, 12, 14, 16],
  5: [8, 10, 12, 14, 16],
  6: [8, 10, 12],
};

function windowName(hour: number): Slot["window"] {
  if (hour < 12) return "morning";
  if (hour < 14) return "midday";
  return "afternoon";
}

export function listSlots(options: {
  now: Date;
  from?: string;
  to?: string;
  serviceType: ServiceType;
  taken?: Set<string>;
  limit?: number;
}): Slot[] {
  const taken = options.taken ?? new Set<string>();
  const limit = options.limit ?? 8;
  const today = zonedParts(options.now);
  const start = options.from ? parseDateKey(options.from) ?? today : today;
  const end = options.to ? parseDateKey(options.to) ?? addDays(start, 8) : addDays(start, 8);
  const endKey = dateKey(end);
  const candidates: Slot[] = [];
  let cursor = { year: start.year, month: start.month, day: start.day };

  for (let i = 0; i < 21; i += 1) {
    const key = dateKey(cursor);
    if (key > endKey) break;
    const noon = zonedTimeToUtc(cursor.year, cursor.month, cursor.day, 12, 0);
    const weekday = zonedParts(noon).weekday;
    for (const hour of WINDOWS[weekday] ?? []) {
      const startAt = zonedTimeToUtc(cursor.year, cursor.month, cursor.day, hour, 0);
      if (startAt.getTime() < options.now.getTime() + 90 * 60 * 1000) continue;
      const id = `${key}-${String(hour).padStart(2, "0")}00`;
      if (taken.has(id)) continue;
      const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
      candidates.push({
        id,
        start: startAt.toISOString(),
        end: endAt.toISOString(),
        label: formatSlotLabel(startAt, endAt),
        window: windowName(hour),
        serviceType: options.serviceType,
      });
    }
    cursor = addDays(cursor, 1);
  }

  return spread(candidates, limit);
}

function spread(slots: Slot[], limit: number): Slot[] {
  const perDay = new Map<string, number>();
  const first: Slot[] = [];
  const rest: Slot[] = [];
  for (const slot of slots) {
    const day = slot.id.slice(0, 10);
    const count = perDay.get(day) ?? 0;
    if (count < 2) {
      first.push(slot);
      perDay.set(day, count + 1);
    } else {
      rest.push(slot);
    }
  }
  return [...first, ...rest].slice(0, limit);
}

export function prioritySlot(now: Date, serviceType: ServiceType): Slot | null {
  const parts = zonedParts(now);
  if (parts.weekday === 0 || parts.hour >= 16) return null;
  const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const rounded = new Date(Math.ceil(start.getTime() / (30 * 60 * 1000)) * 30 * 60 * 1000);
  const end = new Date(rounded.getTime() + 2 * 60 * 60 * 1000);
  const labelTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(rounded);
  return {
    id: `priority-${dateKey(parts)}`,
    start: rounded.toISOString(),
    end: end.toISOString(),
    label: `Today · priority arrival around ${labelTime}`,
    window: "priority",
    serviceType,
  };
}

export function slotFromId(id: string, serviceType: ServiceType, now: Date): Slot | null {
  if (id.startsWith("priority-")) {
    const slot = prioritySlot(now, serviceType);
    return slot && slot.id === id ? slot : null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})00$/.exec(id);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const noon = zonedTimeToUtc(year, month, day, 12, 0);
  const weekday = zonedParts(noon).weekday;
  if (!(WINDOWS[weekday] ?? []).includes(hour)) return null;
  const start = zonedTimeToUtc(year, month, day, hour, 0);
  if (start.getTime() < now.getTime() + 60 * 60 * 1000) return null;
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return {
    id,
    start: start.toISOString(),
    end: end.toISOString(),
    label: formatSlotLabel(start, end),
    window: windowName(hour),
    serviceType,
  };
}
