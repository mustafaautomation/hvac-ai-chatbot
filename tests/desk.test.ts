import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectEmergency } from "@/lib/emergency";
import { retrieve } from "@/lib/kb/retrieve";
import { runGuided } from "@/lib/orchestrator";
import { getQuote } from "@/lib/quote";
import { listSlots, slotFromId } from "@/lib/schedule";
import { checkServiceArea } from "@/lib/service-area";
import { DemoStore, loadStore, saveStore } from "@/lib/store";
import { zonedParts, zonedTimeToUtc } from "@/lib/time";
import type { ChatPart } from "@/lib/types";

const NOW = new Date("2026-11-25T15:00:00.000Z");

function part<T extends ChatPart["type"]>(parts: ChatPart[], type: T): Extract<ChatPart, { type: T }> | undefined {
  return parts.find((item) => item.type === type) as Extract<ChatPart, { type: T }> | undefined;
}

describe("knowledge retrieval", () => {
  it("finds the frozen-coil guide for ice on the line", () => {
    const hits = retrieve("ice on the copper line and the coil is frozen", 3);
    expect(hits[0]?.articleId).toBe("trouble-frozen");
  });

  it("finds Comfort Club, financing, and warranty notes", () => {
    expect(retrieve("What does the Comfort Club include?", 1)[0]?.articleId).toBe("services-maintenance");
    expect(retrieve("Do you offer 0% financing for 12 months?", 1)[0]?.articleId).toBe("financing");
    expect(retrieve("10 year parts warranty on a new furnace", 1)[0]?.articleId).toBe("warranties");
  });
});

describe("quotes and service area", () => {
  it("sums the line items and prices urgency, size, and age", () => {
    const soon = getQuote({ serviceType: "ac_repair", homeSqft: 2200, systemAge: 12, urgency: "soon" });
    const rush = getQuote({ serviceType: "ac_repair", homeSqft: 2200, systemAge: 12, urgency: "emergency" });
    const flex = getQuote({ serviceType: "ac_repair", homeSqft: 2200, systemAge: 12, urgency: "flexible" });
    expect(soon.totalLow).toBe(soon.items.reduce((sum, item) => sum + item.low, 0));
    expect(soon.totalHigh).toBe(soon.items.reduce((sum, item) => sum + item.high, 0));
    expect(rush.totalHigh).toBeGreaterThan(soon.totalHigh);
    expect(flex.totalLow).toBeLessThan(soon.totalLow);
    const install = getQuote({ serviceType: "furnace_install", homeSqft: 2200, systemAge: 16, urgency: "soon" });
    expect(install.items.some((item) => item.label === "Duct transitions")).toBe(true);
    expect(install.financingNote).toMatch(/0%/);
    const plan = getQuote({ serviceType: "maintenance_plan", homeSqft: 1800, systemAge: 8, urgency: "soon" });
    expect(plan.financingNote).toBeUndefined();
    const bigger = getQuote({ serviceType: "heat_pump", homeSqft: 3000, systemAge: 10, urgency: "soon" });
    const smaller = getQuote({ serviceType: "heat_pump", homeSqft: 1400, systemAge: 10, urgency: "soon" });
    expect(bigger.totalHigh).toBeGreaterThan(smaller.totalHigh);
  });

  it("knows Austin core, extended, and outside ZIPs", () => {
    const core = checkServiceArea("78704");
    const cedar = checkServiceArea("78613");
    const georgetown = checkServiceArea("78628");
    const dallas = checkServiceArea("75201");
    expect(core).toMatchObject({ inArea: true, zone: "core", tripFee: 0, neighborhood: "South Congress" });
    expect(cedar).toMatchObject({ inArea: true, zone: "extended", tripFee: 49 });
    expect(georgetown).toMatchObject({ inArea: true, tripFee: 79 });
    expect(dallas).toMatchObject({ inArea: false, zone: "outside" });
    expect(checkServiceArea("7870")).toHaveProperty("error");
  });
});

describe("schedule", () => {
  it("builds Chicago windows and skips the past and Sunday", () => {
    const eight = zonedTimeToUtc(2026, 11, 25, 8, 0);
    expect(zonedParts(eight).hour).toBe(8);
    const slots = listSlots({ now: NOW, serviceType: "ac_repair", limit: 20 });
    expect(slots.some((slot) => slot.id === "2026-11-25-0800")).toBe(false);
    expect(slots.some((slot) => slot.id === "2026-11-25-1000")).toBe(false);
    expect(slots.some((slot) => slot.id === "2026-11-25-1200")).toBe(true);
    expect(slots.some((slot) => slot.id.startsWith("2026-11-29"))).toBe(false);
    const taken = listSlots({
      now: NOW,
      serviceType: "ac_repair",
      taken: new Set(["2026-11-25-1200"]),
      limit: 20,
    });
    expect(taken.some((slot) => slot.id === "2026-11-25-1200")).toBe(false);
    expect(slotFromId("2026-11-28-0800", "ac_repair", NOW)?.label).toMatch(/Sat/);
    expect(slotFromId("2026-11-29-0800", "ac_repair", NOW)).toBeNull();
  });
});

