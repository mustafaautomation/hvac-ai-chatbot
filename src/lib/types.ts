export const SERVICE_TYPES = [
  "ac_repair",
  "furnace_install",
  "heat_pump",
  "duct_cleaning",
  "maintenance_plan",
  "furnace_repair",
  "ac_install",
  "thermostat",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_LABELS: Record<ServiceType, string> = {
  ac_repair: "AC repair",
  furnace_install: "Furnace installation",
  heat_pump: "Heat pump system",
  duct_cleaning: "Duct cleaning",
  maintenance_plan: "Comfort Club plan",
  furnace_repair: "Furnace repair",
  ac_install: "AC installation",
  thermostat: "Thermostat service",
};

export type Urgency = "emergency" | "soon" | "flexible";

export type LineItem = {
  label: string;
  low: number;
  high: number;
  note?: string;
};

export type Quote = {
  serviceType: ServiceType;
  serviceLabel: string;
  homeSqft: number;
  systemAge: number;
  urgency: Urgency;
  items: LineItem[];
  totalLow: number;
  totalHigh: number;
  assumptions: string[];
  financingNote?: string;
  validForDays: number;
};

export type SlotWindow = "morning" | "midday" | "afternoon" | "priority";

export type Slot = {
  id: string;
  start: string;
  end: string;
  label: string;
  window: SlotWindow;
  serviceType: ServiceType;
};

export type BookingStatus = "scheduled" | "rescheduled" | "cancelled";

export type Booking = {
  id: string;
  confirmationCode: string;
  name: string;
  phone: string;
  address: string;
  zip: string;
  slotId: string;
  slotStart: string;
  slotEnd: string;
  slotLabel: string;
  serviceType: ServiceType;
  issue: string;
  status: BookingStatus;
  tripFee: number;
  createdAt: string;
  updatedAt: string;
};

export type LeadStatus = "new" | "booked" | "emergency" | "closed";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  zip?: string;
  serviceType?: ServiceType;
  issue: string;
  source: "chat";
  status: LeadStatus;
  emergency: boolean;
  bookingId?: string;
  createdAt: string;
};

export type HandoffReason = "gas" | "carbon_monoxide" | "human";
export type HandoffStatus = "open" | "acknowledged" | "closed";

export type Handoff = {
  id: string;
  reference: string;
  reason: HandoffReason;
  summary: string;
  customerName?: string;
  phone?: string;
  address?: string;
  status: HandoffStatus;
  safetyMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type Citation = {
  id: string;
  title: string;
  section: string;
  excerpt: string;
};

export type ServiceAreaResult = {
  zip: string;
  inArea: boolean;
  zone: "core" | "extended" | "outside";
  neighborhood: string;
  tripFee: number;
  message: string;
};

export type ChatPart =
  | { type: "troubleshooting"; guide: TroubleshootingGuide }
  | { type: "quote"; quote: Quote }
  | { type: "slots"; slots: Slot[]; serviceType: ServiceType; note?: string }
  | {
      type: "booking_form";
      slot: Slot;
      serviceType: ServiceType;
      issue: string;
      defaults: { name?: string; phone?: string; address?: string };
    }
  | { type: "booking"; booking: Booking }
  | { type: "appointments"; bookings: Booking[]; note?: string }
  | { type: "service_area"; result: ServiceAreaResult }
  | { type: "citations"; sources: Citation[] }
  | { type: "handoff"; handoff: Handoff; tone: "safety" | "human" }
  | { type: "notice"; tone: "ok" | "warn"; title: string; body: string }
  | { type: "error"; text: string };

export type TroubleshootingGuide = {
  id: string;
  title: string;
  steps: { title: string; detail: string }[];
  stopIf: string;
};

export type ToolTrace = {
  name: string;
  input: unknown;
  summary: string;
};

export type Channel = "web" | "whatsapp" | "messenger";

export type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
  tools?: ToolTrace[];
  at: string;
};

export type Conversation = {
  id: string;
  channel: Channel;
  externalUser?: string;
  summary: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  parts: ChatPart[];
  tools?: ToolTrace[];
  suggestions?: string[];
  createdAt: string;
  engine?: "guided" | "model";
};

export type Draft = {
  serviceType?: ServiceType;
  homeSqft?: number;
  systemAge?: number;
  urgency?: Urgency;
  zip?: string;
  issue?: string;
  name?: string;
  phone?: string;
  address?: string;
  offeredSlots?: Slot[];
  pendingSlotId?: string;
  lastBookingCode?: string;
  rescheduleCode?: string;
  sqftAssumed?: boolean;
  ageAssumed?: boolean;
};

export type ChatAction =
  | { type: "select_slot"; slotId: string }
  | {
      type: "book";
      slotId: string;
      name: string;
      phone: string;
      address: string;
      issue?: string;
    }
  | { type: "cancel"; confirmationCode: string }
  | { type: "start_reschedule"; confirmationCode: string }
  | { type: "reschedule"; confirmationCode: string; slotId: string }
  | { type: "lookup"; query: string }
  | { type: "save_lead"; name?: string; phone?: string };

export type TurnResult = {
  message: ChatMessage;
  draft: Draft;
  tools: ToolTrace[];
  engine: "guided" | "model";
  conversationId?: string;
};
