import { connection } from "next/server";
import { z } from "zod";
import { logTurn, runAgent } from "@/lib/agent/run";
import { parseChatParts } from "@/lib/chat-parts";
import { loadStore, saveStore } from "@/lib/store";
import { SERVICE_TYPES, type ToolTrace, type TurnResult } from "@/lib/types";

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

  const validated = parseChatParts(result.message.parts);
  if (!validated) {
    result.message = {
      ...result.message,
      parts: [{ type: "error", text: "A card payload failed validation. The reply text is still here." }],
    };
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      void writeTurn(controller, encoder, result);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

function phaseFor(tools: ToolTrace[]): string {
  const names = new Set(tools.map((tool) => tool.name));
  if (names.has("emergency_dispatch")) return "Opening a safety handoff…";
  if (names.has("book_appointment")) return "Putting the visit on the board…";
  if (names.has("get_available_slots")) return "Checking the calendar…";
  if (names.has("get_quote")) return "Pricing the visit…";
  if (names.has("check_service_area")) return "Checking the service area…";
  if (names.has("search_knowledge")) return "Looking in the guides…";
  return "Looking in the guides…";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeTurn(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  result: TurnResult,
) {
  const send = (payload: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
  };
  try {
    send({ type: "phase", label: phaseFor(result.tools) });
    const words = result.message.text.split(/\s+/).filter(Boolean);
    const groups: string[] = [];
    for (let index = 0; index < words.length; ) {
      const size = 2 + (groups.length % 3);
      const slice = words.slice(index, index + size);
      const last = index + size >= words.length;
      groups.push(`${slice.join(" ")}${last ? "" : " "}`);
      index += size;
    }
    const hold = result.engine === "model" ? 160 : 340;
    await sleep(hold);
    const budget = result.engine === "model" ? 420 : 520;
    const gap = groups.length ? Math.min(26, Math.max(10, Math.floor(budget / groups.length))) : 0;
    for (const group of groups) {
      send({ type: "text", delta: group });
      if (gap) await sleep(gap);
    }
    send({
      type: "done",
      message: result.message,
      draft: result.draft,
      conversationId: result.conversationId,
      engine: result.engine,
    });
    controller.close();
  } catch {
    try {
      controller.close();
    } catch {
      /* client already gone */
    }
  }
}
