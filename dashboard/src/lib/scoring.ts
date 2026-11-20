// Turns raw rows into radar scores, risk-of-leaving, and cohort aggregates.
// Every number here is explainable in one sentence — judges will ask.
import type {
  Checkin,
  DashboardData,
  DimensionKey,
  InternView,
  PerformanceReview,
  RiskLevel,
  Scores,
  SelfDimension,
  SentimentLabel,
  Snapshot,
  StatusAlert,
} from "./types";
import { CHECKIN_SCALE_MAX, DIMENSIONS, DIMENSION_META, SELF_DIMENSIONS } from "./dimensions";
import { buildInclusion } from "./inclusion";

/** Departments smaller than this are hidden from the heatmap to protect anonymity. */
export const MIN_GROUP_SIZE = 3;
/** Risk-score rise (0–100 scale) since last week that counts as a significant drop in status. */
export const ALERT_SCORE_JUMP = 10;
const RECENCY_WEIGHTS = [0.5, 0.3, 0.2]; // most recent first

export function sentimentLabel(score: number): SentimentLabel {
  if (score >= 0.25) return "Positive";
  if (score <= -0.15) return "At-Risk";
  return "Neutral";
}

/** Maps a 1..max rating onto the radar's 0–100 scale. */
const to100 = (rating: number, max: number) => ((rating - 1) / (max - 1)) * 100;
const PERFORMANCE_SCALE_MAX = 5;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round = (v: number) => Math.round(v);

function weighted(raw: (number | null | undefined)[]): number | null {
  // values: most recent first; skips answers missing from older check-ins
  const values = raw.filter((v): v is number => typeof v === "number");
  if (!values.length) return null;
  let sum = 0;
  let w = 0;
  values.slice(0, RECENCY_WEIGHTS.length).forEach((v, i) => {
    sum += v * RECENCY_WEIGHTS[i];
    w += RECENCY_WEIGHTS[i];
  });
  return sum / w;
}

/** Keep only the latest check-in per week (a re-submission replaces the earlier one). */
function latestPerWeek(checkins: Checkin[]): Checkin[] {
  const byWeek = new Map<number, Checkin>();
  for (const c of checkins) {
    const prev = byWeek.get(c.week_number);
    if (!prev || prev.submitted_at < c.submitted_at) byWeek.set(c.week_number, c);
  }
  return [...byWeek.values()].sort((a, b) => b.week_number - a.week_number);
}

function participationScore(weeks: Set<number>, asOf: number): number {
  if (asOf <= 0) return 0;
  let total = 0;
  for (let w = 1; w <= asOf; w++) if (weeks.has(w)) total++;
  let recent = 0;
  const span = Math.min(3, asOf);
  for (let w = asOf - span + 1; w <= asOf; w++) if (weeks.has(w)) recent++;
  // 40% overall rate, 60% last three weeks — recent drop-off matters most
  return 100 * (0.4 * (total / asOf) + 0.6 * (recent / span));
}

function streak(weeks: Set<number>, asOf: number): number {
  // Current week not submitted yet doesn't break the streak.
  let w = weeks.has(asOf) ? asOf : asOf - 1;
  let n = 0;
  while (w >= 1 && weeks.has(w)) {
    n++;
    w--;
  }
  return n;
}

/** Radar scores using only data up to and including `asOf` week. */
export function radarAt(
  checkins: Checkin[],
  reviews: PerformanceReview[],
  asOf: number,
): Scores | null {
  const cs = latestPerWeek(checkins.filter((c) => c.week_number <= asOf));
  if (!cs.length) return null;
  const scores = {} as Scores;
  for (const d of SELF_DIMENSIONS) {
    const w = weighted(cs.map((c) => c[d]));
    scores[d] = w === null ? 50 : round(to100(w, CHECKIN_SCALE_MAX));
  }
  const rv = reviews
    .filter((r) => r.week_number <= asOf)
    .sort((a, b) => b.week_number - a.week_number || b.created_at.localeCompare(a.created_at));
  scores.performance = rv.length ? round(to100(weighted(rv.map((r) => r.rating))!, PERFORMANCE_SCALE_MAX)) : 50;
  return scores;
}

