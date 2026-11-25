import { connection } from "next/server";
import { handleMessenger, verifyMessenger } from "@/lib/channels/messenger";
import { loadStore, saveStore } from "@/lib/store";

export async function GET(request: Request) {
  await connection();
  const result = verifyMessenger(new URL(request.url).searchParams);
  return new Response(result.body, { status: result.status });
}

export async function POST(request: Request) {
  await connection();
  const payload = await request.json().catch(() => ({}));
  const store = loadStore();
  const result = await handleMessenger(store, payload);
  saveStore(store);
  return Response.json({ ok: true, replies: result.replies });
}
