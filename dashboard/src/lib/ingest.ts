import { analyzeCheckin } from "./llm";
import { getStore } from "./store";
import { CHECKIN_SCALE_MAX, SELF_DIMENSIONS, TOPICS } from "./dimensions";
import type { SelfDimension, User } from "./types";

const COHORT = "Summer 2026 Interns";

/** Profile the Slack bot sends so interns it hasn't seen before can be registered. */
export interface SlackProfile {
  slack_id?: string;
  name?: string;
  role?: string | null;
  department?: string | null;
}

/**
 * Find the intern by Slack ID, registering them on first contact when the bot sent a name.
 * Without a name an unknown Slack ID is rejected, as before.
 */
export async function resolveSlackUser(body: SlackProfile): Promise<User | null> {
  if (!body.slack_id) return null;
  const store = getStore();
  const existing = await store.findUserBySlackId(body.slack_id);
  if (existing || !body.name?.trim()) return existing;
  return store.insertUser({
    slack_id: body.slack_id,
    name: body.name.trim().slice(0, 120),
    role: body.role?.trim() || "Intern",
    department: body.department?.trim() || "Unassigned",
    cohort: COHORT,
    manager_name: "",
  });
}

export interface CheckinBody extends SlackProfile {
  /** Topic the intern picked in Slack (e.g. "Mentorship"); added to the check-in's tags. */
  topic?: string | null;
  user_id?: string;
  week_number?: number;
  feedback_text?: string;
  role_satisfaction?: number;
  rbc_satisfaction?: number;
  learning_growth?: number;
  voice_valued?: number;
  participation?: number;
}

/** Validate → resolve user → LLM enrich → insert. Shared by the bot endpoint and the demo simulator. */
export async function ingestCheckin(body: CheckinBody) {
  const store = getStore();
  for (const d of SELF_DIMENSIONS) {
    const v = Number(body[d]);
    if (!Number.isInteger(v) || v < 1 || v > CHECKIN_SCALE_MAX)
      throw new Error(`${d} must be an integer 1-${CHECKIN_SCALE_MAX}`);
  }
  const snap = await store.snapshot();
  const user = body.slack_id
    ? await resolveSlackUser(body)
    : snap.users.find((u) => u.id === body.user_id) ?? null;
  if (!user) throw new Error("unknown user (slack_id or user_id)");

  const ratings = Object.fromEntries(SELF_DIMENSIONS.map((d) => [d, Number(body[d])])) as Record<
    SelfDimension,
    number
  >;
  const currentWeek = Math.max(1, ...snap.checkins.map((c) => c.week_number));
  const feedback_text = (body.feedback_text ?? "").slice(0, 2000);
  const analysis = await analyzeCheckin({ feedback_text, ...ratings });
  const topic = body.topic?.trim();
  if (topic && (TOPICS as readonly string[]).includes(topic) && !analysis.tags.includes(topic)) analysis.tags = [topic, ...analysis.tags];

  return store.insertCheckin({
    user_id: user.id,
    week_number: body.week_number ?? currentWeek,
    ...ratings,
    feedback_text,
    ...analysis,
    submitted_at: new Date().toISOString(),
  });
}
