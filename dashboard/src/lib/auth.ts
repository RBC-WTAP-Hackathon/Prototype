import { NextResponse } from "next/server";

/** Bot → dashboard calls carry `x-bot-secret`. Skipped when BOT_SHARED_SECRET is unset (local dev). */
export function checkBotSecret(req: Request): NextResponse | null {
  const secret = process.env.BOT_SHARED_SECRET;
  if (!secret) return null;
  if (req.headers.get("x-bot-secret") === secret) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export const bad = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });
