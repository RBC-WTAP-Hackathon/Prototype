// Slack bot → POST /api/self-id
// { slack_id, name?, role?, gender?, ethnicity? }
// Optional, voluntary self-identification. Stored on the user but only ever reported in
// aggregate (groups of MIN_DEMOGRAPHIC_GROUP+) — never shown per person or sent to the browser.
import { NextResponse } from "next/server";
import { bad, checkBotSecret } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { resolveSlackUser } from "@/lib/ingest";
import { ETHNICITY_OPTIONS, GENDER_OPTIONS, PREFER_NOT } from "@/lib/inclusion";

export async function POST(req: Request) {
  const denied = checkBotSecret(req);
  if (denied) return denied;
  const body = await req.json();
  if (!body.slack_id) return bad("slack_id required");

  const clean = (v: unknown, allowed: string[]) => {
    if (v === undefined || v === null || v === "") return PREFER_NOT;
    return allowed.includes(String(v)) ? String(v) : null;
  };
  const gender = clean(body.gender, GENDER_OPTIONS);
  const ethnicity = clean(body.ethnicity, ETHNICITY_OPTIONS);
  if (gender === null) return bad("invalid gender");
  if (ethnicity === null) return bad("invalid ethnicity");

  const user = await resolveSlackUser(body);
  if (!user) return bad("unknown slack_id");
  await getStore().updateUserSelfId(user.id, { gender, ethnicity });
  return NextResponse.json({ ok: true });
}
