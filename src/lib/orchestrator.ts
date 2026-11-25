import { classify, confirmationCode, extractDetails, type Intent } from "@/lib/extract";
import { detectEmergency, safetyCopy } from "@/lib/emergency";
import {
  detectFrustration,
  detectInjection,
  detectSensitivePii,
  INJECTION_REPLY,
  isHvacDomain,
  maskPii,
  OFF_TOPIC_REPLY,
  PII_REPLY,
} from "@/lib/guardrails";
import { guideForText } from "@/lib/kb/guides";
import { composeFromHits, LOW_CONFIDENCE, retrieve, toCitations } from "@/lib/kb/retrieve";
import { DEFAULT_AGE, DEFAULT_SQFT, getQuote } from "@/lib/quote";
import { listSlots, prioritySlot, slotFromId } from "@/lib/schedule";
import { checkServiceArea } from "@/lib/service-area";
import type { DemoStore } from "@/lib/store";
import { SERVICE_LABELS, type ChatAction, type ChatPart, type Draft, type ServiceType, type Slot, type ToolTrace, type TurnResult, type Urgency } from "@/lib/types";

export function runGuided(input: {
  store: DemoStore;
  draft?: Draft;
  text?: string;
  action?: ChatAction;
  now?: Date;
}): TurnResult {
  const now = input.now ?? new Date();
  const text = (input.text ?? "").trim();
  let draft: Draft = { ...(input.draft ?? {}) };
  const tools: ToolTrace[] = [];

  if (text && detectEmergency(text)) {
    return safetyTurn(input.store, draft, text, tools);
  }
  if (text && detectInjection(text)) {
    return reply(draft, tools, INJECTION_REPLY, [
      {
        type: "notice",
        tone: "warn",
        title: "Staying on the desk",
        body: "I won't change my rules or reveal a hidden prompt.",
      },
    ]);
  }
  if (text && detectSensitivePii(text)) {
    const handoff = input.store.addHandoff({
      reason: "human",
      summary: maskPii(text),
      safetyMessage: PII_REPLY,
      customerName: draft.name,
      phone: draft.phone,
    });
    tools.push({
      name: "create_crm_lead",
      input: { issue: "sensitive payment or identity digits withheld" },
      summary: `Handoff ${handoff.reference}. Digits were masked.`,
    });
    return reply(draft, tools, PII_REPLY, [{ type: "handoff", handoff, tone: "human" }]);
  }
  if (text && detectFrustration(text)) {
    return openHumanHandoff(input.store, draft, tools, text, "The caller is frustrated and needs a person.");
  }
  if (input.action) {
    return runAction(input.store, draft, input.action, tools, now);
  }
  if (!text) {
    return reply(draft, tools, "Tell me what's going on with the heat or the air, or send a ZIP and I'll check the board.", []);
  }

  draft = extractDetails(text, draft);
  const intent = classify(text);
  const code = confirmationCode(text);

  if (draft.rescheduleCode && (intent.firstSlot || intent.book)) {
    const slotId = draft.offeredSlots?.[0]?.id;
    if (slotId) return finishReschedule(input.store, draft, tools, now, draft.rescheduleCode, slotId);
  }

  if (intent.book && (intent.firstSlot || draft.pendingSlotId)) {
    const slotId = draft.pendingSlotId ?? draft.offeredSlots?.[0]?.id;
    if (slotId) {
      if (draft.name && draft.phone && draft.address) {
        return placeBooking(input.store, draft, tools, now, {
          slotId,
          name: draft.name,
          phone: draft.phone,
          address: draft.address,
          issue: draft.issue,
        });
      }
      return bookingForm(draft, tools, now, slotId);
    }
  }

  if (intent.cancel) {
    const target = code ?? draft.lastBookingCode;
    if (target) return cancelVisit(input.store, draft, tools, now, target);
  }
  if (intent.reschedule) {
    const target = code ?? draft.lastBookingCode ?? draft.rescheduleCode;
    if (target) return beginReschedule(input.store, draft, tools, now, target);
  }
  if (code && !intent.book && !intent.quote) {
    return lookupVisit(input.store, draft, tools, code);
  }
  if (intent.lookup && (code || draft.phone)) {
    return lookupVisit(input.store, draft, tools, code ?? draft.phone ?? text);
  }
  if (intent.human) return openHumanHandoff(input.store, draft, tools, text, "Caller asked for a person.");
  if (intent.callback && !intent.problem && !intent.quote) {
    return callbackLead(input.store, draft, tools, text);
  }

  const wantsVisit = intent.problem || intent.quote || (intent.book && Boolean(draft.serviceType || guideForText(text)));
  if ((intent.area || draft.zip) && !wantsVisit) {
    return areaTurn(draft, tools, text);
  }
  if (wantsVisit) return visitTurn(input.store, draft, tools, now, text, intent);
  return knowledgeTurn(input.store, draft, tools, text);
}

