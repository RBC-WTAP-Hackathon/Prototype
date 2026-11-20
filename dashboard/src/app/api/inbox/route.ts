// Slack bot → POST /api/inbox
// { kind: "feedback" | "intro", slack_id?, anonymous?, topic, text?, name?, role? }
// Anonymous feedback is stored with user_id = null — identity is never persisted.
import { NextResponse } from "next/server";
import { bad, checkBotSecret } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { resolveSlackUser } from "@/lib/ingest";
import type { InboxItem } from "@/lib/types";

const KINDS: InboxItem["kind"][] = ["feedback", "intro"];

export async function POST(req: Request) {
  const denied = checkBotSecret(req);
  if (denied) return denied;
  const body = await req.json();
  if (!KINDS.includes(body.kind)) return bad("kind must be feedback or intro");
  const topic = String(body.topic ?? "").trim();
  if (!topic) return bad("topic required");

  // Intro requests always need a name so HR can follow up; feedback may be anonymous.
  const anonymous = body.kind === "feedback" && (Boolean(body.anonymous) || !body.slack_id);
  let user_id: string | null = null;
  if (!anonymous) {
    const user = await resolveSlackUser(body);
    if (!user) return bad("unknown slack_id");
    user_id = user.id;
  }

  const row = await getStore().insertInboxItem({
    kind: body.kind,
    user_id,
    anonymous,
    topic: topic.slice(0, 300),
    text: String(body.text ?? "").slice(0, 4000),
    status: "New",
    created_at: new Date().toISOString(),
  });
  return NextResponse.json(row, { status: 201 });
}

// Dashboard → PATCH /api/inbox { id, status }
export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  if (!id || !["New", "Done"].includes(status)) return bad("id and status required");
  await getStore().updateInboxStatus(id, status);
  return NextResponse.json({ ok: true });
}
