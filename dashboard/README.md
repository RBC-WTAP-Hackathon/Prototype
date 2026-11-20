# InternPulse — HR Dashboard

Next.js + Tailwind + Recharts dashboard for early-talent check-ins collected by the Slack bot.

```bash
npm install
npm run dev          # http://localhost:3000 — runs on in-memory demo data, no keys needed
```

To use Supabase: run `supabase/schema.sql` in the SQL editor, copy `.env.example` → `.env.local`, fill in keys, then `npm run seed`.

## Radar dimensions (0–100)

| Dimension | Source |
|---|---|
| Role satisfaction | Slack `/checkin`, 1–10 |
| Satisfaction with RBC | Slack `/checkin`, 1–10 |
| Learning & growth | Slack `/checkin`, 1–10 |
| Ideas & opinions valued | Slack `/checkin`, 1–10 |
| Participation | Computed: 40% overall check-in rate + 60% last 3 weeks |
| Performance | Manager rating, 1–5 (`/api/performance`) |

Each self-reported score is a recency-weighted average of the last 3 check-ins (50/30/20), mapped 1–10 → 0–100 (manager performance ratings stay 1–5).

**Risk of leaving** = 35% satisfaction (level + 3-week drop) · 25% ideas valued · 25% participation · 15% leave signal from AI.
High ≥ 45, Watch ≥ 22. **Top talent at risk** = performance ≥ 75 and risk not Low.

## Slack bot → dashboard contract

All bot calls send header `x-bot-secret: $BOT_SHARED_SECRET`.

```http
POST /api/checkins
{ "slack_id": "U123", "role_satisfaction": 4, "rbc_satisfaction": 5,
  "learning_growth": 3, "voice_valued": 2, "feedback_text": "…", "week_number": 8 }   # week optional

POST /api/reports
{ "slack_id": "U123" | null, "anonymous": true, "category": "Workload",
  "urgency": "High", "description": "…" }       # anonymous → user_id never stored

POST /api/performance                               # e.g. a /rate-intern command for managers
{ "slack_id": "U123", "rating": 4, "note": "…", "reviewer": "Jordan Ellis" }
```

Categories: `Harassment | Workload | Team Conflict | Other`. Urgency: `Low | Medium | High`.

## Dashboard → Slack

`POST /api/nudge { user_id }` DMs the intern via `SLACK_BOT_TOKEN` (simulated for seeded `U0DEMO…` users).

## Demo script

1. Open the dashboard: Maya Okafor is **Watch** with a *Top talent at risk* badge.
2. Submit a stressed `/checkin` as Maya in Slack (or click **Simulate check-in**: it's pre-filled).
3. Within 3 seconds Maya jumps to **High risk**, her row flashes, and the radar shows Voice and Satisfaction collapsing against the cohort average.
4. Click **Send supportive nudge**, and the DM lands in Slack.