function safetyTurn(store: DemoStore, draft: Draft, text: string, tools: ToolTrace[]): TurnResult {
  const kind = detectEmergency(text) ?? "gas";
  const copy = safetyCopy(kind);
  const handoff = store.addHandoff({
    reason: kind,
    summary: text,
    safetyMessage: copy.message,
    customerName: draft.name,
    phone: draft.phone,
    address: draft.address,
  });
  const lead = store.addLead({
    name: draft.name || "Emergency caller",
    phone: draft.phone || "Not given",
    issue: text,
    address: draft.address,
    zip: draft.zip,
    serviceType: draft.serviceType,
    status: "emergency",
    emergency: true,
  });
  tools.push({
    name: "emergency_dispatch",
    input: { reason: kind, summary: text },
    summary: `Immediate handoff ${handoff.reference}. No troubleshooting.`,
  });
  tools.push({
    name: "create_crm_lead",
    input: { name: lead.name, phone: lead.phone, emergency: true },
    summary: `Lead ${lead.id} flagged emergency.`,
  });
  const demo =
    "This is a portfolio demo, so nobody is actually paged. The handoff is on the dispatch board.";
  return reply(
    draft,
    tools,
    `${copy.message} Reference ${handoff.reference}. I flagged this for immediate handoff, and a coordinator would call only after the scene is safe. ${demo}`,
    [{ type: "handoff", handoff, tone: "safety" }],
  );
}

function runAction(
  store: DemoStore,
  draft: Draft,
  action: ChatAction,
  tools: ToolTrace[],
  now: Date,
): TurnResult {
  switch (action.type) {
    case "select_slot":
      if (draft.rescheduleCode) {
        return finishReschedule(store, draft, tools, now, draft.rescheduleCode, action.slotId);
      }
      return bookingForm(draft, tools, now, action.slotId);
    case "book":
      return placeBooking(store, draft, tools, now, action);
    case "cancel":
      return cancelVisit(store, draft, tools, now, action.confirmationCode);
    case "start_reschedule":
      return beginReschedule(store, draft, tools, now, action.confirmationCode);
    case "reschedule":
      return finishReschedule(store, draft, tools, now, action.confirmationCode, action.slotId);
    case "lookup":
      return lookupVisit(store, draft, tools, action.query);
    case "save_lead":
      return callbackLead(store, { ...draft, name: action.name ?? draft.name, phone: action.phone ?? draft.phone }, tools, draft.issue ?? "Callback requested");
    default:
      return reply(draft, tools, "I couldn't run that action.", []);
  }
}

function bookingForm(draft: Draft, tools: ToolTrace[], now: Date, slotId: string): TurnResult {
  const service = draft.serviceType ?? "ac_repair";
  const slot = slotFromId(slotId, service, now) ?? draft.offeredSlots?.find((item) => item.id === slotId);
  if (!slot) {
    return reply(draft, tools, "That window just closed. Pick another one from the list.", [
      { type: "notice", tone: "warn", title: "Window unavailable", body: "Choose a different arrival window." },
    ]);
  }
  draft.pendingSlotId = slot.id;
  draft.serviceType = service;
  return reply(
    draft,
    tools,
    `I can hold ${slot.label} for ${SERVICE_LABELS[service].toLowerCase()}. I need a name, a mobile number, and the street address with ZIP.`,
    [
      {
        type: "booking_form",
        slot,
        serviceType: service,
        issue: draft.issue ?? SERVICE_LABELS[service],
        defaults: { name: draft.name, phone: draft.phone, address: draft.address },
      },
    ],
  );
}