function risk(
  now: Scores,
  prev: Scores | null,
  recent: Checkin[],
  checkinRate: number, // 0–100: how reliably they submit check-ins
): InternView["risk"] {
  const sat = (now.role_satisfaction + now.rbc_satisfaction) / 2;
  const satPrev = prev ? (prev.role_satisfaction + prev.rbc_satisfaction) / 2 : sat;
  const satDrop = satPrev - sat;
  const leave = recent.slice(0, 2).some((c) => c.leave_signal);

  const parts = {
    satisfaction: clamp01(0.6 * ((100 - sat) / 100) + 0.4 * clamp01(satDrop / 40)),
    voice: (100 - now.voice_valued) / 100,
    // low event participation and skipped check-ins are both disengagement signals
    participation: (100 - (now.participation + checkinRate) / 2) / 100,
    leave: leave ? 1 : 0,
  };
  const score = round(
    100 * (0.35 * parts.satisfaction + 0.25 * parts.voice + 0.25 * parts.participation + 0.15 * parts.leave),
  );

  const reasons: string[] = [];
  if (satDrop >= 15) reasons.push(`Satisfaction ↓ ${round(satDrop)} pts in 3 weeks`);
  else if (sat < 50) reasons.push("Low satisfaction");
  if (now.voice_valued < 50) reasons.push("Doesn't feel their ideas are valued");
  if (now.participation < 50) reasons.push("Not taking part in RBC events");
  if (checkinRate < 60) reasons.push("Missing check-ins");
  if (leave) reasons.push("Mentioned leaving / other offers");

  const level: RiskLevel = score >= 45 ? "High" : score >= 22 ? "Watch" : "Low";
  return { score, level, reasons };
}

