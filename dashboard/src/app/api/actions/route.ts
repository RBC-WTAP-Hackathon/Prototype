// Dashboard → POST /api/actions { user_id, type: "one_on_one", note? }
import { NextResponse } from "next/server";
import { bad } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const { user_id, type, note } = await req.json();
  if (!user_id || !["nudge", "one_on_one"].includes(type)) return bad("user_id and valid type required");
  const row = await getStore().insertAction({
    user_id,
    type,
    note: note ?? null,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json(row, { status: 201 });
}