function placeBooking(
  store: DemoStore,
  draft: Draft,
  tools: ToolTrace[],
  now: Date,
  input: { slotId: string; name: string; phone: string; address: string; issue?: string },
): TurnResult {
  const service: ServiceType = draft.serviceType ?? "ac_repair";
  const slot = slotFromId(input.slotId, service, now) ?? draft.offeredSlots?.find((item) => item.id === input.slotId);
  if (!slot) {
    tools.push({
      name: "book_appointment",
      input,
      summary: "Slot is no longer open.",
    });
    return reply(draft, tools, "That window isn't open anymore. Pick another one.", [
      { type: "notice", tone: "warn", title: "Couldn't book", body: "The arrival window has passed or isn't on the board." },
    ]);
  }
  const result = store.book({
    name: input.name,
    phone: input.phone,
    address: input.address,
    slot,
    issue: input.issue || draft.issue || SERVICE_LABELS[service],
    serviceType: service,
    now,
  });
  tools.push({
    name: "book_appointment",
    input: { name: input.name, phone: input.phone, address: input.address, slot: slot.id, issue: input.issue },
    summary: result.ok ? `Booked ${result.booking.confirmationCode}` : result.error,
  });
  if (!result.ok) {
    return reply(draft, tools, result.error, [
      { type: "notice", tone: "warn", title: "Couldn't book", body: result.error },
    ]);
  }
  tools.push({
    name: "create_crm_lead",
    input: { name: result.lead.name, phone: result.lead.phone, service_type: service },
    summary: `Lead ${result.lead.id} marked booked.`,
  });
  draft.name = result.booking.name;
  draft.phone = result.booking.phone;
  draft.address = result.booking.address;
  draft.zip = result.booking.zip;
  draft.lastBookingCode = result.booking.confirmationCode;
  draft.pendingSlotId = undefined;
  const fee = result.booking.tripFee
    ? ` A $${result.booking.tripFee} trip fee applies for ${result.booking.zip}.`
    : "";
  return reply(
    draft,
    tools,
    `You're on the board. ${result.booking.confirmationCode} is ${result.booking.slotLabel} at ${result.booking.address}.${fee} A dispatcher can see it on the board. We'll text a reminder to ${result.booking.phone}. That text is fictional in this demo.`,
    [{ type: "booking", booking: result.booking }],
  );
}

function cancelVisit(store: DemoStore, draft: Draft, tools: ToolTrace[], now: Date, code: string): TurnResult {
  const result = store.cancel(code, now);
  tools.push({
    name: "cancel_appointment",
    input: { confirmation_code: code },
    summary: result.ok ? `Cancelled ${result.booking.confirmationCode}` : result.error,
  });
  if (!result.ok) {
    return reply(draft, tools, result.error, [
      { type: "notice", tone: "warn", title: "No visit to cancel", body: result.error },
    ]);
  }
  const late = result.late
    ? " This is inside four hours, so a real visit would carry a $79 late-change fee. I cancelled it anyway."
    : " There is no fee outside four hours.";
  return reply(draft, tools, `${result.booking.confirmationCode} is cancelled.${late}`, [
    {
      type: "notice",
      tone: "ok",
      title: "Visit cancelled",
      body: `${result.booking.name} is off the board for ${result.booking.slotLabel}.`,
    },
  ]);
}

function beginReschedule(
  store: DemoStore,
  draft: Draft,
  tools: ToolTrace[],
  now: Date,
  code: string,
): TurnResult {
  const found = store.lookup(code).filter((booking) => booking.status !== "cancelled");
  tools.push({
    name: "lookup_appointment",
    input: { confirmation_code: code },
    summary: found[0] ? found[0].confirmationCode : "Not found",
  });
  const booking = found[0];
  if (!booking) {
    return reply(draft, tools, `I can't find an open visit for ${code}.`, [
      { type: "notice", tone: "warn", title: "No visit", body: "Check the confirmation code and try again." },
    ]);
  }
  draft.rescheduleCode = booking.confirmationCode;
  draft.serviceType = booking.serviceType;
  draft.lastBookingCode = booking.confirmationCode;
  const slots = openSlots(store, booking.serviceType, now, draft.urgency);
  draft.offeredSlots = slots;
  tools.push({
    name: "get_available_slots",
    input: { service_type: booking.serviceType, date_range: "next open windows" },
    summary: slots.length ? `${slots.length} open windows` : "No open windows",
  });
  return reply(
    draft,
    tools,
    `${booking.confirmationCode} is currently ${booking.slotLabel}. Pick a new window.`,
    [{ type: "slots", slots, serviceType: booking.serviceType, note: "Rescheduling this visit" }],
  );
}

function finishReschedule(
  store: DemoStore,
  draft: Draft,
  tools: ToolTrace[],
  now: Date,
  code: string,
  slotId: string,
): TurnResult {
  const service = draft.serviceType ?? store.lookup(code)[0]?.serviceType ?? "ac_repair";
  const slot = slotFromId(slotId, service, now);
  if (!slot) {
    return reply(draft, tools, "That window isn't open. Pick another.", [
      { type: "notice", tone: "warn", title: "Window unavailable", body: "Choose a different arrival window." },
    ]);
  }
  const result = store.reschedule({ confirmationCode: code, slot, now });
  tools.push({
    name: "reschedule_appointment",
    input: { confirmation_code: code, slot: slotId },
    summary: result.ok ? `Moved to ${result.booking.slotLabel}` : result.error,
  });
  if (!result.ok) {
    return reply(draft, tools, result.error, [
      { type: "notice", tone: "warn", title: "Couldn't move it", body: result.error },
    ]);
  }
  draft.lastBookingCode = result.booking.confirmationCode;
  draft.rescheduleCode = undefined;
  draft.pendingSlotId = undefined;
  return reply(draft, tools, `${result.booking.confirmationCode} is now ${result.booking.slotLabel}.`, [
    { type: "booking", booking: result.booking },
  ]);
}

function lookupVisit(store: DemoStore, draft: Draft, tools: ToolTrace[], query: string): TurnResult {
  const bookings = store.lookup(query);
  tools.push({
    name: "lookup_appointment",
    input: { query },
    summary: bookings.length ? bookings.map((booking) => booking.confirmationCode).join(", ") : "No match",
  });
  if (bookings.length === 0) {
    return reply(draft, tools, "I don't have a visit under that code or phone.", [
      { type: "notice", tone: "warn", title: "Nothing on the board", body: "Try the confirmation code, like NW-1842, or the phone number on the visit." },
    ]);
  }
  const active = bookings.find((booking) => booking.status !== "cancelled");
  if (active) draft.lastBookingCode = active.confirmationCode;
  return reply(
    draft,
    tools,
    active
      ? `${active.confirmationCode} for ${active.name} is ${active.status}: ${active.slotLabel}.`
      : `${bookings[0].confirmationCode} is already cancelled.`,
    [{ type: "appointments", bookings }],
  );
}

function openHumanHandoff(
  store: DemoStore,
  draft: Draft,
  tools: ToolTrace[],
  text: string,
  reason: string,
): TurnResult {
  const summary = `${reason} ${maskPii(text)}`.trim();
  const handoff = store.addHandoff({
    reason: "human",
    summary,
    customerName: draft.name,
    phone: draft.phone,
    address: draft.address,
    safetyMessage: "A coordinator will follow up. This is not a safety dispatch, and this demo does not place the call.",
  });
  if (draft.phone) {
    store.addLead({
      name: draft.name || "Caller",
      phone: draft.phone,
      issue: summary,
      address: draft.address,
      zip: draft.zip,
      serviceType: draft.serviceType,
      status: "new",
      emergency: false,
    });
  }
  tools.push({
    name: "create_crm_lead",
    input: { phone: draft.phone, handoff: handoff.reference, reason },
    summary: `Human handoff ${handoff.reference}.`,
  });
  const ask = draft.phone ? `A coordinator is flagged at ${draft.phone}.` : "Add a phone number if you want a callback.";
  return reply(
    draft,
    tools,
    `I'm handing this to a person. Reference ${handoff.reference}. ${ask} In this demo the call is not placed.`,
    [{ type: "handoff", handoff, tone: "human" }],
    ["Check my ZIP", "Price a repair"],
  );
}

