// Data access. Uses Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
// otherwise an in-memory store pre-loaded with the demo seed (resets on server restart).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Action, Checkin, PerformanceReview, Report, Snapshot, User } from "./types";
import { generateSeed } from "./seed-data";

export interface Store {
  kind: "supabase" | "memory";
  snapshot(): Promise<Snapshot>;
  findUserBySlackId(slackId: string): Promise<Snapshot["users"][number] | null>;
  insertUser(u: Omit<User, "id">): Promise<User>;
  updateUserSelfId(id: string, selfId: Pick<User, "gender" | "ethnicity">): Promise<void>;
  insertCheckin(c: Omit<Checkin, "id">): Promise<Checkin>;
  insertReport(r: Omit<Report, "id">): Promise<Report>;
  insertReview(r: Omit<PerformanceReview, "id">): Promise<PerformanceReview>;
  insertAction(a: Omit<Action, "id">): Promise<Action>;
  updateReportStatus(id: string, status: Report["status"]): Promise<void>;
}

const uid = () => crypto.randomUUID();

function memoryStore(): Store {
  const g = globalThis as unknown as { __internPulse?: Snapshot };
  g.__internPulse ??= generateSeed();
  const db = g.__internPulse;
  return {
    kind: "memory",
    async snapshot() {
      return structuredClone(db);
    },
    async findUserBySlackId(slackId) {
      return db.users.find((u) => u.slack_id === slackId) ?? null;
    },
    async insertUser(u) {
      const row = { ...u, id: uid() };
      db.users.push(row);
      return row;
    },
    async updateUserSelfId(id, selfId) {
      const u = db.users.find((x) => x.id === id);
      if (u) Object.assign(u, selfId);
    },
    async insertCheckin(c) {
      const row = { ...c, id: uid() };
      db.checkins.push(row);
      return row;
    },
    async insertReport(r) {
      const row = { ...r, id: uid() };
      db.reports.push(row);
      return row;
    },
    async insertReview(r) {
      const row = { ...r, id: uid() };
      db.reviews.push(row);
      return row;
    },
    async insertAction(a) {
      const row = { ...a, id: uid() };
      db.actions.push(row);
      return row;
    },
    async updateReportStatus(id, status) {
      const r = db.reports.find((x) => x.id === id);
      if (r) r.status = status;
    },
  };
}

function supabaseStore(client: SupabaseClient): Store {
  const must = <T>({ data, error }: { data: T | null; error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
    return data as T;
  };
  const insert = async <T>(table: string, row: object) =>
    must<T>(await client.from(table).insert(row).select().single());
  return {
    kind: "supabase",
    async snapshot() {
      const [users, checkins, reviews, reports, actions] = await Promise.all([
        client.from("users").select("*"),
        client.from("checkins").select("*"),
        client.from("performance_reviews").select("*"),
        client.from("reports").select("*"),
        client.from("actions").select("*"),
      ]);
      return {
        users: must(users),
        checkins: must(checkins),
        reviews: must(reviews),
        reports: must(reports),
        actions: must(actions),
      };
    },
    async findUserBySlackId(slackId) {
      return must(await client.from("users").select("*").eq("slack_id", slackId).maybeSingle());
    },
    insertUser: (u) => insert<User>("users", u),
    async updateUserSelfId(id, selfId) {
      must(await client.from("users").update(selfId).eq("id", id).select());
    },
    insertCheckin: (c) => insert<Checkin>("checkins", c),
    insertReport: (r) => insert<Report>("reports", r),
    insertReview: (r) => insert<PerformanceReview>("performance_reviews", r),
    insertAction: (a) => insert<Action>("actions", a),
    async updateReportStatus(id, status) {
      must(await client.from("reports").update({ status }).eq("id", id).select());
    },
  };
}

let cached: Store | null = null;
export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? supabaseStore(createClient(url, key, { auth: { persistSession: false } })) : memoryStore();
  return cached;
}
