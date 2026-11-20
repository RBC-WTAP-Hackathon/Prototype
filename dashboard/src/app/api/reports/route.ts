// Slack bot → POST /api/reports
// { slack_id | null, anonymous, category, description, urgency, name?, role? }
// Anonymous reports are stored with user_id = null — identity is never persisted.
import { NextResponse } from "next/server";
import { bad, checkBotSecret } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { resolveSlackUser } from "@/lib/ingest";
import type { Report } from "@/lib/types";

const CATEGORIES: Report["category"][] = ["Harassment", "Workload", "Team Conflict", "Other"];
const URGENCIES: Report["urgency"][] = ["Low", "Medium", "High"];

export async function POST(req: Request) {
  const denied = checkBotSecret(req);
  if (denied) return denied;
  const body = await req.json();
  if (!CATEGORIES.includes(body.category)) return bad("invalid category");
  if (!URGENCIES.includes(body.urgency)) return bad("invalid urgency");
  if (!body.description) return bad("description required");

  const store = getStore();
  const anonymous = Boolean(body.anonymous) || !body.slack_id;
  let user_id: string | null = null;
  if (!anonymous) {
    const user = await resolveSlackUser(body);
    if (!user) return bad("unknown slack_id");
    user_id = user.id;
  }
  const row = await store.insertReport({
    user_id,
    anonymous,
    category: body.category,
    description: String(body.description).slice(0, 4000),
    urgency: body.urgency,
    status: "Open",
    created_at: new Date().toISOString(),
  });
  return NextResponse.json(row, { status: 201 });
}

// Dashboard → PATCH /api/reports { id, status }
export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  if (!id || !["Open", "Reviewed"].includes(status)) return bad("id and status required");
  await getStore().updateReportStatus(id, status);
  return NextResponse.json({ ok: true });
}