function callbackLead(store: DemoStore, draft: Draft, tools: ToolTrace[], text: string): TurnResult {
  if (!draft.phone) {
    return reply(draft, tools, "I can have someone call. What number should we use?", []);
  }
  const lead = store.addLead({
    name: draft.name || "Caller",
    phone: draft.phone,
    issue: text,
    address: draft.address,
    zip: draft.zip,
    serviceType: draft.serviceType,
    status: "new",
    emergency: false,
  });
  tools.push({
    name: "create_crm_lead",
    input: { name: lead.name, phone: lead.phone, issue: text },
    summary: `Lead ${lead.id} is waiting for a callback.`,
  });
  return reply(draft, tools, `I saved a callback for ${lead.name} at ${lead.phone}. It is on the leads list. Nobody will actually dial it in this demo.`, [
    { type: "notice", tone: "ok", title: "Callback saved", body: lead.issue },
  ]);
}

function areaTurn(draft: Draft, tools: ToolTrace[], text: string): TurnResult {
  if (!draft.zip) {
    return reply(draft, tools, "Send the 5-digit ZIP and I'll check it against the Austin board.", []);
  }
  const area = checkServiceArea(draft.zip);
  if ("error" in area) return reply(draft, tools, area.error, []);
  tools.push({
    name: "check_service_area",
    input: { zip: draft.zip },
    summary: area.message,
  });
  const hits = search(tools, text);
  const parts: ChatPart[] = [{ type: "service_area", result: area }];
  if (hits.length) parts.push({ type: "citations", sources: toCitations(hits) });
  const follow = area.inArea ? " If you tell me the system and the square footage, I can price a visit and show windows." : "";
  return reply(draft, tools, `${area.message}${follow}`, parts);
}

function visitTurn(
  store: DemoStore,
  draft: Draft,
  tools: ToolTrace[],
  now: Date,
  text: string,
  intent: Intent,
): TurnResult {
  const guide = intent.problem ? guideForText(text) : null;
  if (!draft.serviceType && guide?.id === "thermostat") draft.serviceType = "thermostat";
  if (!draft.serviceType && guide) draft.serviceType = "ac_repair";
  if (!draft.serviceType) {
    return reply(
      draft,
      tools,
      "I can price that once I know the job. Is it the air conditioner, the furnace, a heat pump, ducts, a thermostat, or the Comfort Club?",
      [],
    );
  }

  const parts: ChatPart[] = [];
  let outside = false;
  if (draft.zip) {
    const area = checkServiceArea(draft.zip);
    if (!("error" in area)) {
      tools.push({ name: "check_service_area", input: { zip: draft.zip }, summary: area.message });
      parts.push({ type: "service_area", result: area });
      outside = !area.inArea;
    }
  }

  if (!draft.homeSqft) {
    draft.homeSqft = DEFAULT_SQFT;
    draft.sqftAssumed = true;
  }
  if (draft.systemAge === undefined) {
    draft.systemAge = DEFAULT_AGE;
    draft.ageAssumed = true;
  }
  const urgency: Urgency = draft.urgency ?? "soon";
  draft.urgency = urgency;
  const quote = getQuote({
    serviceType: draft.serviceType,
    homeSqft: draft.homeSqft,
    systemAge: draft.systemAge,
    urgency,
    sqftAssumed: draft.sqftAssumed,
    ageAssumed: draft.ageAssumed,
  });
  tools.push({
    name: "get_quote",
    input: {
      service_type: draft.serviceType,
      home_sqft: draft.homeSqft,
      system_age: draft.systemAge,
      urgency,
    },
    summary: `${quote.serviceLabel} ${quote.totalLow}–${quote.totalHigh}`,
  });
  if (guide) parts.push({ type: "troubleshooting", guide });
  parts.push({ type: "quote", quote });

  if (!outside) {
    const slots = openSlots(store, draft.serviceType, now, urgency);
    draft.offeredSlots = slots;
    tools.push({
      name: "get_available_slots",
      input: { service_type: draft.serviceType, date_range: "next open windows" },
      summary: slots.length ? slots.map((slot) => slot.label).slice(0, 3).join("; ") : "No open windows",
    });
    parts.push({
      type: "slots",
      slots,
      serviceType: draft.serviceType,
      note: draft.zip ? undefined : "Add the ZIP with your address so I can confirm the truck route.",
    });
  }

  const hits = search(tools, text);
  if (hits.length) parts.push({ type: "citations", sources: toCitations(hits) });

  const sentences = [
    guide
      ? "Start with the safe checks. They clear a lot of calls before a truck rolls."
      : `Here is a sample range for ${quote.serviceLabel.toLowerCase()}.`,
    `For a ${quote.homeSqft.toLocaleString()} sq ft home with a ${quote.systemAge}-year-old system, the guide range is on the card. It is not a bid.`,
  ];
  if (draft.sqftAssumed || draft.ageAssumed) {
    sentences.push("I marked the assumptions I had to fill in. Correct them and I'll reprice it.");
  }
  if (outside) sentences.push("I can't put a truck on the board for that ZIP.");
  else sentences.push("Pick a window if you want someone out, or send a name, phone, and address with the word book.");
  return reply(draft, tools, sentences.join(" "), parts);
}

