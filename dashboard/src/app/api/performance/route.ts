// Manager rating → POST /api/performance
// { slack_id (intern), rating 1-5, week_number?, note?, reviewer? }
// Can be sent by the bot (e.g. a /rate-intern command for managers) or a dashboard form.
import { NextResponse } from "next/server";
import { bad, checkBotSecret } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const denied = checkBotSecret(req);
  if (denied) return denied;
  const body = await req.json();
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad("rating must be 1-5");

  const store = getStore();
  const user = await store.findUserBySlackId(body.slack_id);
  if (!user) return bad("unknown slack_id");
  const snap = await store.snapshot();
  const currentWeek = Math.max(1, ...snap.checkins.map((c) => c.week_number));

  const row = await store.insertReview({
    user_id: user.id,
    week_number: body.week_number ?? currentWeek,
    rating,
    note: body.note ?? null,
    reviewer: body.reviewer ?? null,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json(row, { status: 201 });
}