describe("guided desk", () => {
  it("runs the visit from problem to confirmation card", () => {
    const store = DemoStore.empty();
    const first = runGuided({
      store,
      text: "The AC is on but the house will not cool down. About 2,200 sq ft, the system is 12 years old, and the house is in 78704.",
      now: NOW,
    });
    expect(part(first.message.parts, "troubleshooting")?.guide.id).toBe("no_cooling");
    expect(part(first.message.parts, "quote")?.quote.totalHigh).toBeGreaterThan(0);
    const slots = part(first.message.parts, "slots");
    expect(slots?.slots.length).toBeGreaterThan(0);
    expect(first.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["check_service_area", "get_quote", "get_available_slots", "search_knowledge"]),
    );
    const slot = slots!.slots[0];
    const booked = runGuided({
      store,
      draft: first.draft,
      text: "Book the first window. I'm Alex Rivera, 512-555-0142, 1408 S Congress Ave, Austin, TX 78704.",
      now: NOW,
    });
    const booking = part(booked.message.parts, "booking");
    expect(booking?.booking.confirmationCode).toMatch(/^NW-/);
    expect(booking?.booking.slotId).toBe(slot.id);
    expect(booking?.booking.name).toBe("Alex Rivera");
    expect(store.data.leads.some((lead) => lead.status === "booked")).toBe(true);
    expect(booked.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["book_appointment", "create_crm_lead"]),
    );

    const again = runGuided({
      store,
      draft: first.draft,
      action: {
        type: "book",
        slotId: slot.id,
        name: "Sam Lee",
        phone: "512-555-0199",
        address: "900 W Mary St, Austin, TX 78704",
      },
      now: NOW,
    });
    expect(again.message.text).toMatch(/taken/i);

    const looked = runGuided({
      store,
      text: `Look up ${booking!.booking.confirmationCode}`,
      now: NOW,
    });
    expect(part(looked.message.parts, "appointments")?.bookings[0].confirmationCode).toBe(
      booking!.booking.confirmationCode,
    );
  });

  it("refuses troubleshooting on a gas smell and flags a handoff", () => {
    const store = DemoStore.empty();
    const turn = runGuided({
      store,
      text: "I smell gas by the furnace.",
      now: NOW,
    });
    expect(detectEmergency("I smell gas by the furnace.")).toBe("gas");
    expect(turn.message.parts.some((item) => item.type === "troubleshooting")).toBe(false);
    expect(turn.message.parts.some((item) => item.type === "quote")).toBe(false);
    expect(turn.message.text).toMatch(/911/);
    expect(turn.message.text).toMatch(/Leave|Get everyone out/i);
    const handoff = part(turn.message.parts, "handoff");
    expect(handoff?.tone).toBe("safety");
    expect(handoff?.handoff.reference).toMatch(/^HW-/);
    expect(turn.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["emergency_dispatch", "create_crm_lead"]),
    );
    expect(store.data.handoffs).toHaveLength(1);
    const policy = runGuided({
      store: DemoStore.empty(),
      text: "What is your emergency policy?",
      now: NOW,
    });
    expect(policy.message.parts.some((item) => item.type === "handoff")).toBe(false);
  });

  it("does not offer Dallas a window", () => {
    const turn = runGuided({
      store: DemoStore.empty(),
      text: "Do you service 75201?",
      now: NOW,
    });
    expect(part(turn.message.parts, "service_area")?.result.inArea).toBe(false);
    expect(turn.message.parts.some((item) => item.type === "slots")).toBe(false);
  });

  it("moves and cancels a visit", () => {
    const store = DemoStore.seeded(NOW);
    const original = store.data.bookings[0];
    expect(original.confirmationCode).toBe("NW-1842");
    const started = runGuided({
      store,
      text: `Reschedule ${original.confirmationCode}`,
      now: NOW,
    });
    const slots = part(started.message.parts, "slots");
    expect(slots?.slots.length).toBeGreaterThan(0);
    const moved = runGuided({
      store,
      draft: started.draft,
      action: { type: "reschedule", confirmationCode: original.confirmationCode, slotId: slots!.slots[0].id },
      now: NOW,
    });
    expect(part(moved.message.parts, "booking")?.booking.slotId).toBe(slots!.slots[0].id);
    const cancelled = runGuided({
      store,
      text: `Cancel ${original.confirmationCode}`,
      now: NOW,
    });
    expect(cancelled.message.text).toMatch(/cancelled/i);
    expect(store.lookup(original.confirmationCode)[0].status).toBe("cancelled");
  });
});

describe("store file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "northwind-"));
  const previous = process.env.STORE_PATH;

  afterEach(() => {
    if (previous === undefined) delete process.env.STORE_PATH;
    else process.env.STORE_PATH = previous;
  });

  it("seeds and reloads the board", () => {
    process.env.STORE_PATH = path.join(dir, "store.json");
    const first = loadStore();
    expect(first.data.bookings.length).toBeGreaterThan(0);
    first.data.leads[0].name = "Edited Lead";
    saveStore(first);
    const second = loadStore();
    expect(second.data.leads[0].name).toBe("Edited Lead");
  });
});