function knowledgeTurn(store: DemoStore, draft: Draft, tools: ToolTrace[], text: string): TurnResult {
  const hits = search(tools, text);
  const confident = hits[0] && hits[0].score >= LOW_CONFIDENCE;
  if (!confident) {
    if (!isHvacDomain(text)) {
      return reply(draft, tools, OFF_TOPIC_REPLY, [
        {
          type: "notice",
          tone: "warn",
          title: "Outside this desk",
          body: "Ask about the AC, the furnace, a heat pump, ducts, a thermostat, pricing, or a visit.",
        },
      ]);
    }
    const handoff = store.addHandoff({
      reason: "human",
      summary: `I don't know this from the guides: ${maskPii(text)}`,
      customerName: draft.name,
      phone: draft.phone,
      safetyMessage: "Low retrieval confidence. A person should answer.",
    });
    tools.push({
      name: "create_crm_lead",
      input: { reason: "low_confidence", query: text },
      summary: `I don't know. Handoff ${handoff.reference}.`,
    });
    return reply(
      draft,
      tools,
      `I don't know that from the Northwind guides, so I handed it to a coordinator. Reference ${handoff.reference}.`,
      [{ type: "handoff", handoff, tone: "human" }],
    );
  }
  const parts: ChatPart[] = [{ type: "citations", sources: toCitations(hits) }];
  return reply(
    draft,
    tools,
    `${composeFromHits(text, hits)} I can price a visit if you tell me the home size and the ZIP.`,
    parts,
    ["Price a repair", "Check a ZIP", "Talk to a person"],
  );
}

function openSlots(store: DemoStore, service: ServiceType, now: Date, urgency?: Urgency): Slot[] {
  const taken = store.takenSlotIds();
  const slots = listSlots({ now, serviceType: service, taken, limit: 6 });
  if (urgency === "emergency") {
    const priority = prioritySlot(now, service);
    if (priority && !taken.has(priority.id)) slots.unshift(priority);
  }
  return slots;
}

function search(tools: ToolTrace[], query: string) {
  const hits = retrieve(query, 3);
  tools.push({
    name: "search_knowledge",
    input: { query },
    summary: hits.length ? hits.map((hit) => `${hit.title} · ${hit.heading}`).join("; ") : "No matching guide",
  });
  return hits;
}

function reply(
  draft: Draft,
  tools: ToolTrace[],
  text: string,
  parts: ChatPart[],
  suggestions?: string[],
): TurnResult {
  return {
    engine: "guided",
    draft,
    tools,
    message: {
      id: crypto.randomUUID(),
      role: "assistant",
      text,
      parts,
      tools,
      suggestions,
      createdAt: new Date().toISOString(),
      engine: "guided",
    },
  };
}
