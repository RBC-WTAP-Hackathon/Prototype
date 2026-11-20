"use client";
import { useEffect, useState } from "react";
import { CalendarCheck, ExternalLink, HeartHandshake, Lightbulb, Send, X } from "lucide-react";
import { DIMENSION_META } from "@/lib/dimensions";
import type { InternView, Scores } from "@/lib/types";
import { DimensionRadar, SentimentTrend, type RadarSeries } from "./charts";
import { Button, RiskBadge, TopTalentBadge } from "./ui";

const SLACK_TEAM = process.env.NEXT_PUBLIC_SLACK_TEAM_ID;

export function ProfileDrawer({
  intern,
  cohort,
  onClose,
  onChanged,
}: {
  intern: InternView | null;
  cohort: Scores;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!intern) return null;
  const { user } = intern;
  const first = user.name.split(" ")[0];

  const series: RadarSeries[] = [
    { key: "now", label: first, scores: intern.radar, style: "primary" },
    { key: "cohort", label: "Cohort avg", scores: cohort, style: "baseline" },
    ...(intern.radarPrev
      ? [{ key: "prev", label: "3 weeks ago", scores: intern.radarPrev, style: "ghost" as const }]
      : []),
  ];

  async function post(path: string, body: object, label: string, done: string) {
    setBusy(label);
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      setToast(json.delivered === false ? `${done} (simulated — demo user)` : done);
      onChanged();
    } finally {
      setBusy(null);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`${user.name} profile`}>
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close" />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-line bg-[#f3f7f8] shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-line bg-surface px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-accent-ink">
                <HeartHandshake size={12} aria-hidden /> Support view
              </p>
              <h2 className="text-2xl font-medium text-heading">{user.name}</h2>
              <p className="text-xs text-muted">
                {user.role} · {user.department} · Manager: {user.manager_name}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose} aria-label="Close profile">
              <X size={18} />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RiskBadge level={intern.risk.level} score={intern.risk.score} />
            {intern.topTalentAtRisk && <TopTalentBadge />}
            <span className="text-xs text-muted">
              {intern.streak}-week streak{!intern.submittedThisWeek && " · this week pending"}
            </span>
          </div>
          {intern.risk.reasons.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {intern.risk.reasons.map((r) => (
                <li key={r} className="rounded bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
                  {r}
                </li>
              ))}
            </ul>
          )}
        </header>

        <div className="space-y-4 p-5">
          <section className="rounded-xl border border-card-border bg-surface p-5">
            <h3 className="text-lg font-medium text-heading">Experience radar</h3>
            <p className="text-xs text-muted">Scores out of 100 · hover an area for detail and quotes</p>
            <DimensionRadar series={series} highlight={intern.lowest} evidence={intern.evidence} height={320} />
            <div className="mt-2 flex gap-2 rounded-lg bg-rbc-yellow/15 p-3 text-sm">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <div>
                <span className="font-medium text-heading">Lowest: {DIMENSION_META[intern.lowest].label}.</span>{" "}
                <span className="text-ink-2">{DIMENSION_META[intern.lowest].suggestion}</span>
              </div>
            </div>
          </section>

          {intern.latestSummary && (
            <section className="rounded-xl border border-card-border bg-surface p-5">
              <h3 className="text-lg font-medium text-heading">Latest AI summary</h3>
              <p className="mt-1 text-sm text-ink-2">{intern.latestSummary}</p>
            </section>
          )}

          <section className="rounded-xl border border-card-border bg-surface p-5">
            <h3 className="text-lg font-medium text-heading">Sentiment by week</h3>
            <SentimentTrend data={intern.weekly} height={180} />
          </section>

          <section className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={!!busy}
              onClick={() => post("/api/nudge", { user_id: user.id }, "nudge", "Nudge sent in Slack")}
            >
              <Send size={14} /> {busy === "nudge" ? "Sending…" : "Send supportive nudge"}
            </Button>
            <Button
              disabled={!!busy}
              onClick={() =>
                post("/api/actions", { user_id: user.id, type: "one_on_one", note: "1:1 scheduled" }, "1on1", "1:1 logged")
              }
            >
              <CalendarCheck size={14} /> Mark 1:1 scheduled
            </Button>
            {SLACK_TEAM && (
              <a
                className="inline-flex items-center gap-1.5 rounded-sm border border-surface-2 bg-surface-2 px-3 py-2 font-ui text-sm text-rbc-navy hover:bg-[#d5e0e5]"
                href={`https://app.slack.com/client/${SLACK_TEAM}/${user.slack_id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} /> Open DM in Slack
              </a>
            )}
          </section>
          {toast && <p className="text-sm text-good-ink">{toast}</p>}

          {intern.actions.length > 0 && (
            <section className="rounded-xl border border-card-border bg-surface p-5">
              <h3 className="mb-2 text-lg font-medium text-heading">HR follow-ups</h3>
              <ul className="space-y-1 text-sm text-ink-2">
                {intern.actions.map((a) => (
                  <li key={a.id}>
                    {a.type === "nudge" ? "Nudge" : "1:1"} · {a.note} ·{" "}
                    <span className="text-muted">{new Date(a.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-card-border bg-surface p-5">
            <h3 className="mb-2 text-lg font-medium text-heading">Check-in log</h3>
            <ul className="divide-y divide-line">
              {intern.checkins.map((c) => (
                <li key={c.id} className="py-2.5">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      Week {c.week_number} · {c.sentiment_label}
                      {c.leave_signal && <span className="ml-1 font-medium text-critical-ink">· leave signal</span>}
                    </span>
                    <span>{c.tags.join(", ")}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink">{c.feedback_text || <em className="text-muted">No comment</em>}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Role {c.role_satisfaction} · RBC {c.rbc_satisfaction} · Growth {c.learning_growth} · Voice{" "}
                    {c.voice_valued}
                    {c.participation != null && <> · Participation {c.participation}</>} (of 10)
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
