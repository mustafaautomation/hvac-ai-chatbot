import { connection } from "next/server";
import { handleWhatsApp, verifyWhatsApp } from "@/lib/channels/whatsapp";
import { loadStore, saveStore } from "@/lib/store";

export async function GET(request: Request) {
  await connection();
  const result = verifyWhatsApp(new URL(request.url).searchParams);
  return new Response(result.body, { status: result.status });
}

export async function POST(request: Request) {
  await connection();
  const payload = await request.json().catch(() => ({}));
  const store = loadStore();
  const result = await handleWhatsApp(store, payload);
  saveStore(store);
  return Response.json({ ok: true, replies: result.replies });
}
