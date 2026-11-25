import { runAgent } from "@/lib/agent/run";
import type { DemoStore } from "@/lib/store";

export function messengerVerifyToken(): string {
  return process.env.MESSENGER_VERIFY_TOKEN || "northwind-demo";
}

export function verifyMessenger(params: URLSearchParams): { status: number; body: string } {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge") || "";
  if (mode === "subscribe" && token === messengerVerifyToken()) {
    return { status: 200, body: challenge };
  }
  return { status: 403, body: "Forbidden" };
}

type MessengerPayload = {
  entry?: {
    messaging?: { sender?: { id?: string }; message?: { text?: string } }[];
  }[];
};

export async function handleMessenger(store: DemoStore, payload: MessengerPayload): Promise<{ replies: { to: string; text: string }[] }> {
  const replies: { to: string; text: string }[] = [];
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const text = event.message?.text?.trim();
      const sender = event.sender?.id;
      if (!text || !sender) continue;
      const result = await runAgent({
        store,
        channel: "messenger",
        text,
        externalUser: sender,
        conversationId: `fb_${sender}`,
      });
      replies.push({ to: sender, text: result.message.text });
      await sendMessenger(sender, result.message.text);
    }
  }
  return { replies };
}

async function sendMessenger(to: string, text: string): Promise<void> {
  const token = process.env.MESSENGER_PAGE_TOKEN;
  if (!token) return;
  await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: to }, message: { text: text.slice(0, 2000) } }),
  });
}
