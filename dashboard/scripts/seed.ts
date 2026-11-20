// Seeds Supabase with the demo dataset. Usage: npm run seed  (reads .env.local)
// To import real data instead, replace generateSeed() with a CSV parser that returns the same Snapshot shape.
import { createClient } from "@supabase/supabase-js";
import { generateSeed } from "../src/lib/seed-data";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const snap = generateSeed();

async function main() {
  // children first, then parents
  for (const t of ["actions", "reports", "performance_reviews", "checkins", "users"]) {
    const { error } = await db.from(t).delete().neq("id", "");
    if (error) throw new Error(`${t}: ${error.message}`);
  }
  const steps: [string, object[]][] = [
    ["users", snap.users],
    ["checkins", snap.checkins],
    ["performance_reviews", snap.reviews],
    ["reports", snap.reports],
  ];
  for (const [table, rows] of steps) {
    const { error } = await db.from(table).insert(rows);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`✓ ${table}: ${rows.length}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
