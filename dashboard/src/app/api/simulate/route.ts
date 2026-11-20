// Demo backup: the dashboard's "Simulate check-in" button posts here (same pipeline as the bot).
// Disable in any real deployment with ENABLE_SIMULATE=false.
import { NextResponse } from "next/server";
import { bad } from "@/lib/auth";
import { ingestCheckin } from "@/lib/ingest";

export async function POST(req: Request) {
  if (process.env.ENABLE_SIMULATE === "false") return bad("simulate disabled");
  try {
    return NextResponse.json(await ingestCheckin(await req.json()), { status: 201 });
  } catch (e) {
    return bad((e as Error).message);
  }
}
