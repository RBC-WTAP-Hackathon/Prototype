// Shared types for the HR dashboard. Mirrors supabase/schema.sql.

/** Radar dimensions. The first four are self-reported in the weekly Slack check-in (1–10). */
export type SelfDimension =
  | "role_satisfaction"
  | "rbc_satisfaction"
  | "learning_growth"
  | "voice_valued"
  | "participation"; // taking part in RBC events (socials, ERGs, info sessions, volunteering)

/** Performance comes from the manager; everything else is self-reported in the check-in. */
export type DimensionKey = SelfDimension | "performance";

export type RiskLevel = "Low" | "Watch" | "High";
export type SentimentLabel = "Positive" | "Neutral" | "At-Risk";
export type Urgency = "Low" | "Medium" | "High";
export type ReportCategory = "Harassment" | "Workload" | "Team Conflict" | "Other";

export interface User {
  id: string;
  slack_id: string;
  name: string;
  role: string;
  department: string;
  cohort: string;
  manager_name: string;
  /**
   * Optional self-identification from Slack /self-id. Server-side only: used for
   * aggregate inclusion insights, never sent to the browser or shown per person.
   */
  gender?: string | null;
  ethnicity?: string | null;
}

/** User as sent to the browser — demographic self-ID stripped. */
export type PublicUser = Omit<User, "gender" | "ethnicity">;

export interface Checkin {
  id: string;
  user_id: string;
  week_number: number;
  role_satisfaction: number;
  rbc_satisfaction: number;
  learning_growth: number;
  voice_valued: number;
  /** Self-reported participation in RBC events, 1–10. May be null on rows from before it was asked. */
  participation: number;
  feedback_text: string;
  sentiment_score: number; // -1..1
  sentiment_label: SentimentLabel;
  tags: string[];
  summary: string;
  leave_signal: boolean;
  evidence: Partial<Record<DimensionKey, string>>; // dimension -> supporting quote
  submitted_at: string;
}

export interface PerformanceReview {
  id: string;
  user_id: string;
  week_number: number;
  rating: number; // 1..5, from manager
  note: string | null;
  reviewer: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string | null; // null when anonymous — never stored
  anonymous: boolean;
  category: ReportCategory;
  description: string;
  urgency: Urgency;
  status: "Open" | "Reviewed";
  created_at: string;
}

/** "Give other feedback" and "Request an intro" submissions from the Slack bot menu. */
export interface InboxItem {
  id: string;
  kind: "feedback" | "intro";
  user_id: string | null; // null when feedback was sent anonymously
  anonymous: boolean;
  /** Feedback: what it's about. Intro: who they'd like to meet. */
  topic: string;
  /** Feedback: the message. Intro: what they'd like to talk about (may be empty). */
  text: string;
  status: "New" | "Done";
  created_at: string;
}

export interface Action {
  id: string;
  user_id: string;
  type: "nudge" | "one_on_one";
  note: string | null;
  created_at: string;
}

export interface Snapshot {
  users: User[];
  checkins: Checkin[];
  reviews: PerformanceReview[];
  reports: Report[];
  actions: Action[];
  inbox: InboxItem[];
}

// ---------- View models returned by /api/dashboard ----------

export type Scores = Record<DimensionKey, number>; // 0..100

export interface InternView {
  user: PublicUser;
  radar: Scores;
  radarPrev: Scores | null; // three weeks earlier
  risk: { score: number; level: RiskLevel; reasons: string[] };
  /** Risk as of the previous weekly summary (last week); null if they had no data then. */
  riskPrev: { score: number; level: RiskLevel } | null;
  topTalentAtRisk: boolean;
  lowest: DimensionKey;
  streak: number;
  lastCheckinWeek: number | null;
  submittedThisWeek: boolean;
  weekly: { week: number; sentiment: number | null }[];
  checkins: Checkin[]; // newest first
  latestSummary: string | null;
  evidence: Partial<Record<DimensionKey, string>>;
  actions: Action[];
}

/** An intern whose status worsened significantly since the last weekly summary. */
export interface StatusAlert {
  id: string; // stable per user + week, used to track read state
  userId: string;
  name: string;
  department: string;
  fromLevel: RiskLevel;
  toLevel: RiskLevel;
  fromScore: number;
  toScore: number;
  reasons: string[];
}

export type GroupingKey = "department" | "gender" | "ethnicity";

/** Aggregate stats for one group (e.g. one department). Only produced for groups ≥ the minimum size. */
export interface GroupStat {
  name: string;
  n: number;
  scores: Scores; // mean radar now
  change: Scores | null; // mean change vs 3 weeks ago (points, 0–100 scale)
  atRiskPct: number; // % at Watch or High
  avgRisk: number;
  namedReports: number; // non-anonymous reports from this group (anonymous ones can't be attributed)
}

export interface Grouping {
  key: GroupingKey;
  label: string;
  groups: GroupStat[];
  /** People not shown: in groups under the minimum size, or who preferred not to say / didn't self-identify. */
  hidden: number;
}

export interface InclusionInsight {
  grouping: GroupingKey;
  group: string;
  n: number;
  kind: "gap" | "decline" | "risk";
  dimension: DimensionKey | null;
  /** Points vs rest of cohort (gap), points over 3 weeks (decline), or % at risk (risk). */
  value: number;
  text: string;
}

export interface InclusionData {
  minGroupSize: number;
  selfIdPct: number; // % of interns who shared gender or ethnicity
  groupings: Grouping[];
  insights: InclusionInsight[];
}

export interface DashboardData {
  currentWeek: number;
  kpis: {
    avgSentiment: number;
    avgSentimentDelta: number;
    participationPct: number;
    participationDelta: number;
    highRisk: number;
    topTalentAtRisk: number;
    openReports: number;
    urgentReports: number;
  };
  trend: { week: number; sentiment: number }[];
  topics: { topic: string; count: number }[];
  cohortRadar: Scores;
  heatmap: { department: string; n: number; scores: Scores | null }[];
  interns: InternView[];
  alerts: StatusAlert[];
  inclusion: InclusionData;
  reports: Report[];
  /** Newest first, open items before done ones; `from` is the sender's name (null if anonymous). */
  inbox: (InboxItem & { from: string | null })[];
  source: "supabase" | "memory";
  llm: string;
}
