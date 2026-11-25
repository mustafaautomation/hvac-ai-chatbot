import { connection } from "next/server";
import { BRAND } from "@/lib/brand";
import { llmConfigured, llmLabel } from "@/lib/llm/live";

export async function GET() {
  await connection();
  return Response.json({
    ok: true,
    brand: BRAND.name,
    subdomain: BRAND.subdomain,
    model: llmConfigured(),
    modelName: llmLabel(),
    timezone: BRAND.timezone,
    mode: llmConfigured() ? "live-or-demo" : "demo",
  });
}
