import { digits, titleCaseName } from "@/lib/format";
import { zipFromText } from "@/lib/service-area";
import type { Draft, ServiceType, Urgency } from "@/lib/types";

const SERVICE_PATTERNS: [ServiceType, RegExp][] = [
  ["heat_pump", /heat\s*pumps?/i],
  ["duct_cleaning", /\bducts?\b/i],
  ["maintenance_plan", /comfort club|maintenance plan|tune-?up/i],
  ["thermostat", /thermostat/i],
  ["furnace_install", /new furnace|furnace install|replace (the |my )?furnace|furnace replacement/i],
  ["ac_install", /new (ac|a\/c|air conditioner)|replace (the |my )?(ac|a\/c|system)|ac install/i],
  ["furnace_repair", /furnace|no heat|not heating|won't heat|will not heat|\bheater\b/i],
  ["ac_repair", /\bac\b|a\/c|air condition|not cooling|won't cool|will not cool|no cool/i],
];

export type Intent = {
  cancel: boolean;
  reschedule: boolean;
  lookup: boolean;
  area: boolean;
  quote: boolean;
  problem: boolean;
  callback: boolean;
  human: boolean;
  book: boolean;
  firstSlot: boolean;
};

export function classify(text: string): Intent {
  const value = text.toLowerCase();
  return {
    cancel: /\bcancel\b/.test(value),
    reschedule: /reschedule|move (my |the )?appointment|change (my |the )?(time|window|appointment)/.test(value),
    lookup: /look\s*up|my appointment|confirmation|what time is|when is my/.test(value),
    area: /service area|do you (service|serve|come)|come out|cover\b|zip/.test(value),
    quote: /price|cost|how much|quote|estimate|what would/.test(value),
    problem: /not cooling|won't cool|will not cool|no cool|no heat|not heating|\bfrozen\b|\bice\b|thermostat|warm air|blowing warm|won't turn|will not turn|\bbroken\b|\bleak\b|\bnoisy\b|\bsmell\b/.test(value),
    callback: /call me|callback|call me back|have someone call/.test(value),
    human: /speak to|talk to (a )?(person|human|someone)|real person|\bhuman\b|dispatcher|representative|operator/.test(value),
    book: /\bbook\b|schedule|come out|put me on|set up a visit/.test(value),
    firstSlot: /\b(first|earliest|soonest)\b/.test(value),
  };
}

export function extractDetails(text: string, draft: Draft): Draft {
  const next: Draft = { ...draft };
  const normalized = text.replace(/(\d),(\d)/g, "$1$2");
  const sqft = normalized.match(/(\d{3,5})\s*(?:sq\.?\s*ft|square feet|sqft)\b/i);
  if (sqft) {
    next.homeSqft = Number(sqft[1]);
    next.sqftAssumed = false;
  }
  const age = normalized.match(/(\d{1,2})\s*(?:years?\s*old|year-old|yo)\b/i);
  if (age) {
    next.systemAge = Number(age[1]);
    next.ageAssumed = false;
  }
  const zip = zipFromText(normalized);
  if (zip) next.zip = zip;
  const phone = normalized.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (phone && digits(phone[0]).length === 10) next.phone = phone[0];
  const name = normalized.match(/(?:i'm|i am|this is|my name is)\s+([a-z]+(?:\s+[a-z]+){0,2})/i);
  if (name) {
    const candidate = name[1].trim();
    if (!/^(in|at|on|from|the|a)\b/i.test(candidate)) next.name = titleCaseName(candidate);
  }
  const street = normalized.match(
    /\b\d{2,5}\s+[0-9a-z.'\s]+?(?:avenue|ave|street|st|road|rd|drive|dr|lane|ln|blvd|boulevard|way|court|ct)\b[^.\n]{0,40}/i,
  );
  if (street) next.address = street[0].replace(/\s+/g, " ").trim();
  const service = detectService(normalized);
  if (service) next.serviceType = service;
  const urgency = detectUrgency(normalized);
  if (urgency) next.urgency = urgency;
  if ((classify(normalized).problem || service) && !next.issue) {
    next.issue = text.trim().slice(0, 240);
  }
  return next;
}

export function detectService(text: string): ServiceType | undefined {
  for (const [service, pattern] of SERVICE_PATTERNS) {
    if (pattern.test(text)) return service;
  }
  return undefined;
}

export function detectUrgency(text: string): Urgency | undefined {
  if (/no rush|flexible|whenever|next week|next month/.test(text.toLowerCase())) return "flexible";
  if (/same[- ]day|right now|asap|as soon as|emergency|today/.test(text.toLowerCase())) return "emergency";
  return undefined;
}

export function confirmationCode(text: string): string | undefined {
  const match = text.toUpperCase().match(/NW-\d{4}/);
  return match?.[0];
}
