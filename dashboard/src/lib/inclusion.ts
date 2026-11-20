// Group-level inclusion insights: which departments / self-identified gender / ethnicity
// groups are scoring lower, declining, or carrying more risk than the rest of the cohort.
//
// Privacy rules (enforced here, not in the UI):
//  - Demographics are optional self-ID; "Prefer not to say" and blanks are never a group.
//  - Groups smaller than MIN_DEMOGRAPHIC_GROUP are suppressed entirely.
//  - Output is aggregate only; nothing per person leaves this module.
//  - Demographics never feed an individual's risk score.
import { DIMENSIONS, DIMENSION_META } from "./dimensions";
import type {
  DimensionKey,
  GroupStat,
  Grouping,
  GroupingKey,
  InclusionData,
  InclusionInsight,
  InternView,
  Report,
  Scores,
  User,
} from "./types";

export const MIN_DEMOGRAPHIC_GROUP = 5;
export const PREFER_NOT = "Prefer not to say";

export const GENDER_OPTIONS = ["Woman", "Man", "Non-binary", "Another gender", PREFER_NOT];
export const ETHNICITY_OPTIONS = [
  "Black",
  "East Asian",
  "Indigenous",
  "Latin American",
  "Middle Eastern / North African",
  "South Asian",
  "Southeast Asian",
  "White",
  "Multiple / mixed",
  "Another ethnicity",
  PREFER_NOT,
];

/** Flag thresholds (radar points are 0–100). */
const GAP_PTS = 10; // group scores this far below everyone else on a dimension
const DECLINE_PTS = 10; // group average fell this much over 3 weeks
const RISK_RATIO = 1.5; // group's at-risk share is this multiple of everyone else's…
const RISK_MIN_PCT = 30; // …and at least this high

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (v: number) => Math.round(v * 10) / 10;

function meanScores(group: InternView[]): Scores {
  return Object.fromEntries(DIMENSIONS.map((d) => [d, r1(mean(group.map((i) => i.radar[d])))])) as Scores;
}

function meanChange(group: InternView[]): Scores | null {
  const withPrev = group.filter((i) => i.radarPrev);
  if (withPrev.length < MIN_DEMOGRAPHIC_GROUP) return null;
  return Object.fromEntries(
    DIMENSIONS.map((d) => [d, r1(mean(withPrev.map((i) => i.radar[d] - i.radarPrev![d])))]),
  ) as Scores;
}

const atRiskPct = (group: InternView[]) =>
  group.length ? Math.round((100 * group.filter((i) => i.risk.level !== "Low").length) / group.length) : 0;

function groupBy(
  key: GroupingKey,
  interns: InternView[],
  usersById: Map<string, User>,
): Map<string, InternView[]> {
  const out = new Map<string, InternView[]>();
  for (const i of interns) {
    const u = usersById.get(i.user.id);
    const raw = key === "department" ? u?.department : key === "gender" ? u?.gender : u?.ethnicity;
    const v = raw?.trim();
    if (!v || v === PREFER_NOT) continue;
    out.set(v, [...(out.get(v) ?? []), i]);
  }
  return out;
}

export function buildInclusion(interns: InternView[], users: User[], reports: Report[]): InclusionData {
  const usersById = new Map(users.map((u) => [u.id, u]));
  const groupings: Grouping[] = [];
  const insights: InclusionInsight[] = [];

  const LABELS: Record<GroupingKey, string> = { department: "Department", gender: "Gender", ethnicity: "Ethnicity" };

  for (const key of ["department", "gender", "ethnicity"] as GroupingKey[]) {
    const grouped = groupBy(key, interns, usersById);
    const groups: GroupStat[] = [];
    let shown = 0;

    for (const [name, members] of grouped) {
      if (members.length < MIN_DEMOGRAPHIC_GROUP) continue;
      shown += members.length;
      const ids = new Set(members.map((m) => m.user.id));
      const rest = interns.filter((i) => !ids.has(i.user.id));
      const stat: GroupStat = {
        name,
        n: members.length,
        scores: meanScores(members),
        change: meanChange(members),
        atRiskPct: atRiskPct(members),
        avgRisk: Math.round(mean(members.map((m) => m.risk.score))),
        namedReports: reports.filter((r) => r.user_id && ids.has(r.user_id)).length,
      };
      groups.push(stat);
      if (!rest.length) continue;

      // Gap: biggest shortfall vs everyone else
      const restScores = meanScores(rest);
      let worst: { d: DimensionKey; gap: number } | null = null;
      for (const d of DIMENSIONS) {
        const gap = stat.scores[d] - restScores[d];
        if (gap <= -GAP_PTS && (!worst || gap < worst.gap)) worst = { d, gap };
      }
      if (worst) {
        insights.push({
          grouping: key, group: name, n: stat.n, kind: "gap", dimension: worst.d, value: Math.round(worst.gap),
          text: `${DIMENSION_META[worst.d].label} is ${Math.abs(Math.round(worst.gap))} pts lower than the rest of the cohort`,
        });
      }

      // Decline: steepest 3-week drop
      if (stat.change) {
        let drop: { d: DimensionKey; ch: number } | null = null;
        for (const d of DIMENSIONS) {
          const ch = stat.change[d];
          if (ch <= -DECLINE_PTS && (!drop || ch < drop.ch)) drop = { d, ch };
        }
        if (drop) {
          insights.push({
            grouping: key, group: name, n: stat.n, kind: "decline", dimension: drop.d, value: Math.round(drop.ch),
            text: `${DIMENSION_META[drop.d].label} fell ${Math.abs(Math.round(drop.ch))} pts over the last 3 weeks`,
          });
        }
      }

      // Risk concentration
      const restPct = atRiskPct(rest);
      if (stat.atRiskPct >= RISK_MIN_PCT && stat.atRiskPct >= RISK_RATIO * Math.max(restPct, 1)) {
        insights.push({
          grouping: key, group: name, n: stat.n, kind: "risk", dimension: null, value: stat.atRiskPct,
          text: `${stat.atRiskPct}% are at Watch or High risk, vs ${restPct}% of everyone else`,
        });
      }
    }

    groups.sort((a, b) => b.avgRisk - a.avgRisk);
    groupings.push({ key, label: LABELS[key], groups, hidden: interns.length - shown });
  }

  const severity = (i: InclusionInsight) => (i.kind === "risk" ? i.value / 3 : Math.abs(i.value));
  insights.sort((a, b) => severity(b) - severity(a));

  const selfId = users.filter((u) => [u.gender, u.ethnicity].some((v) => v && v !== PREFER_NOT)).length;
  return {
    minGroupSize: MIN_DEMOGRAPHIC_GROUP,
    selfIdPct: users.length ? Math.round((100 * selfId) / users.length) : 0,
    groupings,
    insights,
  };
}
