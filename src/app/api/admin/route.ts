import { connection } from "next/server";
import { z } from "zod";
import { DemoStore, loadStore, saveStore } from "@/lib/store";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("acknowledge"), id: z.string() }),
  z.object({ action: z.literal("close_handoff"), id: z.string() }),
  z.object({ action: z.literal("cancel_booking"), id: z.string() }),
  z.object({
    action: z.literal("set_lead_status"),
    id: z.string(),
    status: z.enum(["new", "booked", "emergency", "closed"]),
  }),
  z.object({ action: z.literal("reset") }),
]);

export async function GET() {
  await connection();
  const store = loadStore();
  return Response.json(store.data);
}

export async function POST(request: Request) {
  await connection();
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Unknown admin action." }, { status: 400 });
  }
  const store = loadStore();
  const body = parsed.data;
  if (body.action === "acknowledge") {
    const handoff = store.acknowledge(body.id);
    if (!handoff) return Response.json({ error: "Handoff not found." }, { status: 404 });
  } else if (body.action === "close_handoff") {
    const handoff = store.data.handoffs.find((item) => item.id === body.id);
    if (!handoff) return Response.json({ error: "Handoff not found." }, { status: 404 });
    handoff.status = "closed";
    handoff.updatedAt = new Date().toISOString();
  } else if (body.action === "cancel_booking") {
    const booking = store.data.bookings.find((item) => item.id === body.id);
    if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });
    booking.status = "cancelled";
    booking.updatedAt = new Date().toISOString();
  } else if (body.action === "reset") {
    const seeded = DemoStore.seeded();
    saveStore(seeded);
    return Response.json(seeded.data);
  } else {
    const lead = store.setLeadStatus(body.id, body.status);
    if (!lead) return Response.json({ error: "Lead not found." }, { status: 404 });
  }
  saveStore(store);
  return Response.json(store.data);
}
