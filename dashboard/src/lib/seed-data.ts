// Deterministic demo dataset: 24 fictional interns × 8 weeks.
// Replace with an import of real participation/feedback data when available (see scripts/seed.ts).
import { PREFER_NOT } from "./inclusion";
import type {
  Checkin,
  DimensionKey,
  PerformanceReview,
  Report,
  SelfDimension,
  Snapshot,
  User,
} from "./types";
import { sentimentLabel } from "./scoring";

export const SEED_WEEKS = 8;
const COHORT = "Summer 2026 Interns";
const COHORT_START = Date.UTC(2026, 4, 4); // Mon 4 May 2026

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Archetype =
  | "thriving"
  | "steady"
  | "unheard"
  | "stalled"
  | "overloaded"
  | "disengaging"
  | "star_at_risk";

interface ArchetypeSpec {
  base: Record<SelfDimension, number>;
  /** per-week drift applied after `from` week */
  drift: Partial<Record<SelfDimension, number>>;
  from: number;
  perf: number;
  perfDrift?: number;
  miss: (week: number) => number; // probability of skipping a check-in
  leaveFrom?: number;
}

const SPECS: Record<Archetype, ArchetypeSpec> = {
  thriving: {
    base: { role_satisfaction: 4.5, rbc_satisfaction: 4.6, learning_growth: 4.5, voice_valued: 4.3, participation: 4.3 },
    drift: {}, from: 0, perf: 4.3, miss: () => 0.03,
  },
  steady: {
    base: { role_satisfaction: 3.8, rbc_satisfaction: 4.0, learning_growth: 3.8, voice_valued: 3.6, participation: 3.5 },
    drift: {}, from: 0, perf: 3.6, miss: () => 0.08,
  },
  unheard: {
    base: { role_satisfaction: 3.9, rbc_satisfaction: 4.1, learning_growth: 3.8, voice_valued: 3.7, participation: 3.6 },
    drift: { voice_valued: -0.3, role_satisfaction: -0.08, participation: -0.1 }, from: 3, perf: 3.9, miss: () => 0.1,
  },
  stalled: {
    base: { role_satisfaction: 3.6, rbc_satisfaction: 4.0, learning_growth: 3.4, voice_valued: 3.5, participation: 3.3 },
    drift: { learning_growth: -0.25, role_satisfaction: -0.1 }, from: 3, perf: 3.4, miss: () => 0.12,
  },
  overloaded: {
    base: { role_satisfaction: 4.0, rbc_satisfaction: 4.2, learning_growth: 4.2, voice_valued: 3.8, participation: 3.8 },
    drift: { role_satisfaction: -0.28, participation: -0.3 }, from: 4, perf: 4.0, miss: (w) => (w > 5 ? 0.3 : 0.05),
  },
  disengaging: {
    base: { role_satisfaction: 3.7, rbc_satisfaction: 3.8, learning_growth: 3.6, voice_valued: 3.4, participation: 3.4 },
    drift: { role_satisfaction: -0.25, rbc_satisfaction: -0.25, learning_growth: -0.2, voice_valued: -0.2, participation: -0.3 },
    from: 4, perf: 3.3, perfDrift: -0.15, miss: (w) => (w > 5 ? 0.55 : 0.1), leaveFrom: 6,
  },
  star_at_risk: {
    base: { role_satisfaction: 4.4, rbc_satisfaction: 4.4, learning_growth: 4.3, voice_valued: 4.0, participation: 4.2 },
    drift: { role_satisfaction: -0.3, rbc_satisfaction: -0.25, voice_valued: -0.3, participation: -0.25 },
    from: 4, perf: 4.8, miss: () => 0.04, leaveFrom: 7,
  },
};

const PEOPLE: [string, string, string, Archetype][] = [
  // name, department, role, archetype
  ["Maya Okafor", "Capital Markets", "Analyst Intern", "star_at_risk"],
  ["Lucas Tremblay", "Capital Markets", "Analyst Intern", "thriving"],
  ["Aisha Rahman", "Capital Markets", "Quant Intern", "steady"],
  ["Ethan Nguyen", "Capital Markets", "Analyst Intern", "overloaded"],
  ["Sofia Rossi", "Capital Markets", "Sales & Trading Intern", "steady"],
  ["Daniel Kim", "Capital Markets", "Analyst Intern", "thriving"],
  ["Priya Desai", "Technology & Operations", "Software Engineer Intern", "thriving"],
  ["Noah Bergeron", "Technology & Operations", "Data Engineer Intern", "unheard"],
  ["Chloe Martin", "Technology & Operations", "Software Engineer Intern", "steady"],
  ["Omar Haddad", "Technology & Operations", "Cloud Intern", "disengaging"],
  ["Grace Liu", "Technology & Operations", "Software Engineer Intern", "steady"],
  ["Jonah Fraser", "Technology & Operations", "Security Intern", "thriving"],
  ["Emma Gagnon", "Personal & Commercial Banking", "Product Intern", "steady"],
  ["Samuel Adeyemi", "Personal & Commercial Banking", "Analyst Intern", "stalled"],
  ["Hannah Cohen", "Personal & Commercial Banking", "UX Intern", "thriving"],
  ["Mateo Silva", "Personal & Commercial Banking", "Analyst Intern", "steady"],
  ["Zara Ali", "Personal & Commercial Banking", "Product Intern", "unheard"],
  ["Liam O'Connor", "Personal & Commercial Banking", "Analyst Intern", "steady"],
  ["Ava Singh", "Wealth Management", "Advisory Intern", "thriving"],
  ["Benjamin Roy", "Wealth Management", "Analyst Intern", "disengaging"],
  ["Mia Johnson", "Wealth Management", "Portfolio Intern", "steady"],
  ["Ryan Chen", "Wealth Management", "Analyst Intern", "stalled"],
  ["Isabelle Lavoie", "Wealth Management", "Advisory Intern", "overloaded"],
  ["Kofi Mensah", "Wealth Management", "Analyst Intern", "steady"],
];

