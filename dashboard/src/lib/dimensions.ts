import type { DimensionKey, SelfDimension } from "./types";

/** Self-reported check-in ratings run 1–CHECKIN_SCALE_MAX. (Manager performance ratings stay 1–5.) */
export const CHECKIN_SCALE_MAX = 10;

export const SELF_DIMENSIONS: SelfDimension[] = [
  "role_satisfaction",
  "rbc_satisfaction",
  "learning_growth",
  "voice_valued",
  "participation",
];

/** Radar axis order (clockwise from top). */
export const DIMENSIONS: DimensionKey[] = [
  "role_satisfaction",
  "rbc_satisfaction",
  "learning_growth",
  "voice_valued",
  "participation",
  "performance",
];

export const DIMENSION_META: Record<
  DimensionKey,
  { label: string; short: string; source: string; suggestion: string }
> = {
  role_satisfaction: {
    label: "Role satisfaction",
    short: "Role",
    source: "Self-reported weekly",
    suggestion: "Check scope and workload in the next 1:1 — is the work matching what they expected?",
  },
  rbc_satisfaction: {
    label: "Satisfaction with RBC",
    short: "RBC",
    source: "Self-reported weekly",
    suggestion: "Connect them with an intern alum or ERG to show the broader RBC experience.",
  },
  learning_growth: {
    label: "Learning & growth",
    short: "Growth",
    source: "Self-reported weekly",
    suggestion: "Pair them with a stretch task or a shadowing session outside their team.",
  },
  voice_valued: {
    label: "Ideas & opinions valued",
    short: "Voice",
    source: "Self-reported weekly",
    suggestion: "Invite them to present an idea at the next team sync.",
  },
  participation: {
    label: "Participation in RBC events",
    short: "Participation",
    source: "Self-reported weekly",
    suggestion: "Invite them to an upcoming intern social, ERG or info session — and ask what would make events easier to join.",
  },
  performance: {
    label: "Performance",
    short: "Performance",
    source: "Manager rating",
    suggestion: "Share recent manager feedback so they know where they stand.",
  },
};

export const TOPICS = [
  "Mentorship",
  "Onboarding",
  "Team Dynamics",
  "Career Dev",
  "Workload",
  "Recognition",
] as const;
