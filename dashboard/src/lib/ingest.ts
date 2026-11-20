import { analyzeCheckin } from "./llm";
import { getStore } from "./store";
import { SELF_DIMENSIONS } from "./dimensions";
import type { SelfDimension } from "./types";

export interface CheckinBody {
  slack_id?: string;
  user_id?: string;
  week_number?: number;
  feedback_text?: string;
  role_satisfaction?: number;
  rbc_satisfaction?: number;
  learning_growth?: number;
  voice_valued?: number;
}

/** Validate → resolve user → LLM enrich → insert. Shared by the bot endpoint and the demo simulator. */
export async function ingestCheckin(body: CheckinBody) {
  const store = getStore();
  for (const d of SELF_DIMENSIONS) {
    const v = Number(body[d]);
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new Error(`${d} must be an integer 1-5`);
  }
  const snap = await store.snapshot();
  const user = body.slack_id
    ? await store.findUserBySlackId(body.slack_id)
    : snap.users.find((u) => u.id === body.user_id) ?? null;
  if (!user) throw new Error("unknown user (slack_id or user_id)");

  const ratings = Object.fromEntries(SELF_DIMENSIONS.map((d) => [d, Number(body[d])])) as Record<
    SelfDimension,
    number
  >;
  const currentWeek = Math.max(1, ...snap.checkins.map((c) => c.week_number));
  const feedback_text = (body.feedback_text ?? "").slice(0, 2000);
  const analysis = await analyzeCheckin({ feedback_text, ...ratings });

  return store.insertCheckin({
    user_id: user.id,
    week_number: body.week_number ?? currentWeek,
    ...ratings,
    feedback_text,
    ...analysis,
    submitted_at: new Date().toISOString(),
  });
}