export function buildDashboard(
  snap: Snapshot,
  meta: { source: DashboardData["source"]; llm: string },
): DashboardData {
  const currentWeek = Math.max(1, ...snap.checkins.map((c) => c.week_number));

  const interns: InternView[] = snap.users.map((user) => {
    const all = snap.checkins.filter((c) => c.user_id === user.id);
    const reviews = snap.reviews.filter((r) => r.user_id === user.id);
    const cs = latestPerWeek(all);
    const weeks = new Set(cs.map((c) => c.week_number));
    const radar =
      radarAt(all, reviews, currentWeek) ??
      ({ ...Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) } as Scores);
    const radarPrev = currentWeek > 3 ? radarAt(all, reviews, currentWeek - 3) : null;
    const r = risk(radar, radarPrev, cs, participationScore(weeks, currentWeek));
    // Same calculation as of last week's summary, to detect week-over-week drops
    const lastWeek = currentWeek - 1;
    const radarLast = lastWeek >= 1 ? radarAt(all, reviews, lastWeek) : null;
    const rPrev = radarLast
      ? risk(
          radarLast,
          lastWeek > 3 ? radarAt(all, reviews, lastWeek - 3) : null,
          cs.filter((c) => c.week_number <= lastWeek),
          participationScore(weeks, lastWeek),
        )
      : null;
    const lowest = DIMENSIONS.reduce((lo, d) => (radar[d] < radar[lo] ? d : lo), DIMENSIONS[0]);

    const evidence: InternView["evidence"] = {};
    for (const c of cs) for (const [k, v] of Object.entries(c.evidence ?? {})) {
      if (!evidence[k as DimensionKey] && v) evidence[k as DimensionKey] = v;
    }

    const { gender: _g, ethnicity: _e, ...publicUser } = user; // self-ID stays server-side
    return {
      user: publicUser,
      radar,
      radarPrev,
      risk: r,
      riskPrev: rPrev ? { score: rPrev.score, level: rPrev.level } : null,
      topTalentAtRisk: radar.performance >= 75 && r.level !== "Low",
      lowest,
      streak: streak(weeks, currentWeek),
      lastCheckinWeek: cs[0]?.week_number ?? null,
      submittedThisWeek: weeks.has(currentWeek),
      weekly: Array.from({ length: currentWeek }, (_, i) => {
        const c = cs.find((x) => x.week_number === i + 1);
        return { week: i + 1, sentiment: c ? c.sentiment_score : null };
      }),
      checkins: [...all].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)),
      latestSummary: cs[0]?.summary ?? null,
      evidence,
      actions: snap.actions
        .filter((a) => a.user_id === user.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  });

  interns.sort((a, b) => b.risk.score - a.risk.score);

  // Cohort sentiment by week (latest per user per week)
  const perWeek = new Map<number, number[]>();
  for (const i of interns) for (const c of latestPerWeek(i.checkins)) {
    perWeek.set(c.week_number, [...(perWeek.get(c.week_number) ?? []), c.sentiment_score]);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const trend = [...perWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, xs]) => ({ week, sentiment: Math.round(avg(xs) * 100) / 100 }));

  const n = snap.users.length || 1;
  const submittedIn = (w: number) =>
    new Set(snap.checkins.filter((c) => c.week_number === w).map((c) => c.user_id)).size;

  // Topic volume over the last 4 weeks
  const topicCounts = new Map<string, number>();
  for (const c of snap.checkins.filter((c) => c.week_number > currentWeek - 4)) {
    for (const t of c.tags) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  }

  const meanScores = (group: InternView[]): Scores =>
    Object.fromEntries(
      DIMENSIONS.map((d) => [d, round(avg(group.map((i) => i.radar[d])))]),
    ) as Scores;

  const departments = [...new Set(snap.users.map((u) => u.department))].sort();
  const heatmap = departments.map((department) => {
    const group = interns.filter((i) => i.user.department === department);
    return {
      department,
      n: group.length,
      scores: group.length >= MIN_GROUP_SIZE ? meanScores(group) : null,
    };
  });

  const thisWeek = trend.find((t) => t.week === currentWeek)?.sentiment ?? 0;
  const lastWeek = trend.find((t) => t.week === currentWeek - 1)?.sentiment ?? thisWeek;
  const openReports = snap.reports.filter((r) => r.status === "Open");

  // Significant drop since last weekly summary: risk level got worse, or score jumped ≥ ALERT_SCORE_JUMP
  const LEVEL_RANK: Record<RiskLevel, number> = { Low: 0, Watch: 1, High: 2 };
  const alerts: StatusAlert[] = interns
    .filter(
      (i) =>
        i.riskPrev &&
        (LEVEL_RANK[i.risk.level] > LEVEL_RANK[i.riskPrev.level] ||
          i.risk.score - i.riskPrev.score >= ALERT_SCORE_JUMP),
    )
    .map((i) => ({
      id: `${i.user.id}:w${currentWeek}`,
      userId: i.user.id,
      name: i.user.name,
      department: i.user.department,
      fromLevel: i.riskPrev!.level,
      toLevel: i.risk.level,
      fromScore: i.riskPrev!.score,
      toScore: i.risk.score,
      reasons: i.risk.reasons,
    }))
    .sort((a, b) => b.toScore - b.fromScore - (a.toScore - a.fromScore));

  return {
    currentWeek,
    kpis: {
      avgSentiment: thisWeek,
      avgSentimentDelta: Math.round((thisWeek - lastWeek) * 100) / 100,
      participationPct: round((submittedIn(currentWeek) / n) * 100),
      participationDelta: round(((submittedIn(currentWeek) - submittedIn(currentWeek - 1)) / n) * 100),
      highRisk: interns.filter((i) => i.risk.level === "High").length,
      topTalentAtRisk: interns.filter((i) => i.topTalentAtRisk).length,
      openReports: openReports.length,
      urgentReports: openReports.filter((r) => r.urgency === "High").length,
    },
    trend,
    topics: [...topicCounts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count),
    cohortRadar: meanScores(interns),
    heatmap,
    interns,
    alerts,
    inclusion: buildInclusion(interns, snap.users, snap.reports),
    reports: [...snap.reports].sort(
      (a, b) =>
        Number(a.status === "Reviewed") - Number(b.status === "Reviewed") ||
        b.created_at.localeCompare(a.created_at),
    ),
    source: meta.source,
    llm: meta.llm,
  };
}

export { DIMENSION_META };
export type { SelfDimension };
