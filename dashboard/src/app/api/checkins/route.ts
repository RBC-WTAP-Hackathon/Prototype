// Slack bot → POST /api/checkins
// { slack_id, week_number?, role_satisfaction, rbc_satisfaction, learning_growth, voice_valued, feedback_text,
//   topic?, name?, role?, department? }  — name registers interns the dashboard hasn't seen yet
import { NextResponse } from "next/server";
import { bad, checkBotSecret } from "@/lib/auth";
import { ingestCheckin } from "@/lib/ingest";

export async function POST(req: Request) {
  const denied = checkBotSecret(req);
  if (denied) return denied;
  try {
    const row = await ingestCheckin(await req.json());
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return bad((e as Error).message);
  }
}
