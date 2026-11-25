import fs from "node:fs";
import path from "node:path";
import { digits, formatPhone } from "@/lib/format";
import { listSlots } from "@/lib/schedule";
import { checkServiceArea, zipFromText } from "@/lib/service-area";
import type {
  Booking,
  Channel,
  Conversation,
  Handoff,
  HandoffReason,
  Lead,
  LeadStatus,
  ServiceType,
  Slot,
  ToolTrace,
} from "@/lib/types";

export type StoreData = {
  bookings: Booking[];
  leads: Lead[];
  handoffs: Handoff[];
  conversations: Conversation[];
  nextNumber: number;
};

function nid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export class DemoStore {
  constructor(public data: StoreData) {}

  static empty(nextNumber = 1900): DemoStore {
    return new DemoStore({ bookings: [], leads: [], handoffs: [], conversations: [], nextNumber });
  }

  static seeded(now = new Date()): DemoStore {
    const store = DemoStore.empty(1842);
    const slots = listSlots({
      now,
      serviceType: "ac_repair",
      limit: 12,
    });
    const bookAt = (index: number, input: Omit<Parameters<DemoStore["book"]>[0], "slot">) => {
      const slot = slots[index];
      if (!slot) return;
      store.book({ ...input, slot });
    };
    bookAt(0, {
      name: "Jordan Hale",
      phone: "512-555-0177",
      address: "1604 Enfield Rd, Austin, TX 78703",
      issue: "Spring Comfort Club tune-up",
      serviceType: "maintenance_plan",
    });
    bookAt(2, {
      name: "Priya Shah",
      phone: "512-555-0164",
      address: "2208 S 5th St, Austin, TX 78704",
      issue: "Upstairs not cooling in the afternoon",
      serviceType: "ac_repair",
    });
    bookAt(4, {
      name: "Chris Alvarez",
      phone: "512-555-0133",
      address: "4501 Duval St, Austin, TX 78751",
      issue: "Dust from the vents after a remodel",
      serviceType: "duct_cleaning",
    });
    store.addLead({
      name: "Sam Ortiz",
      phone: "512-555-0188",
      issue: "Asked for a heat pump range, no date yet",
      serviceType: "heat_pump",
      zip: "78731",
      address: "Northwest Hills",
      status: "new",
      emergency: false,
    });
    store.addHandoff({
      reason: "human",
      summary: "Customer asked for a person about a noisy condenser. Already called back.",
      customerName: "Riley Chen",
      phone: "512-555-0119",
      status: "acknowledged",
    });
    return store;
  }

  takenSlotIds(): Set<string> {
    return new Set(
      this.data.bookings
        .filter((booking) => booking.status !== "cancelled")
        .map((booking) => booking.slotId),
    );
  }

  book(input: {
    name: string;
    phone: string;
    address: string;
    slot: Slot;
    issue: string;
    serviceType: ServiceType;
    now?: Date;
  }): { ok: true; booking: Booking; lead: Lead } | { ok: false; error: string } {
    const phone = digits(input.phone);
    if (input.name.trim().length < 2) return { ok: false, error: "I need a name." };
    if (phone.length !== 10) return { ok: false, error: "I need a 10-digit phone number." };
    if (input.address.trim().length < 8) return { ok: false, error: "I need a street address." };
    const zip = zipFromText(input.address);
    if (!zip) {
      return { ok: false, error: "Add a 5-digit ZIP to the address so I can confirm the truck can get there." };
    }
    const area = checkServiceArea(zip);
    if ("error" in area) return { ok: false, error: area.error };
    if (!area.inArea) return { ok: false, error: area.message };
    if (this.takenSlotIds().has(input.slot.id)) {
      return { ok: false, error: "That window was just taken. Pick another one." };
    }
    const now = (input.now ?? new Date()).toISOString();
    const booking: Booking = {
      id: nid("bkg"),
      confirmationCode: `NW-${String(this.data.nextNumber).padStart(4, "0")}`,
      name: input.name.trim(),
      phone: formatPhone(phone),
      address: input.address.trim(),
      zip,
      slotId: input.slot.id,
      slotStart: input.slot.start,
      slotEnd: input.slot.end,
      slotLabel: input.slot.label,
      serviceType: input.serviceType,
      issue: input.issue.trim() || "Service visit",
      status: "scheduled",
      tripFee: area.tripFee,
      createdAt: now,
      updatedAt: now,
    };
    this.data.nextNumber += 1;
    this.data.bookings.push(booking);
    const lead = this.addLead({
      name: booking.name,
      phone: booking.phone,
      address: booking.address,
      zip: booking.zip,
      serviceType: booking.serviceType,
      issue: booking.issue,
      status: "booked",
      emergency: false,
      bookingId: booking.id,
    });
    return { ok: true, booking, lead };
  }

  lookup(query: string): Booking[] {
    const code = query.toUpperCase().match(/NW-\d{4}/)?.[0];
    const phone = digits(query);
    return this.data.bookings
      .filter((booking) => {
        if (code && booking.confirmationCode === code) return true;
        if (phone.length === 10 && digits(booking.phone) === phone) return true;
        return false;
      })
      .sort((a, b) => a.slotStart.localeCompare(b.slotStart));
  }

  cancel(confirmationCode: string, now = new Date()): { ok: true; booking: Booking; late: boolean } | { ok: false; error: string } {
    const booking = this.findActive(confirmationCode);
    if (!booking) return { ok: false, error: `I can't find an open visit for ${confirmationCode.toUpperCase()}.` };
    const late = new Date(booking.slotStart).getTime() - now.getTime() < 4 * 60 * 60 * 1000;
    booking.status = "cancelled";
    booking.updatedAt = now.toISOString();
    return { ok: true, booking, late };
  }

  reschedule(input: {
    confirmationCode: string;
    slot: Slot;
    now?: Date;
  }): { ok: true; booking: Booking } | { ok: false; error: string } {
    const booking = this.findActive(input.confirmationCode);
    if (!booking) {
      return { ok: false, error: `I can't find an open visit for ${input.confirmationCode.toUpperCase()}.` };
    }
    if (this.takenSlotIds().has(input.slot.id) && input.slot.id !== booking.slotId) {
      return { ok: false, error: "That window was just taken. Pick another one." };
    }
    const now = input.now ?? new Date();
    booking.slotId = input.slot.id;
    booking.slotStart = input.slot.start;
    booking.slotEnd = input.slot.end;
    booking.slotLabel = input.slot.label;
    booking.status = "rescheduled";
    booking.updatedAt = now.toISOString();
    return { ok: true, booking };
  }

  addLead(input: {
    name: string;
    phone: string;
    issue: string;
    serviceType?: ServiceType;
    address?: string;
    zip?: string;
    status: LeadStatus;
    emergency: boolean;
    bookingId?: string;
  }): Lead {
    const lead: Lead = {
      id: nid("lead"),
      name: input.name.trim() || "Unknown caller",
      phone: formatPhone(input.phone),
      address: input.address,
      zip: input.zip,
      serviceType: input.serviceType,
      issue: input.issue,
      source: "chat",
      status: input.status,
      emergency: input.emergency,
      bookingId: input.bookingId,
      createdAt: new Date().toISOString(),
    };
    this.data.leads.unshift(lead);
    return lead;
  }

  addHandoff(input: {
    reason: HandoffReason;
    summary: string;
    safetyMessage?: string;
    customerName?: string;
    phone?: string;
    address?: string;
    status?: Handoff["status"];
  }): Handoff {
    const now = new Date().toISOString();
    const handoff: Handoff = {
      id: nid("hof"),
      reference: `HW-${String(this.data.nextNumber).padStart(4, "0")}`,
      reason: input.reason,
      summary: input.summary,
      customerName: input.customerName,
      phone: input.phone ? formatPhone(input.phone) : undefined,
      address: input.address,
      status: input.status ?? "open",
      safetyMessage: input.safetyMessage ?? "",
      createdAt: now,
      updatedAt: now,
    };
    this.data.nextNumber += 1;
    this.data.handoffs.unshift(handoff);
    return handoff;
  }

  acknowledge(id: string): Handoff | null {
    const handoff = this.data.handoffs.find((item) => item.id === id);
    if (!handoff) return null;
    handoff.status = "acknowledged";
    handoff.updatedAt = new Date().toISOString();
    return handoff;
  }

  recordTurn(input: {
    conversationId?: string;
    channel: Channel;
    externalUser?: string;
    userText?: string;
    assistantText: string;
    tools?: ToolTrace[];
  }): string {
    const now = new Date().toISOString();
    const id = input.conversationId || `con_${crypto.randomUUID().slice(0, 8)}`;
    let conversation = this.data.conversations.find((item) => item.id === id);
    if (!conversation) {
      conversation = {
        id,
        channel: input.channel,
        externalUser: input.externalUser,
        summary: (input.userText || input.assistantText).slice(0, 180),
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      this.data.conversations.unshift(conversation);
    }
    if (input.userText) {
      conversation.messages.push({ role: "user", text: input.userText, at: now });
      conversation.summary = input.userText.slice(0, 180);
    }
    conversation.messages.push({
      role: "assistant",
      text: input.assistantText,
      tools: input.tools,
      at: now,
    });
    conversation.updatedAt = now;
    if (input.externalUser) conversation.externalUser = input.externalUser;
    return id;
  }

  setLeadStatus(id: string, status: LeadStatus): Lead | null {
    const lead = this.data.leads.find((item) => item.id === id);
    if (!lead) return null;
    lead.status = status;
    return lead;
  }

  private findActive(confirmationCode: string): Booking | undefined {
    const code = confirmationCode.toUpperCase();
    return this.data.bookings.find(
      (booking) => booking.confirmationCode === code && booking.status !== "cancelled",
    );
  }
}

export function storeFilePath(): string {
  return process.env.STORE_PATH ?? path.join(process.cwd(), "data", "store.json");
}

export function loadStore(): DemoStore {
  const file = storeFilePath();
  try {
    const raw = fs.readFileSync(/* turbopackIgnore: true */ file, "utf8");
    const parsed = JSON.parse(raw) as StoreData;
    if (!parsed.bookings || !parsed.leads || !parsed.handoffs) throw new Error("bad store");
    parsed.conversations ??= [];
    return new DemoStore(parsed);
  } catch {
    const seeded = DemoStore.seeded();
    saveStore(seeded);
    return seeded;
  }
}

export function saveStore(store: DemoStore): void {
  const file = storeFilePath();
  fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(/* turbopackIgnore: true */ temp, JSON.stringify(store.data, null, 2));
  fs.renameSync(/* turbopackIgnore: true */ temp, file);
}
