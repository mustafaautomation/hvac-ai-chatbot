import { connection } from "next/server";
import { z } from "zod";
import { logTurn, runAgent } from "@/lib/agent/run";
import { loadStore, saveStore } from "@/lib/store";
import { SERVICE_TYPES } from "@/lib/types";

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("select_slot"), slotId: z.string() }),
  z.object({
    type: z.literal("book"),
    slotId: z.string(),
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    issue: z.string().optional(),
  }),
  z.object({ type: z.literal("cancel"), confirmationCode: z.string() }),
  z.object({ type: z.literal("start_reschedule"), confirmationCode: z.string() }),
  z.object({ type: z.literal("reschedule"), confirmationCode: z.string(), slotId: z.string() }),
  z.object({ type: z.literal("lookup"), query: z.string() }),
  z.object({ type: z.literal("save_lead"), name: z.string().optional(), phone: z.string().optional() }),
]);

const draftSchema = z.object({
  serviceType: z.enum(SERVICE_TYPES).optional(),
  homeSqft: z.number().optional(),
  systemAge: z.number().optional(),
  urgency: z.enum(["emergency", "soon", "flexible"]).optional(),
  zip: z.string().optional(),
  issue: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  offeredSlots: z.array(z.object({
    id: z.string(),
    start: z.string(),
    end: z.string(),
    label: z.string(),
    window: z.enum(["morning", "midday", "afternoon", "priority"]),
    serviceType: z.enum(SERVICE_TYPES),
  })).optional(),
  pendingSlotId: z.string().optional(),
  lastBookingCode: z.string().optional(),
  rescheduleCode: z.string().optional(),
  sqftAssumed: z.boolean().optional(),
  ageAssumed: z.boolean().optional(),
}).optional();

const bodySchema = z.object({
  text: z.string().optional(),
  action: actionSchema.optional(),
  draft: draftSchema,
  engine: z.enum(["guided", "model"]).optional(),
  conversationId: z.string().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() })).optional(),
});

export async function POST(request: Request) {
  await connection();
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Send a message or an action." }, { status: 400 });
  }
  const body = parsed.data;
  const store = loadStore();
  const result = await runAgent({
    store,
    channel: "web",
    text: body.text,
    action: body.action,
    draft: body.draft,
    history: body.history,
    conversationId: body.conversationId,
    engine: body.engine,
  });
  saveStore(store);
  logTurn("web", body.text ?? body.action?.type ?? "", result.tools.map((tool) => tool.name));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const words = result.message.text.split(/(\s+)/);
      for (const word of words) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", delta: word })}\n\n`));
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: "done",
        message: result.message,
        draft: result.draft,
        conversationId: result.conversationId,
        engine: result.engine,
      })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
