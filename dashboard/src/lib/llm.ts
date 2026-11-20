// One LLM call per check-in: sentiment, topic tags, 1-sentence summary, leave signal,
// and per-dimension evidence quotes. Falls back to a keyword heuristic with no API key,
// so the demo never breaks on stage.
import type { DimensionKey, SelfDimension, SentimentLabel } from "./types";
import { TOPICS } from "./dimensions";
import { sentimentLabel } from "./scoring";

export interface Analysis {
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  tags: string[];
  summary: string;
  leave_signal: boolean;
  evidence: Partial<Record<DimensionKey, string>>;
}

export interface CheckinInput {
  feedback_text: string;
  role_satisfaction: number;
  rbc_satisfaction: number;
  learning_growth: number;
  voice_valued: number;
  participation: number;
}

const PROMPT = (c: CheckinInput) => `You analyse weekly check-ins from bank interns for an HR early-intervention tool.
Ratings (1-10, 10 = best): role_satisfaction=${c.role_satisfaction}, rbc_satisfaction=${c.rbc_satisfaction}, learning_growth=${c.learning_growth}, voice_valued=${c.voice_valued}, participation_in_rbc_events=${c.participation}.
Feedback: """${c.feedback_text}"""

Return JSON only:
{
 "sentiment_score": number from -1 to 1,
 "tags": array, subset of ${JSON.stringify(TOPICS)},
 "summary": one neutral sentence (max 15 words) an HR partner can act on,
 "leave_signal": true if they mention leaving, other offers, recruiters, not returning, or burnout,
 "evidence": object mapping any of ["role_satisfaction","rbc_satisfaction","learning_growth","voice_valued"] to a short verbatim quote from the feedback that supports it (omit if none)
}`;

export function llmProvider(): string {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "heuristic";
}

export async function analyzeCheckin(c: CheckinInput): Promise<Analysis> {
  try {
    const provider = llmProvider();
    if (provider === "openai") return normalize(await openai(c));
    if (provider === "gemini") return normalize(await gemini(c));
  } catch (err) {
    console.error("[llm] falling back to heuristic:", err);
  }
  return heuristic(c);
}

async function openai(c: CheckinInput) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: PROMPT(c) }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return JSON.parse(json.choices[0].message.content);
}

async function gemini(c: CheckinInput) {
  const model = process.env.LLM_MODEL ?? "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT(c) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return JSON.parse(json.candidates[0].content.parts[0].text);
}

function normalize(raw: Partial<Analysis>): Analysis {
  const score = Math.max(-1, Math.min(1, Number(raw.sentiment_score ?? 0)));
  return {
    sentiment_score: Math.round(score * 100) / 100,
    sentiment_label: sentimentLabel(score),
    tags: (raw.tags ?? []).filter((t) => (TOPICS as readonly string[]).includes(t)),
    summary: String(raw.summary ?? "").slice(0, 200),
    leave_signal: Boolean(raw.leave_signal),
    evidence: raw.evidence ?? {},
  };
}

const KEYWORDS: Record<string, RegExp> = {
  Mentorship: /mentor|1:1|one.on.one|coach/i,
  Onboarding: /onboard|laptop|access|setup|ramp/i,
  "Team Dynamics": /team|standup|meeting|colleague|manager/i,
  "Career Dev": /career|return offer|full.time|future|learn/i,
  Workload: /deadline|late|hours|overload|busy|stress|drained|burn/i,
  Recognition: /recogni|thank|credit|ignored|skipped|heard|valued/i,
};
const LEAVE = /other (offer|option|bank|compan)|recruit|not (sure|planning).{0,20}(return|stay|fit)|leav|quit|burn.?out/i;
const NEG = /stress|drain|stuck|ignored|skipped|tired|overwhelm|frustrat|not sure|thankless|burn/i;
const POS = /great|love|excit|inspir|learned|happy|awesome|good/i;

function heuristic(c: CheckinInput): Analysis {
  const text = c.feedback_text ?? "";
  const avg = (c.role_satisfaction + c.rbc_satisfaction + c.learning_growth + c.voice_valued) / 4;
  let score = (avg - 5.5) / 4.5; // 1–10 scale → −1..1
  if (NEG.test(text)) score -= 0.25;
  if (POS.test(text)) score += 0.15;
  score = Math.max(-1, Math.min(1, score));
  const tags = Object.entries(KEYWORDS)
    .filter(([, re]) => re.test(text))
    .map(([t]) => t);
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const leave = LEAVE.test(text);

  // Evidence: the sentence that best matches each low-rated dimension
  const evidence: Partial<Record<DimensionKey, string>> = {};
  for (const [dim, re] of Object.entries(DIM_CUES) as [keyof typeof DIM_CUES, RegExp][]) {
    const hit = sentences.find((s) => re.test(s));
    if (hit && c[dim] <= 6) evidence[dim] = hit;
  }

  // Summary: stitch detected signals into one HR-readable sentence
  const signals = SIGNALS.filter(([re]) => re.test(text)).map(([, phrase]) => phrase);
  if (leave && !signals.includes(LEAVE_PHRASE)) signals.push(LEAVE_PHRASE);
  const summary = signals.length
    ? cap(signals.slice(0, 3).join(", ")) + "."
    : sentences[0] ?? "No written feedback.";

  return {
    sentiment_score: Math.round(score * 100) / 100,
    sentiment_label: sentimentLabel(score),
    tags: tags.length ? tags : ["Team Dynamics"],
    summary: summary.length > 120 ? summary.slice(0, 117) + "…" : summary,
    leave_signal: leave,
    evidence,
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const LEAVE_PHRASE = "considering opportunities elsewhere";
const SIGNALS: [RegExp, string][] = [
  [/late|hours|overload|drained|burn|exhaust/i, "strained by workload and long hours"],
  [/ignored|skipped|brushed off|dismiss|not heard|talked over/i, "ideas not being heard"],
  [/stuck|not learning|same task|repetitive|bored/i, "feels growth has stalled"],
  [/mentor/i, "wants more mentor time"],
  [/recruit|other (offer|bank|compan)|tempted/i, LEAVE_PHRASE],
  [/great|love|excit|inspir|shipped/i, "energised by recent work"],
];
const DIM_CUES: Record<SelfDimension, RegExp> = {
  participation: /event|social|erg|town hall|info session|volunteer|networking|club|lunch and learn/i,
  role_satisfaction: /late|hours|workload|task|project|drained|rough/i,
  rbc_satisfaction: /rbc|bank|recruit|offer|return|culture/i,
  learning_growth: /learn|grow|mentor|stuck|skill/i,
  voice_valued: /idea|opinion|input|heard|ignored|skipped|brushed|dismiss/i,
};
