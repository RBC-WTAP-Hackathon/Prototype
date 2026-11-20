// Shared types for the HR dashboard. Mirrors supabase/schema.sql.

/** Radar dimensions. The first four are self-reported in the weekly Slack check-in (1–5). */
export type SelfDimension =
  | "role_satisfaction"
  | "rbc_satisfaction"
  | "learning_growth"
  | "voice_valued";

/** Participation is computed from check-in behaviour; performance comes from the manager. */
export type DimensionKey = SelfDimension | "participation" | "performance";

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
}

export interface Checkin {
  id: string;
  user_id: string;
  week_number: number;
  role_satisfaction: number;
  rbc_satisfaction: number;
  learning_growth: number;
  voice_valued: number;
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
}

// ---------- View models returned by /api/dashboard ----------

export type Scores = Record<DimensionKey, number>; // 0..100

export interface InternView {
  user: User;
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
  reports: Report[];
  source: "supabase" | "memory";
  llm: string;
}