const MANAGERS: Record<string, string> = {
  "Capital Markets": "Jordan Ellis",
  "Technology & Operations": "Taylor Brooks",
  "Personal & Commercial Banking": "Morgan Patel",
  "Wealth Management": "Casey Wong",
};

interface Line {
  text: string;
  summary: string;
  tags: string[];
  dim?: DimensionKey;
  leave?: boolean;
}

const GOOD: Line[] = [
  { text: "Great week — shipped my first feature and my mentor walked me through the code review.", summary: "Energised by shipping work and strong mentor support.", tags: ["Mentorship"] },
  { text: "Loving the team. Got to sit in on a client meeting and learned a ton.", summary: "Enjoying team and new learning exposure.", tags: ["Career Dev", "Team Dynamics"] },
  { text: "My manager asked for my take on the roadmap and actually used it.", summary: "Feels heard — idea adopted by manager.", tags: ["Recognition"], dim: "voice_valued" },
  { text: "Coffee chat with a VP this week was super inspiring. Feeling good about RBC.", summary: "Positive about RBC after leadership exposure.", tags: ["Career Dev"], dim: "rbc_satisfaction" },
];
const OK: Line[] = [
  { text: "Pretty normal week. Still ramping up on the internal tools.", summary: "Steady week, still ramping on tooling.", tags: ["Onboarding"] },
  { text: "Work is fine. Would like a bit more structure on what's expected by end of term.", summary: "Content but wants clearer expectations.", tags: ["Career Dev"] },
  { text: "Okay week, mentor was out so I mostly worked solo.", summary: "Neutral; limited mentor access this week.", tags: ["Mentorship"] },
];
const BAD: Record<Archetype, Line[]> = {
  thriving: OK, steady: OK,
  unheard: [
    { text: "I raised an idea in standup twice and it got skipped both times.", summary: "Ideas being overlooked in team meetings.", tags: ["Team Dynamics", "Recognition"], dim: "voice_valued" },
    { text: "Feels like decisions are made before I'm in the room. Not sure my input matters.", summary: "Feels excluded from decisions.", tags: ["Team Dynamics"], dim: "voice_valued" },
  ],
  stalled: [
    { text: "Doing the same reconciliation task every day. Not really learning anything new.", summary: "Repetitive work, little learning.", tags: ["Career Dev"], dim: "learning_growth" },
    { text: "Haven't had a mentor 1:1 in three weeks. Feeling a bit stuck.", summary: "Needs more mentor time to grow.", tags: ["Mentorship"], dim: "learning_growth" },
  ],
  overloaded: [
    { text: "Working until 9pm most nights to hit the deadline. Pretty drained.", summary: "Long hours, signs of burnout.", tags: ["Workload"], dim: "role_satisfaction" },
    { text: "Too many parallel asks and no clear priority. Stressful week.", summary: "Overloaded with unclear priorities.", tags: ["Workload"], dim: "role_satisfaction" },
  ],
  disengaging: [
    { text: "Not much to say. Kind of just getting through the days.", summary: "Low energy, disengaging.", tags: ["Team Dynamics"], dim: "role_satisfaction" },
    { text: "Honestly not sure this is the right fit. Looking at other options for next summer.", summary: "Questioning fit; exploring other offers.", tags: ["Career Dev"], dim: "rbc_satisfaction", leave: true },
  ],
  star_at_risk: [
    { text: "Delivering a lot but nobody's mentioned a return offer. Feels a bit thankless.", summary: "High output, feels unrecognised.", tags: ["Recognition"], dim: "voice_valued" },
    { text: "Had a recruiter from another bank reach out. Tempted, if I'm honest.", summary: "Being recruited externally and tempted.", tags: ["Career Dev", "Recognition"], dim: "rbc_satisfaction", leave: true },
  ],
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const SEED_GENDERS = ["Woman", "Man", "Woman", "Man", "Non-binary", PREFER_NOT];
const SEED_ETHNICITIES = ["East Asian", "South Asian", "White", "Black", "South Asian", "East Asian", "White", PREFER_NOT];

export function generateSeed(): Snapshot {
  const rand = mulberry32(2026);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const users: User[] = [];
  const checkins: Checkin[] = [];
  // Synthetic, randomly assigned self-ID for the demo (separate RNG so ratings don't shift).
  // ~15% leave it blank or prefer not to say, like a real voluntary survey.
  const idRand = mulberry32(4242);
  const idPick = (opts: string[]) => opts[Math.floor(idRand() * (opts.length - 1))]; // last is "Prefer not to say"
  const reviews: PerformanceReview[] = [];

  PEOPLE.forEach(([name, department, role, arch], i) => {
    const id = `u${String(i + 1).padStart(2, "0")}`;
    users.push({
      id,
      slack_id: `U0DEMO${String(i + 1).padStart(3, "0")}`,
      name,
      role,
      department,
      cohort: COHORT,
      manager_name: MANAGERS[department],
      // ~20% skip self-ID entirely; the rest answer both questions
      ...(idRand() < 0.2
        ? { gender: null, ethnicity: null }
        : { gender: idPick(SEED_GENDERS), ethnicity: idPick(SEED_ETHNICITIES) }),
    });
    const spec = SPECS[arch];

    for (let w = 1; w <= SEED_WEEKS; w++) {
      // Demo hook: the star intern hasn't checked in for the current week yet,
      // so the live Slack check-in on stage lands as their week-8 entry.
      if (arch === "star_at_risk" && w === SEED_WEEKS) continue;
      if (rand() < spec.miss(w)) continue;

      const r = {} as Record<SelfDimension, number>;
      const r5 = {} as Record<SelfDimension, number>;
      for (const d of Object.keys(spec.base) as SelfDimension[]) {
        const drift = (spec.drift[d] ?? 0) * Math.max(0, w - spec.from);
        // Archetypes are tuned on a 1–5 feel; stored ratings use the 1–10 check-in scale.
        r5[d] = clamp(spec.base[d] + drift + (rand() - 0.5) * 0.9, 1, 5);
        r[d] = Math.round(1 + ((r5[d] - 1) * 9) / 4);
      }
      const avg = (r5.role_satisfaction + r5.rbc_satisfaction + r5.learning_growth + r5.voice_valued) / 4;
      const leaving = spec.leaveFrom !== undefined && w >= spec.leaveFrom;
      const pool = BAD[arch];
      const line: Line = leaving
        ? pool.find((l) => l.leave) ?? pick(pool)
        : avg >= 4 ? pick(GOOD) : avg >= 3.2 ? pick(OK) : pick(pool.filter((l) => !l.leave));
      const sentiment = clamp((avg - 3) / 2 + (rand() - 0.5) * 0.2, -1, 1);
      const day = COHORT_START + ((w - 1) * 7 + 3 + Math.floor(rand() * 2)) * 86400000;

      checkins.push({
        id: `c-${id}-w${w}`,
        user_id: id,
        week_number: w,
        ...r,
        feedback_text: line.text,
        sentiment_score: Math.round(sentiment * 100) / 100,
        sentiment_label: sentimentLabel(sentiment),
        tags: line.tags,
        summary: line.summary,
        leave_signal: !!line.leave,
        evidence: line.dim ? { [line.dim]: line.text } : {},
        submitted_at: new Date(day + 15 * 3600000).toISOString(),
      });
    }

    for (let w = 2; w <= SEED_WEEKS; w += 2) {
      const drift = (spec.perfDrift ?? 0) * Math.max(0, w - spec.from);
      reviews.push({
        id: `p-${id}-w${w}`,
        user_id: id,
        week_number: w,
        rating: Math.round(clamp(spec.perf + drift + (rand() - 0.5) * 0.6, 1, 5)),
        note: null,
        reviewer: MANAGERS[department],
        created_at: new Date(COHORT_START + ((w - 1) * 7 + 4) * 86400000).toISOString(),
      });
    }
  });

  const reports: Report[] = [
    {
      id: "r1", user_id: null, anonymous: true, category: "Workload", urgency: "High", status: "Open",
      description: "Interns on our desk are regularly asked to stay past 10pm with no notice.",
      created_at: new Date(COHORT_START + 51 * 86400000).toISOString(),
    },
    {
      id: "r2", user_id: "u08", anonymous: false, category: "Team Conflict", urgency: "Medium", status: "Open",
      description: "A senior team member repeatedly talks over me and dismisses my suggestions in meetings.",
      created_at: new Date(COHORT_START + 44 * 86400000).toISOString(),
    },
    {
      id: "r3", user_id: null, anonymous: true, category: "Other", urgency: "Low", status: "Reviewed",
      description: "Onboarding laptop took two weeks to arrive.",
      created_at: new Date(COHORT_START + 9 * 86400000).toISOString(),
    },
  ];

  return { users, checkins, reviews, reports, actions: [] };
}
