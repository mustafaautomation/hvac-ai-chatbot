import { z } from "zod";
import { SERVICE_TYPES, type ChatPart } from "@/lib/types";

const service = z.enum(SERVICE_TYPES);

const line = z.object({
  label: z.string(),
  low: z.number(),
  high: z.number(),
  note: z.string().optional(),
});

const quote = z.object({
  serviceType: service,
  serviceLabel: z.string(),
  homeSqft: z.number(),
  systemAge: z.number(),
  urgency: z.enum(["emergency", "soon", "flexible"]),
  items: z.array(line),
  totalLow: z.number(),
  totalHigh: z.number(),
  assumptions: z.array(z.string()),
  financingNote: z.string().optional(),
  validForDays: z.number(),
});

const slot = z.object({
  id: z.string(),
  start: z.string(),
  end: z.string(),
  label: z.string(),
  window: z.enum(["morning", "midday", "afternoon", "priority"]),
  serviceType: service,
});

const booking = z.object({
  id: z.string(),
  confirmationCode: z.string(),
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  zip: z.string(),
  slotId: z.string(),
  slotStart: z.string(),
  slotEnd: z.string(),
  slotLabel: z.string(),
  serviceType: service,
  issue: z.string(),
  status: z.enum(["scheduled", "rescheduled", "cancelled"]),
  tripFee: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const chatPartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("troubleshooting"),
    guide: z.object({
      id: z.string(),
      title: z.string(),
      steps: z.array(z.object({ title: z.string(), detail: z.string() })),
      stopIf: z.string(),
    }),
  }),
  z.object({ type: z.literal("quote"), quote }),
  z.object({
    type: z.literal("slots"),
    slots: z.array(slot),
    serviceType: service,
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal("booking_form"),
    slot,
    serviceType: service,
    issue: z.string(),
    defaults: z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    }),
  }),
  z.object({ type: z.literal("booking"), booking }),
  z.object({
    type: z.literal("appointments"),
    bookings: z.array(booking),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal("service_area"),
    result: z.object({
      zip: z.string(),
      inArea: z.boolean(),
      zone: z.enum(["core", "extended", "outside"]),
      neighborhood: z.string(),
      tripFee: z.number(),
      message: z.string(),
    }),
  }),
  z.object({
    type: z.literal("citations"),
    sources: z.array(z.object({
      id: z.string(),
      title: z.string(),
      section: z.string(),
      excerpt: z.string(),
    })),
  }),
  z.object({
    type: z.literal("handoff"),
    handoff: z.object({
      id: z.string(),
      reference: z.string(),
      reason: z.enum(["gas", "carbon_monoxide", "human"]),
      summary: z.string(),
      customerName: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      status: z.enum(["open", "acknowledged", "closed"]),
      safetyMessage: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
    tone: z.enum(["safety", "human"]),
  }),
  z.object({
    type: z.literal("notice"),
    tone: z.enum(["ok", "warn"]),
    title: z.string(),
    body: z.string(),
  }),
  z.object({ type: z.literal("error"), text: z.string() }),
]);

export function parseChatParts(parts: unknown): ChatPart[] | null {
  const parsed = z.array(chatPartSchema).safeParse(parts);
  if (!parsed.success) return null;
  return parsed.data as ChatPart[];
}
