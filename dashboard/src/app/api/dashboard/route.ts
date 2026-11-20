import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { buildDashboard } from "@/lib/scoring";
import { llmProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  const data = buildDashboard(await store.snapshot(), { source: store.kind, llm: llmProvider() });
  return NextResponse.json(data);
}
