import { runAgent } from "@/lib/agent/run";
import type { DemoStore } from "@/lib/store";

export function whatsappVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN || "northwind-demo";
}

export function verifyWhatsApp(params: URLSearchParams): { status: number; body: string } {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge") || "";
  if (mode === "subscribe" && token === whatsappVerifyToken()) {
    return { status: 200, body: challenge };
  }
  return { status: 403, body: "Forbidden" };
}

type WhatsAppPayload = {
  entry?: {
    changes?: {
      value?: {
        messages?: { from?: string; id?: string; type?: string; text?: { body?: string } }[];
      };
    }[];
  }[];
};

export async function handleWhatsApp(store: DemoStore, payload: WhatsAppPayload): Promise<{ replies: { to: string; text: string }[] }> {
  const replies: { to: string; text: string }[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        const text = message.text?.body?.trim();
        if (!text || !message.from) continue;
        const result = await runAgent({
          store,
          channel: "whatsapp",
          text,
          externalUser: message.from,
          conversationId: `wa_${message.from}`,
        });
        replies.push({ to: message.from, text: result.message.text });
        await sendWhatsApp(message.from, result.message.text);
      }
    }
  }
  return { replies };
}

async function sendWhatsApp(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;
  await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text.slice(0, 4000) },
    }),
  });
}
